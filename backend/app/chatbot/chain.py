import os, json
from datetime import datetime
from dotenv import load_dotenv
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda, RunnableMap
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.memory import ConversationBufferMemory
from langchain.memory.chat_message_histories import FileChatMessageHistory
from .sysprompt import prompt
import re
import os



load_dotenv()

current_date = datetime.now().strftime("%d %B %Y")  
model = ChatOpenAI(model="gpt-4o-mini", temperature=0.0)
parser = StrOutputParser()
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

vector_store = Chroma(
    persist_directory=os.path.join(BASE_DIR, "vector_store"),
    embedding_function=embeddings
)
print("Collections:", vector_store._client.list_collections())
print("Doc count:", vector_store._collection.count())
retriever = vector_store.as_retriever(search_type="mmr", search_kwargs={'k': 8})

history_file = "chat_history.json"
chat_history = FileChatMessageHistory(history_file)
memory = ConversationBufferMemory(
    memory_key="chat_history",
    chat_memory=chat_history,
    return_messages=True
)

# -------------------------------------------
# Recency Boost
# -------------------------------------------
def recency_boost(metadata):
    """Gives higher weight to newer documents."""
    date_str = metadata.get("creationdate") or metadata.get("moddate")
    try:
        parsed = date_str.replace("D:", "").split("+")[0] if isinstance(date_str, str) else ""
        parsed_date = datetime.fromisoformat(parsed)
    except Exception:
        parsed_date = datetime(2020, 1, 1)
    days_old = (datetime.now() - parsed_date).days
    return max(0.1, 1 - (days_old / 2000))  # Gradual decay


def weighted_retrieve(query):
    docs = retriever.invoke(query)
    for d in docs:
        score = d.metadata.get("score", 0)
        page_num = d.metadata.get("page", 0)
        try:
            page_num = int(page_num)
        except Exception:
            page_num = 0
        d.metadata["score"] = score + (1 / (page_num + 1)) * 0.05  # small bias toward earlier pages
    docs.sort(key=lambda d: d.metadata.get("score", 0) * recency_boost(d.metadata), reverse=True)
    return docs

KHUAIRPUR_PAT = re.compile(r"\bkhairpur\b|\bszab\b|\bmuetkhp\b|\bmuet-khp\b|\bmuet khp\b|\bshaheed zulfiqar ali bhutto\b", re.IGNORECASE)
JAMSHORO_PAT = re.compile(r"\bjamshoro\b", re.IGNORECASE)

def _collection_get(where, include=("documents", "metadatas")):
    try:
        return vector_store._collection.get(where=where, include=list(include))
    except Exception as e:
        print(f"⚠️ _collection.get failed for where={where}: {e}")
        return None

def _get_page_text(source, page):
    res = _collection_get(where={"$and": [
        {"source": {"$eq": source}},
        {"page": {"$eq": page}}
    ]})
    if not res or not res.get("documents"):
        return ""
    return "\n".join(res["documents"])

def _wants_khairpur(query: str) -> bool:
    q = query.lower()
    return bool(KHUAIRPUR_PAT.search(q))

def _wants_jamshoro(query: str) -> bool:
    q = query.lower()
    return bool(JAMSHORO_PAT.search(q))

def _chunk_mentions_khairpur(doc) -> bool:
    txt = (doc.page_content or "").lower()
    if KHUAIRPUR_PAT.search(txt):
        return True
    md = doc.metadata or {}
    page = md.get("page")
    source = md.get("source")
    try:
        page = int(page) if page is not None else None
    except Exception:
        page = None
    # also scan 2 pages around
    if page is not None and source:
        for delta in range(-2, 3):
            p = page + delta
            if p and p > 0:
                if KHUAIRPUR_PAT.search(_get_page_text(source, p).lower()):
                    return True
    return False

# -------------------------------------------
# Formatting Utilities
# -------------------------------------------
def format_chat_history(messages):
    return "\n".join(f"{msg.type.capitalize()}: {msg.content}" for msg in messages)

def format_docs(docs):
    """Format retrieved docs to include metadata for LLM reasoning."""
    formatted = []
    for doc in docs:
        meta = doc.metadata
        formatted.append(
            f"📄 Source: {meta.get('source', 'Unknown')}\n"
            f"📘 Page: {meta.get('page', 'Unknown')}\n"
            f"🔢 Chunk: {meta.get('chunk', 'Unknown')}\n"
            f"🔖 Section: {meta.get('section', 'Unknown')}\n"
            f"🏫 CampusFlag: {'Khairpur/SZAB' if meta.get('campus_flag') else 'Jamshoro-default'}\n"
            f"🕒 ModDate: {meta.get('moddate', meta.get('creationdate', 'Unknown'))}\n"
            f"🧾 Content:\n{doc.page_content}\n"
            "---------------------------------------------"
        )
    return "\n\n".join(formatted)

# def format_chat_history(messages):
#     return "\n".join(f"{msg.type.capitalize()}: {msg.content}" for msg in messages)

# def format_docs(docs):
#     return "\n\n".join(doc.page_content for doc in docs)

# def dual_retriever_merge(question):
#     docs = retriever.invoke(question)
#     return docs

# -------------------------------------------
# Dual Retriever with neighbor merge (your base) + NEW strict campus filter
# -------------------------------------------
def dual_retriever_merge(question):
    """
    Your flow preserved:
      1) recency-weighted top results
      2) neighbor chunk and page expansion
      3) de-dup by (source, page)

    New:
      A) strict campus filter: default to Jamshoro unless the query asks for Khairpur/SZAB
      B) strong penalty for mismatched campus if filter is bypassed for coverage
    """
    # 1) get base docs with your weighted retrieve
    docs = weighted_retrieve(question)
    merged_docs = []

    # Add base docs first
    for d in docs:
        merged_docs.append(d)

    # 2) neighbor expansion (keep your logic structure, widen range if needed)
    expanded = []
    for doc in list(merged_docs):
        source = doc.metadata.get("source")
        chunk_id = doc.metadata.get("chunk", 0)
        page = doc.metadata.get("page", 0)

        # Add prev/next chunk by id if present
        if isinstance(chunk_id, int):
            for neighbor_chunk in [chunk_id - 2, chunk_id - 1, chunk_id + 1, chunk_id + 2]:
                if neighbor_chunk < 0:
                    continue
                try:
                    results = _collection_get(
                        where={"$and": [
                            {"source": {"$eq": source}},
                            {"chunk": {"$eq": neighbor_chunk}}
                        ]},
                        include=["documents", "metadatas"]
                    )
                    if results and results.get("documents"):
                        for txt, meta in zip(results["documents"], results["metadatas"]):
                            # limit to close pages
                            main_page = doc.metadata.get("page", 0)
                            neigh_page = meta.get("page", 0)
                            try:
                                main_page = int(main_page)
                                neigh_page = int(neigh_page)
                            except Exception:
                                main_page = main_page or 0
                                neigh_page = neigh_page or 0
                            if abs(neigh_page - main_page) <= 2:
                                expanded.append(Document(page_content=txt, metadata=meta))
                except Exception as e:
                    print(f"⚠️ Neighbor retrieval failed for chunk {neighbor_chunk}: {e}")

        # Add neighbor pages up to ±10
        try:
            p = int(page)
        except Exception:
            p = None
        if p is not None and p > 0:
            for delta in range(1, 11):
                for npg in (p - delta, p + delta):
                    if npg <= 0:
                        continue
                    res = _collection_get(
                        where={"$and": [
                            {"source": {"$eq": source}},
                            {"page": {"$eq": npg}}
                        ]},
                        include=["documents", "metadatas"]
                    )
                    if res and res.get("documents"):
                        for txt, meta in zip(res["documents"], res["metadatas"]):
                            expanded.append(Document(page_content=txt, metadata=meta))

    # Merge and de-dup by (source, page)
    all_docs = merged_docs + expanded
    dedup_by_page = {}
    for d in all_docs:
        key = (d.metadata.get("source"), d.metadata.get("page"))
        if key not in dedup_by_page:
            dedup_by_page[key] = d
    merged = list(dedup_by_page.values())

    # NEW: campus intent
    wants_khp = _wants_khairpur(question)
    wants_jam = _wants_jamshoro(question)

    # Tag chunks with campus flag for display and scoring
    for d in merged:
        d.metadata["campus_flag"] = _chunk_mentions_khairpur(d)

    # NEW: strict campus filter
    # Default to Jamshoro when user does not ask for Khairpur/SZAB
    if not wants_khp:
        jam_only = [d for d in merged if not d.metadata.get("campus_flag")]
        if jam_only:
            merged = jam_only  # prefer Jamshoro-only set

    # If everything got filtered out, fall back to the original merged set
    if not merged:
        merged = list(dedup_by_page.values())

 # Stronger final sort: penalize mismatched campus hard when user did not ask for it
    def combined_key(d):
        md = d.metadata or {}
        base = float(md.get("score", 0.0))
        r = recency_boost(md)
        page = md.get("page", 0) or 0
        try:
            page = int(page)
        except Exception:
            page = 0
        page_bias = (1 / (page + 1)) * 0.02
        campus_penalty = 0.0
        if not wants_khp and md.get("campus_flag"):
            campus_penalty = -5.0  # strong penalty so Jamshoro wins by default
        return (base + page_bias + campus_penalty) * r

    merged.sort(key=combined_key, reverse=True)

    return merged

# -------------------------------------------
# Chain Setup
# -------------------------------------------
def format_docs_for_chain(q):
    return format_docs(dual_retriever_merge(q))

parallel_chain = RunnableParallel({
    "context": RunnableLambda(lambda q: format_docs(dual_retriever_merge(q))),
    "question": RunnablePassthrough()
})

parallel_chain = RunnableMap({
    "context": lambda q: format_docs(dual_retriever_merge(q)),
    "question": lambda q: q
})
inject_history = RunnableLambda(lambda inputs: {
    **inputs,
    "chat_history": format_chat_history(memory.chat_memory.messages),
    "current_date": current_date
})

def clean_response(text):
    banned_phrases = [
        "As an AI,", "As a language model,",
        "I don't have opinions", "I cannot form opinions"
    ]
    for phrase in banned_phrases:
        text = text.replace(phrase, "")
    return text.strip().lstrip(",. ")


main_chain = parallel_chain | inject_history | prompt | model | parser

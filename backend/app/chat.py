import json
from datetime import datetime
import serial
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from .models import ChatRequest
from .database import history_collection, users_collection
from .utils import decode_token
from .chatbot.chain import dual_retriever_merge, clean_response
from .chatbot.chain import main_chain, retriever, memory, format_docs, format_chat_history, prompt

from typing import Optional
from fastapi import Query
from fastapi import Form
from fastapi import APIRouter, UploadFile, File, HTTPException
import speech_recognition as sr
from pydub import AudioSegment
import io


router = APIRouter()

@router.post("/speech-to-text")
async def speech_to_text(file: UploadFile = File(...)):
    # Read uploaded audio file
    audio_bytes = await file.read()
    
    # Convert to WAV using pydub
    audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
    wav_io = io.BytesIO()
    audio.export(wav_io, format="wav")
    wav_io.seek(0)

    # Use speech_recognition to transcribe
    r = sr.Recognizer()
    with sr.AudioFile(wav_io) as source:
        audio_data = r.record(source)
        text = r.recognize_google(audio_data)

    return {"text": text}
@router.get("/test-retriever")
async def test_retriever(q: str):
    docs = dual_retriever_merge(q)
    return {
        "query": q,
        "retrieved_docs": [d.page_content[:200] for d in docs]  # first 200 chars
    }

def get_current_user(token: str):
    email = decode_token(token)
    return users_collection.find_one({"email": email})

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    user = get_current_user(req.token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")

    user_input = req.message

    # preview retrieved docs for UI
    retrieved_docs = [doc.page_content[:200] for doc in retriever.invoke(user_input)]

    raw_output = main_chain.invoke(user_input)
    try:
        result_obj = json.loads(raw_output) if isinstance(raw_output, str) else raw_output
    except json.JSONDecodeError:
        result_obj = {"answer": raw_output}

    answer = clean_response(result_obj.get("answer", raw_output))
    if len(answer)<210:
        clean_answer = "".join(answer.split())
    else:
        clean_answer="".join(answer.split())[:198]


    # save memory and DB
    memory.chat_memory.add_user_message(user_input)
    memory.chat_memory.add_ai_message(answer)
    history_collection.insert_many([
        {"user": user["email"], "role": "user", "message": user_input, "timestamp": datetime.now()},
        {"user": user["email"], "role": "assistant", "message": answer, "timestamp": datetime.now()},
    ])

    try:
        esp32 = serial.Serial("COM3", 921600, timeout=1)
        time.sleep(2)  # allow connection to stabilize

        # Send message
        esp32.write((clean_answer + "\n").encode("utf-8"))
        print(f"📤 Sent to ESP32: {clean_answer}")

        # --- Wait for ESP32 to confirm playback start ---
        print("📡 Waiting for ESP32 to start playback...")
        start_time = time.time()
        esp32_output = ""
        playback_started = False

        while time.time() - start_time < 8:  # wait max 8 seconds
            if esp32.in_waiting > 0:
                line = esp32.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    esp32_output += line + "\n"
                    print("🔊 ESP32:", line)
                    if "[STATUS] Playback started successfully." in line:
                        playback_started = True
                        break

        if playback_started:
            print("✅ Playback confirmed by ESP32.")
        else:
            print("⚠️ Timeout: ESP32 did not confirm playback start.")

        esp32.close()
        print("🔌 Serial port closed safely.")

    except Exception as e:
        print("⚠️ Could not send to ESP32:", e)

    return {"answer": answer}
    # return {"answer": answer, "retrieved_docs": retrieved_docs}


@router.get("/history")
async def get_history(token: str):
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    chats = list(history_collection.find({"user": user["email"]}).sort("timestamp", -1))
    return JSONResponse(content=[{
        "role": c["role"], "message": c["message"], "timestamp": str(c["timestamp"])
    } for c in chats])

@router.get("/me")
async def get_me(token: str = Query(...)):
    """Return the current user's basic profile."""
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    # do not return password hash
    return {"email": user["email"], "created_at": str(user.get("created_at", ""))}

@router.get("/history")
async def get_history(
    token: str,
    limit: int = 200,
    before: Optional[str] = None,  # ISO timestamp for pagination, optional
):
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")

    query = {"user": user["email"]}
    if before:
        try:
            dt = datetime.fromisoformat(before)
            query["timestamp"] = {"$lt": dt}
        except Exception:
            pass

    cursor = history_collection.find(query).sort("timestamp", -1).limit(int(limit))
    chats = list(cursor)
    return [
        {
            "role": c["role"],
            "message": c["message"],
            "timestamp": c["timestamp"].isoformat(),
        }
        for c in chats
    ]

@router.delete("/history/clear")
async def clear_history(token: str):
    user = get_current_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    result = history_collection.delete_many({"user": user["email"]})
    return {"ok": True, "deleted": result.deleted_count}

@router.get("/sessions")
def get_sessions(token: str):
    user = get_current_user(token)
    sessions = db.sessions.find({"user": user["email"]}, {"messages": 0})
    return list(sessions)

@router.get("/session/{session_id}")
def get_session(session_id: str, token: str):
    user = get_current_user(token)
    session = db.sessions.find_one({"_id": ObjectId(session_id), "user": user["email"]})
    return session

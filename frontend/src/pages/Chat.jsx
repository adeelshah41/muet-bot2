import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Header from "../components/Header";

import { Plus, MessageSquare } from "lucide-react"; // for icons

const API = "http://localhost:8000";

export default function Chat() {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]); // list of previous chats
  const [activeConv, setActiveConv] = useState(null); // selected conversation
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // useEffect(() => {
  //   const t = localStorage.getItem("access_token");
  //   if (!t) {
  //     window.location.href = "/";
  //     return;
  //   }
  //   setToken(t);

  //   axios.get(`${API}/me`, { params: { token: t } })
  //     .then((r) => setEmail(r.data?.email || ""))
  //     .catch(() => {});

  //   // Retrieve chat history from localStorage after login
  //   const storedChats = localStorage.getItem('conversations');
  //   if (storedChats) {
  //     setConversations(JSON.parse(storedChats));
  //   }
  // }, []);

  useEffect(() => {
  const t = localStorage.getItem("access_token");
  if (!t) return window.location.href = "/";
  setToken(t);

  axios.get(`${API}/me`, { params: { token: t } })
    .then((r) => setEmail(r.data?.email || "" ))
    .catch(() => {});
    
  fetchConversations();
}, []);

  // Modify fetchConversations to accept a token parameter
  const fetchConversations = async (t) => {
    try {
      const res = await axios.get(`${API}/history`, { params: { token: t, limit: 50 } });
      const grouped = res.data.reduce((acc, m, idx) => {
        const convId = Math.floor(idx / 10);
        if (!acc[convId]) acc[convId] = [];
        acc[convId].push(m);
        return acc;
      }, {});
      setConversations(Object.entries(grouped));
      if (Object.keys(grouped).length > 0) {
  loadConversation(Number(Object.keys(grouped)[0]));
}
      localStorage.setItem('conversations', JSON.stringify(Object.entries(grouped)));
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };


  const loadConversation = (convId) => {
    const msgs = conversations.find(([id]) => Number(id) === convId);
    if (msgs) {
      const formatted = msgs[1].map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.message,
        timestamp: m.timestamp,
      }));
      setMessages(formatted);
      setActiveConv(convId);
    }
  };

  const newConversation = () => {
    setMessages([]);
    setActiveConv(null);
  };

 const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    const res = await fetch("http://localhost:8000/speech-to-text", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setInput(data.text); // Fill input with recognized text
    
    // Automatically send the message after transcription
    send(data.text); // Pass the transcribed text directly to send
  };

  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 10000); // record 5s
};


  const send = async (msg) => {
  const messageToSend = msg || input; // use msg if provided (voice), otherwise use input state
  if (!messageToSend.trim()) return;

  const userMsg = { role: "user", content: messageToSend, timestamp: new Date().toISOString() };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");

  try {
    const res = await axios.post(`${API}/chat`, { message: messageToSend, token });
    const botMsg = {
      role: "assistant",
      content: res.data.answer,
      retrieved_docs: res.data.retrieved_docs || [],
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, botMsg]);

    // Update the conversation history in localStorage
    const updatedConversations = [...conversations, { [new Date().toISOString()]: [userMsg, botMsg] }];
    setConversations((prev) =>
      prev.map(([id, msgs]) =>
        id === activeConv ? [id, [...msgs, userMsg, botMsg]] : [id, msgs]
      )
    );
    localStorage.setItem("conversations", JSON.stringify(updatedConversations));
  } catch {
    setMessages((prev) => [...prev, { role: "system", content: "Error while chatting" }]);
  }
};

  const onLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("conversations"); // Remove chat history when logging out
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen bg-[#f9f9f9]">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={newConversation}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg bg-[#635BFF] text-white font-medium hover:bg-[#534ae6]"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(([id, msgs]) => (
            <button
              key={id}
              onClick={() => loadConversation(Number(id))}
              className={`flex items-center gap-2 px-3 py-2 w-full rounded-lg text-left hover:bg-gray-100 ${activeConv === Number(id) ? "bg-gray-200" : ""
                }`}
            >
              <MessageSquare size={16} className="text-gray-600" />
              <span className="truncate text-sm">
                {msgs.find((m) => m.role === "user")?.message.slice(0, 30) || "Conversation"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex flex-col flex-1">
        <Header onLogout={onLogout} email={email} />

        {/* Chat container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div ref={listRef} className="mx-auto w-full max-w-3xl space-y-6">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col">
                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm ${m.role === "user"
                    ? "bg-[#635BFF] text-white self-end max-w-[80%]"
                    : m.role === "assistant"
                      ? "bg-white text-gray-900 border border-gray-200 self-start max-w-[80%]"
                      : "bg-gray-200 text-gray-700 text-sm italic self-center"
                    }`}
                >
                  {m.content}
                  {m.retrieved_docs && m.retrieved_docs.length > 0 && (
                    <div className="mt-2 text-xs bg-gray-100 rounded p-2">
                      <div className="font-semibold text-gray-600">Retrieved snippets:</div>
                      <ul className="list-disc ml-4 space-y-1">
                        {m.retrieved_docs.map((d, idx) => (
                          <li key={idx} className="opacity-80">{d}...</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {m.timestamp && (
                  <div className="text-[11px] text-gray-500 mt-1 self-end">
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            
            <input
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }}
  placeholder="Ask about Mehran University..."
  className="flex-1 p-3 rounded bg-[#1a1a3d] text-white"
  disabled={recording} // Disable input while recording
/>


            {/* Microphone button */}
            <button
              onClick={startRecording}
              className="ml-2 bg-[#FF5C5C] px-4 py-3 rounded-xl text-white font-medium hover:bg-[#ff4343]"
              title="Speak"
            >
              🎤
            </button>

             <button
    type="button"             // prevent default form submit
    onClick={send}
    className="ml-2 bg-[#635BFF] px-5 py-3 rounded-xl hover:bg-[#534ae6] text-white font-medium"
  >
    Send
  </button>
          </div>

        </div>
      </div>
    </div>
  );
}

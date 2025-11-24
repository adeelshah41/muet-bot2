import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Header from "../components/Header";
import { API_BASE_URL } from "../api";
import "../components/Chat/ChatAnimations.css";

import { Plus, MessageSquare, Loader2, Mic, MicOff, Send } from "lucide-react"; // for icons

export default function Chat({ token: tokenProp }) {
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [token, setToken] = useState(tokenProp || "");
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [conversations, setConversations] = useState([]); // list of previous chats
  const [activeConv, setActiveConv] = useState(null); // selected conversation
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
  const t = tokenProp || localStorage.getItem("token");
  if (!t) return window.location.href = "/";
  setToken(t);

  axios.get(`${API_BASE_URL}/me`, { params: { token: t } })
    .then((r) => setEmail(r.data?.email || "" ))
    .catch(() => {});
    
  fetchConversations(t);
}, [tokenProp]);

  // Modify fetchConversations to accept a token parameter
  const fetchConversations = async (t) => {
    setIsLoadingConversations(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/history`, { params: { token: t, limit: 50 } });
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
    } finally {
      setIsLoadingConversations(false);
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
  // Check if the MediaDevices API is available
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Microphone access is not available. Please use HTTPS or grant microphone permissions.");
    return;
  }

  // Check if already recording
  if (recording) {
    return;
  }

  try {
    setRecording(true);
    setRecordingTime(0);
    
    // Start recording timer
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];

    // Store references for cleanup
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = chunks;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Clear recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
      
      if (chunks.length === 0) {
        setRecording(false);
        setRecordingTime(0);
        return;
      }

      try {
        setIsProcessingAudio(true);
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        const res = await fetch(`${API_BASE_URL}/speech-to-text`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) {
          throw new Error("Speech-to-text request failed");
        }
        
        const data = await res.json();
        setInput(data.text || ""); // Fill input with recognized text
        
        // Automatically send the message after transcription if text exists
        if (data.text && data.text.trim()) {
          send(data.text);
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        setMessages((prev) => [...prev, { 
          role: "system", 
          content: "Error processing voice recording. Please try typing your message." 
        }]);
      } finally {
        setRecording(false);
        setRecordingTime(0);
        setIsProcessingAudio(false);
      }
    };

    mediaRecorder.onerror = (error) => {
      console.error("MediaRecorder error:", error);
      stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      alert("Error recording audio. Please try again.");
    };

      mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    }, 10000); // record for 10 seconds
  } catch (error) {
    console.error("Error accessing microphone:", error);
    setRecording(false);
    
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      alert("Microphone permission denied. Please allow microphone access in your browser settings.");
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      alert("No microphone found. Please connect a microphone and try again.");
    } else if (error.name === "NotSupportedError" || error.name === "ConstraintNotSatisfiedError") {
      alert("Microphone not supported or constraints not satisfied.");
    } else {
      alert("Unable to access microphone. Please ensure you're using HTTPS or localhost.");
    }
  }
};

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecording(false);
    setRecordingTime(0);
  };
  
  // Format recording time (seconds to MM:SS)
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const send = async (msg) => {
  const messageToSend = msg || input; // use msg if provided (voice), otherwise use input state
  if (!messageToSend.trim() || isLoading) return;

  const userMsg = { role: "user", content: messageToSend, timestamp: new Date().toISOString() };
  setMessages((prev) => [...prev, userMsg]);
  setInput("");
  setIsLoading(true);

  // Add a loading message
  const loadingMsg = { role: "loading", content: "Thinking...", timestamp: new Date().toISOString() };
  setMessages((prev) => [...prev, loadingMsg]);

  try {
    const res = await axios.post(`${API_BASE_URL}/chat`, { message: messageToSend, token });
    
    // Remove loading message and add bot response
    setMessages((prev) => prev.filter(m => m.role !== "loading"));
    
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
  } catch (error) {
    // Remove loading message
    setMessages((prev) => prev.filter(m => m.role !== "loading"));
    setMessages((prev) => [...prev, { 
      role: "system", 
      content: "Error while chatting. Please try again." 
    }]);
    console.error("Chat error:", error);
  } finally {
    setIsLoading(false);
  }
};

  const onLogout = () => {
    localStorage.removeItem("token");
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
          {isLoadingConversations ? (
            // Loading skeletons
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 w-full rounded-lg">
                <div className="w-4 h-4 bg-gray-200 rounded shimmer"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded shimmer"></div>
              </div>
            ))
          ) : conversations.length > 0 ? (
            conversations.map(([id, msgs]) => (
              <button
                key={id}
                onClick={() => loadConversation(Number(id))}
                className={`flex items-center gap-2 px-3 py-2 w-full rounded-lg text-left hover:bg-gray-100 transition-colors ${
                  activeConv === Number(id) ? "bg-gray-200" : ""
                }`}
              >
                <MessageSquare size={16} className="text-gray-600" />
                <span className="truncate text-sm">
                  {msgs.find((m) => m.role === "user")?.message.slice(0, 30) || "Conversation"}
                </span>
              </button>
            ))
          ) : (
            <div className="text-center text-gray-400 text-sm py-4">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex flex-col flex-1">
        <Header onLogout={onLogout} email={email} />

        {/* Chat container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div ref={listRef} className="mx-auto w-full max-w-3xl space-y-6">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col message-enter">
                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm transition-all ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-[#635BFF] to-[#7c6ef5] text-white self-end max-w-[80%]"
                      : m.role === "assistant"
                      ? "bg-white text-gray-900 border border-gray-200 self-start max-w-[80%] hover:shadow-md"
                      : m.role === "loading"
                      ? "shimmer text-gray-700 self-start max-w-[80%] flex items-center gap-2"
                      : "bg-red-50 text-red-700 text-sm italic self-center border border-red-200"
                  }`}
                >
                  {m.role === "loading" ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot"></div>
                      </div>
                      <span className="text-gray-500">{m.content}</span>
                    </div>
                  ) : (
                    m.content
                  )}
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
                {m.timestamp && m.role !== "loading" && (
                  <div className={`text-[11px] text-gray-500 mt-1 ${m.role === "user" ? "self-end" : "self-start"}`}>
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 shadow-lg">
          {/* Recording/Processing Status Bar */}
          {(recording || isProcessingAudio) && (
            <div className="mx-auto max-w-3xl mb-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                recording ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                {recording ? (
                  <>
                    <Mic className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">Recording: {formatRecordingTime(recordingTime)}</span>
                    <div className="flex-1 flex items-center gap-1 ml-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-red-500 rounded-full animate-pulse"
                          style={{ 
                            height: `${Math.random() * 16 + 8}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Processing audio...</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={recording ? "Recording..." : isProcessingAudio ? "Processing audio..." : "Ask about Mehran University..."}
                className="w-full p-3 pr-12 rounded-xl bg-gray-50 text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#635BFF] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={recording || isLoading || isProcessingAudio}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
                </div>
              )}
            </div>

            {/* Microphone button */}
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || isLoading || isProcessingAudio}
              className={`p-3 rounded-xl text-white font-medium transition-all ${
                recording 
                  ? "bg-red-600 hover:bg-red-700 shadow-lg scale-105 recording-active" 
                  : "bg-gradient-to-r from-[#FF5C5C] to-[#ff4343] hover:shadow-lg hover:scale-105"
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
              title={recording ? `Stop Recording (${formatRecordingTime(recordingTime)})` : "Start Voice Recording"}
            >
              {recording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={() => send()}
              disabled={!input.trim() || isLoading || recording || isProcessingAudio}
              className="p-3 bg-gradient-to-r from-[#635BFF] to-[#534ae6] rounded-xl hover:shadow-lg hover:scale-105 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              title="Send Message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

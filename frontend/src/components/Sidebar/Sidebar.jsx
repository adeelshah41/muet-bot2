import { useEffect, useState } from "react";
import axios from "axios";

export default function Sidebar({ token, onSelectChat }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get("http://localhost:8000/history", {
          params: { token },
        });
        setHistory(res.data);
      } catch (err) {
        console.error("Error fetching history:", err);
      }
    };
    if (token) fetchHistory();
  }, [token]);

  return (
    <div className="w-64 bg-[#1a1a3d] text-white h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <button 
          onClick={() => onSelectChat(null)} 
          className="w-full bg-[#635BFF] py-2 rounded font-semibold"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {history.map((chat, idx) => (
          <div
            key={idx}
            onClick={() => onSelectChat(chat)}
            className="p-3 hover:bg-[#2a2a4d] cursor-pointer border-b border-gray-800"
          >
            <p className="truncate text-sm">
              {chat.role === "user" ? `You: ${chat.message}` : `Bot: ${chat.message}`}
            </p>
            <span className="text-xs text-gray-400">
              {new Date(chat.timestamp).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

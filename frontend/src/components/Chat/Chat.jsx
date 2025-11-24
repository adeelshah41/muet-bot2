import { useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import { API_BASE_URL } from "../../api";

export default function Chat({ token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSelectChat = (chat) => {
    if (chat) {
      setMessages([{ role: chat.role, content: chat.message }]);
    } else {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    setMessages([...messages, { role: "user", content: input }]);
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, token }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      aiMessage += decoder.decode(value);
      setMessages((msgs) => {
        const newMsgs = [...msgs];
        newMsgs[newMsgs.length - 1] = { role: "assistant", content: aiMessage };
        return newMsgs;
      });
    }
    setInput("");
  };

  return (
    <div className="flex h-screen bg-[#0f0f2d] text-white">
      <Sidebar token={token} onSelectChat={handleSelectChat} />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === "user" ? "text-right" : "text-left"}>
              <p className="bg-[#1a1a3d] inline-block px-4 py-2 rounded-lg mb-2">
                {msg.content}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 flex">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-3 rounded bg-[#1a1a3d] text-white"
            placeholder="Ask about Mehran University..."
          />
          <button onClick={sendMessage} className="ml-3 bg-[#635BFF] px-5 py-3 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

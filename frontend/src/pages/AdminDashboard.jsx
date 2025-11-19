import { useEffect, useState } from "react";
import API from "../api";

export default function AdminDashboard() {
  const [adminToken, setAdminToken] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [history, setHistory] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/admin/users", {
        params: { admin_token: adminToken },
      });
      setUsers(res.data);
    } catch (err) {
      alert("Invalid admin token or error fetching users");
    }
  };

  const fetchHistory = async (email) => {
    try {
      const res = await API.get("/admin/user-history", {
        params: { email, admin_token: adminToken },
      });
      setSelectedUser(email);
      setHistory(res.data);
    } catch (err) {
      alert("Error fetching history for " + email);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0f2d] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#1a1a3d] border-r border-gray-700 p-4">
        <h2 className="text-lg font-bold mb-3">Admin Dashboard</h2>

        {/* Admin token input */}
        <input
          type="password"
          placeholder="Enter Admin Token"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          className="w-full mb-2 p-2 rounded bg-[#2a2a4d]"
        />
        <button
          onClick={fetchUsers}
          className="w-full bg-[#635BFF] py-2 rounded mb-4"
        >
          Load Users
        </button>

        {/* User List */}
        <div className="overflow-y-auto h-[70vh]">
          {users.map((u, i) => (
            <div
              key={i}
              onClick={() => fetchHistory(u.email)}
              className={`p-2 cursor-pointer rounded ${
                selectedUser === u.email ? "bg-[#635BFF]" : "hover:bg-[#2a2a4d]"
              }`}
            >
              {u.email}
            </div>
          ))}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedUser ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Chat History for {selectedUser}
            </h2>
            <div className="space-y-3">
              {history.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${
                    msg.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <p className="inline-block px-4 py-2 rounded-lg bg-[#1a1a3d]">
                    <span className="font-semibold">
                      {msg.role === "user" ? "You: " : "Bot: "}
                    </span>
                    {msg.message}
                  </p>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400">Select a user to view history</p>
        )}
      </div>
    </div>
  );
}

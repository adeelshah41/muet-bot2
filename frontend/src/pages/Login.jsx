import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:8000";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();  // Using the navigate hook for redirection

const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
        // Update the payload to match what the backend expects
        const response = await axios.post(
            `${API}/login`,
            new URLSearchParams({
                username: email, // backend expects username and password
                password: password
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        localStorage.setItem("access_token", response.data.access_token);
        navigate("/chat");
    } catch (err) {
        setError("Invalid credentials. Please try again.");
    } finally {
        setLoading(false);
    }
};

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-[#0a0a10] via-[#141424] to-[#1b1b2f]">
      <div className="bg-[#1e1e2f] text-white p-10 rounded-2xl shadow-2xl w-96">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-r from-[#7f5af0] to-[#9775fa] p-[2px] rounded-full mb-3">
            <div className="bg-[#1e1e2f] rounded-full p-1">
              <img
                src="src/assets/muetlogo.png"  // use / if the image is inside the public folder
                alt="Mehran University Logo"
                className="w-14 h-14 object-contain rounded-full"
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Login</h2>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Sign in to access your Mehran University AI assistant
          </p>
        </div>

        {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@doe.com"
              required
              className="w-full p-3 bg-[#2a2a40] text-white border border-[#3a3a55] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7f5af0]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full p-3 bg-[#2a2a40] text-white border border-[#3a3a55] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7f5af0]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 mt-1 rounded-lg font-semibold flex justify-center items-center gap-2
              ${loading ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}
              bg-gradient-to-r from-[#7f5af0] to-[#9775fa] text-white`}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{" "}
            <a href="/register" className="text-[#7f5af0] hover:underline">
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

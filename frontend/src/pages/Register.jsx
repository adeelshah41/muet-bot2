import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://98.93.38.52:8000";

export default function Register() {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await axios.post(`${API}/register`, {
        name: fullname,
        email,
        password,
      });
      setSuccess("✅ Account created successfully! Redirecting to login...");
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "❌ Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-[#0a0a10] via-[#141424] to-[#1b1b2f]">
      <div className="bg-[#1e1e2f] text-white p-10 rounded-2xl shadow-2xl w-96">
        {/* Header + Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-r from-[#7f5af0] to-[#9775fa] p-[2px] rounded-full mb-3">
            <div className="bg-[#1e1e2f] rounded-full p-1">
              <img
                src="src/assets/muetlogo.png" // put this in the public folder
                alt="Mehran University Logo"
                className="w-14 h-14 object-contain rounded-full"
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold">Join Mehran University</h2>
          <p className="text-gray-400 text-sm mt-1 text-center">
            Create your account to start exploring our AI assistant
          </p>
        </div>

        {/* Success / Error messages */}
        {success && <p className="text-green-400 text-sm mb-3 text-center">{success}</p>}
        {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full p-3 bg-[#2a2a40] text-white border border-[#3a3a55] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7f5af0]"
            />
          </div>

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
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Redirect link */}
        <div className="mt-5 text-center">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <a href="/" className="text-[#7f5af0] hover:underline">
              Back to Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

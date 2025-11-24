import axios from "axios";

// Centralized API configuration with CORS support
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Allow cookies/credentials for CORS
});

// Request interceptor to add common headers
API.interceptors.request.use(
  (config) => {
    // Add any common headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle CORS errors
    if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
      console.error("CORS or Network Error:", error);
    }
    return Promise.reject(error);
  }
);

// Export both the axios instance and the base URL
export { API_BASE_URL };
export default API;

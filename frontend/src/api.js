import axios from "axios";

// Centralized API configuration with CORS support
// Use environment variable or detect server IP from current origin
const getApiBaseUrl = () => {
  // If VITE_API_URL is set, use it
  if (import.meta.env.VITE_API_URL) {
    console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // If running on server (public IP), use the server's IP for backend
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Extract the hostname (IP or domain) from current origin
    const hostname = window.location.hostname;
    const apiUrl = `http://${hostname}:8000`;
    console.log('Detected server environment. Using API URL:', apiUrl);
    return apiUrl;
  }
  
  // Default to localhost for local development
  console.log('Using localhost API URL');
  return "http://localhost:8000";
};

const API_BASE_URL = getApiBaseUrl();
console.log('Final API_BASE_URL:', API_BASE_URL);

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // Set to false when backend uses allow_origins=["*"]
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

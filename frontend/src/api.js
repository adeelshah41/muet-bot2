import axios from "axios";

// Hardcoded backend URL - Backend is hosted on the server
// Frontend can be accessed via ngrok or any other service
const API_BASE_URL = "http://98.93.38.52:8000";

console.log('Using API_BASE_URL:', API_BASE_URL);

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

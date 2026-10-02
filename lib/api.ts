import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Already on a page that handles its own auth (login, public /check):
      // redirecting here would reload the page and swallow the error.
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/check")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;

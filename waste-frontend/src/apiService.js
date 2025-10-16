import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Example: Register a user
export const registerUser = (data) => api.post("/users/", data);

// Example: Login (if using JWT later)
export const loginUser = (data) => api.post("/token/", data);

export default api;

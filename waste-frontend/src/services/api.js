import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

export const getAdminAnalytics = async (token) => {
    const response = await axios.get(`${API_BASE}/complaints/admin-analytics/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

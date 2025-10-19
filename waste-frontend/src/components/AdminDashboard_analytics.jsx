import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem("token"); // ✅ JWT token stored after login

                if (!token) {
                    setError("You must be logged in as admin to view analytics.");
                    return;
                }

                const response = await axios.get(
                    "http://127.0.0.1:8000/api/complaints/admin-analytics/",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`, // ✅ Send JWT token to backend
                        },
                    }
                );

                setAnalytics(response.data);
            } catch (err) {
                if (err.response?.status === 401) {
                    setError("Unauthorized: Please log in again.");
                } else if (err.response?.status === 403) {
                    setError("Access Denied: Only admins can view this page.");
                } else {
                    setError("Failed to load analytics. Please try again.");
                }
            }
        };

        fetchAnalytics();
    }, []);

    if (error) {
        return (
            <div className="text-center mt-10 text-red-600 text-lg font-semibold">
                ⚠️ {error}
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center mt-10 text-gray-600 text-lg font-medium">
                Loading analytics...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-green-600 text-white p-6 rounded-2xl shadow-md">
                    <h3 className="text-lg font-semibold">Total Complaints</h3>
                    <p className="text-3xl font-bold mt-2">
                        {analytics.total_complaints}
                    </p>
                </div>
                <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-md">
                    <h3 className="text-lg font-semibold">Average Worker Rating</h3>
                    <p className="text-3xl font-bold mt-2">
                        {analytics.average_worker_rating || "N/A"}
                    </p>
                </div>
                <div className="bg-yellow-600 text-white p-6 rounded-2xl shadow-md">
                    <h3 className="text-lg font-semibold">Status Categories</h3>
                    <ul className="mt-2 text-sm">
                        {Object.entries(analytics.status_breakdown || {}).map(
                            ([status, count]) => (
                                <li key={status}>
                                    {status}: <b>{count}</b>
                                </li>
                            )
                        )}
                    </ul>
                </div>
            </div>

            {/* Top Workers */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
                <h2 className="text-xl font-semibold mb-4">⭐ Top Rated Workers</h2>
                {analytics.top_workers?.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                        {analytics.top_workers.map((worker, index) => (
                            <li key={index} className="py-3 flex justify-between items-center">
                                <span>
                                    <b>{worker.username}</b> ({worker.total_ratings} ratings)
                                </span>
                                <span className="font-bold text-green-700">
                                    {worker.rating.toFixed(1)} ⭐
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No worker ratings yet.</p>
                )}
            </div>
        </div>
    );
}

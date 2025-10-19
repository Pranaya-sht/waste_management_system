import React, { useEffect, useState } from "react";
import axios from "axios";
import RatingBarChart from "../components/Charts/RatingBarChart";
import StatusPieChart from "../components/Charts/StatusPieChart";

export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem("access"); // ✅ JWT token stored after login
                const role = localStorage.getItem("role");

                if (!token) {
                    setError("You must be logged in as admin to view analytics.");
                    return;
                }

                if (role !== "Admin") {
                    setError("Access Denied: Only admins can view analytics.");
                    return;
                }

                const response = await axios.get(
                    "http://127.0.0.1:8000/api/admin/analytics/", // ✅ backend URL
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setAnalytics(response.data);
            } catch (err) {
                console.error(err);
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
        <div className="space-y-8 p-6">
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
                    <h3 className="text-lg font-semibold">Pending Complaints</h3>
                    <p className="text-3xl font-bold mt-2">
                        {analytics.pending_complaints}
                    </p>
                </div>
            </div>

            {/* Status Breakdown Pie Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
                <h2 className="text-xl font-semibold mb-4">Complaint Status Breakdown</h2>
                <StatusPieChart data={analytics.status_breakdown || {}} />
            </div>

            {/* Top Rated Workers Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
                <h2 className="text-xl font-semibold mb-4">Top Rated Workers</h2>
                {analytics.top_workers?.length > 0 ? (
                    <RatingBarChart data={analytics.top_workers} />
                ) : (
                    <p className="text-gray-500">No worker ratings yet.</p>
                )}
            </div>

            {/* Top Workers List */}
            <div className="bg-white p-6 rounded-2xl shadow-md">
                <h2 className="text-xl font-semibold mb-4">⭐ Top Workers Details</h2>
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

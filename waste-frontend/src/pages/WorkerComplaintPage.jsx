// src/pages/WorkerComplaintPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import WorkerComplaintCard from "../components/WorkerComplaintCard";

export const WorkerComplaintPage = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all, pending, assigned

    const token = localStorage.getItem("access");

    const fetchComplaints = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/complaints/", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const complaintsArray = res.data.results || res.data;
            setComplaints(complaintsArray);
        } catch (err) {
            console.error("Error fetching complaints", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredComplaints = complaints.filter(complaint => {
        if (filter === "pending") return complaint.status === "Pending";
        if (filter === "assigned") return complaint.status !== "Pending";
        return true;
    });

    useEffect(() => {
        fetchComplaints();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Worker Complaint Dashboard
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Manage and track assigned complaints in real-time
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
                    <div className="flex flex-wrap gap-4 justify-center">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${filter === "all"
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            All Complaints
                        </button>
                        <button
                            onClick={() => setFilter("pending")}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${filter === "pending"
                                    ? "bg-yellow-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter("assigned")}
                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${filter === "assigned"
                                    ? "bg-green-600 text-white shadow-md"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            Assigned to Me
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-blue-600">{complaints.length}</div>
                        <div className="text-gray-600">Total Complaints</div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {complaints.filter(c => c.status === "Pending").length}
                        </div>
                        <div className="text-gray-600">Pending</div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {complaints.filter(c => c.status !== "Pending").length}
                        </div>
                        <div className="text-gray-600">Assigned</div>
                    </div>
                </div>

                {/* Complaints Grid */}
                <div className="space-y-6">
                    {filteredComplaints.length > 0 ? (
                        filteredComplaints.map((complaint) => (
                            <WorkerComplaintCard
                                key={complaint.id}
                                complaint={complaint}
                                onUpdate={fetchComplaints}
                            />
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
                            <div className="text-gray-400 text-6xl mb-4">📝</div>
                            <p className="text-gray-600 text-lg mb-2">No complaints found</p>
                            <p className="text-gray-500">
                                {filter === "all"
                                    ? "There are no complaints available at the moment."
                                    : filter === "pending"
                                        ? "There are no pending complaints."
                                        : "You don't have any assigned complaints."
                                }
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkerComplaintPage;
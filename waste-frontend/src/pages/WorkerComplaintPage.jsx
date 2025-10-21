// src/pages/WorkerComplaintPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import WorkerComplaintCard from "../components/WorkerComplaintCard";

export const WorkerComplaintPage = () => {
    const [complaints, setComplaints] = useState([]);

    // Get token from localStorage
    const token = localStorage.getItem("access");

    const fetchComplaints = async () => {
        if (!token) return;
        try {
            const res = await axios.get("http://127.0.0.1:8000/api/complaints/", {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Check if paginated
            const complaintsArray = res.data.results || res.data;
            setComplaints(complaintsArray);
        } catch (err) {
            console.error("Error fetching complaints", err);
        }
    };


    useEffect(() => {
        fetchComplaints();
        console.log("Token from localStorage:", token);
    }, []);

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Assigned Complaints</h2>
            <div className="grid gap-4">
                {complaints.length > 0 ? (
                    complaints.map((c) => (
                        <WorkerComplaintCard
                            key={c.id}
                            complaint={c}
                            onAccept={fetchComplaints}
                        />
                    ))
                ) : (
                    <p>No complaints available.</p>
                )}
            </div>
        </div>
    );
};

export default WorkerComplaintPage;

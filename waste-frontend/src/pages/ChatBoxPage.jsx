import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import axios from "axios";

const ChatBoxPage = () => {
    const { complaintId } = useParams();
    const location = useLocation();
    const { username, role } = location.state || {}; // 👈 role can be 'worker' or 'citizen'
    const [complaintExists, setComplaintExists] = useState(null);

    useEffect(() => {
        if (complaintId) {
            axios
                .get(`http://127.0.0.1:8000/api/complaints/${complaintId}/`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("access")}`,
                    },
                })
                .then(() => setComplaintExists(true))
                .catch(() => setComplaintExists(false));
        }
    }, [complaintId]);

    if (!username) {
        return <p className="text-center text-red-500">Missing user info.</p>;
    }

    if (complaintExists === false) {
        return (
            <p className="text-center text-red-500">
                Complaint #{complaintId} not found.
            </p>
        );
    }

    if (complaintExists === null) {
        return <p className="text-center text-gray-500">Loading...</p>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50">
            <h2 className="text-2xl font-bold mb-4 text-gray-700">
                Complaint #{complaintId} Chat
            </h2>
            <ChatBox
                username={username}
                role={role}
                roomName={`complaint_${complaintId}`}
            />
        </div>
    );
};

export default ChatBoxPage;

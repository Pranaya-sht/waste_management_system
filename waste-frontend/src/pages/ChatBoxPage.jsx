import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import axios from "axios";

const ChatBoxPage = () => {
    const { complaintId } = useParams();
    const location = useLocation();
    const { username } = location.state || {};
    const [complaintExists, setComplaintExists] = useState(null);

    useEffect(() => {
        if (complaintId) {
            axios.get(`http://127.0.0.1:8000/api/complaints/${complaintId}/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("access")}`
                }
            })
                .then(() => setComplaintExists(true))
                .catch(() => setComplaintExists(false));
        }
    }, [complaintId]);

    if (!username) {
        return <p className="text-center text-red-500">Missing user info.</p>;
    }

    if (complaintExists === false) {
        return <p className="text-center text-red-500">
            Complaint #{complaintId} not found.
        </p>;
    }

    if (complaintExists === null) {
        return <p className="text-center text-gray-500">Loading...</p>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">
                Chat for Complaint #{complaintId}
            </h2>
            <ChatBox
                username={username}
                roomName={`complaint_${complaintId}`}
            />
        </div>
    );
};

export default ChatBoxPage;

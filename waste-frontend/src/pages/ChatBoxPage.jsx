import React from "react";
import { useParams, useLocation } from "react-router-dom";
import ChatBox from "../components/ChatBox";

const ChatBoxPage = () => {
    const { complaintId } = useParams();
    const location = useLocation();
    const { username } = location.state || {};

    if (!complaintId || !username) {
        return <p className="text-center text-red-500">Missing complaint or user info.</p>;
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

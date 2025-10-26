import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChatButton = ({ complaintId, username, status }) => {
    const navigate = useNavigate();

    // Only show chat button for these statuses
    const shouldShowChat = ['Accepted', 'In Progress', 'Completed'].includes(status);

    if (!shouldShowChat) return null;

    const handleChat = () => {
        navigate(`/chat/${complaintId}`, {
            state: { username }
        });
    };

    return (
        <button
            onClick={handleChat}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            Chat
        </button>
    );
};

export default ChatButton;
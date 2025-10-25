import React, { useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";

const ChatBox = ({ username, roomName }) => {
    const [message, setMessage] = useState("");
    const [chatLog, setChatLog] = useState([]);

    const { sendJsonMessage, lastJsonMessage } = useWebSocket(
        `ws://127.0.0.1:8000/ws/chat/${roomName}/`,
        { shouldReconnect: () => true }
    );

    useEffect(() => {
        if (lastJsonMessage) {
            setChatLog((prev) => [...prev, lastJsonMessage]);
        }
    }, [lastJsonMessage]);

    const sendMessage = () => {
        if (message.trim() !== "") {
            sendJsonMessage({ user: username, message });
            setMessage("");
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow">
            <div className="h-64 overflow-y-auto border p-2 mb-3">
                {chatLog.map((msg, idx) => (
                    <p key={idx}>
                        <strong>{msg.user}:</strong> {msg.message}
                    </p>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    className="flex-1 border p-2 rounded"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type message..."
                />
                <button onClick={sendMessage} className="bg-blue-500 text-white px-4 py-2 rounded">
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatBox;

import React, { useState, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { format } from 'date-fns';

const ChatBox = ({ username, roomName }) => {
    const [message, setMessage] = useState("");
    const [chatLog, setChatLog] = useState([]);
    const chatEndRef = useRef(null);

    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
        `ws://127.0.0.1:8001/ws/chat/complaint/${roomName.replace('complaint_', '')}/`,
        {
            shouldReconnect: () => true,
            queryParams: {
                token: localStorage.getItem("access")
            }
        }
    );

    useEffect(() => {
        if (lastJsonMessage) {
            setChatLog((prev) => [...prev, {
                ...lastJsonMessage,
                timestamp: new Date().toISOString()
            }]);
        }
    }, [lastJsonMessage]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLog]);

    const sendMessage = (e) => {
        e?.preventDefault();
        if (message.trim() !== "") {
            sendJsonMessage({
                user: username,
                message: message.trim()
            });
            setMessage("");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="p-4 bg-white rounded-xl shadow w-full max-w-2xl">
            <div className="h-[500px] flex flex-col">
                <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-3 space-y-2">
                    {chatLog.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.user === username ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[70%] break-words rounded-lg p-3 ${msg.user === username
                                ? 'bg-blue-500 text-white rounded-br-none'
                                : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                }`}>
                                <p className="text-sm font-semibold mb-1">{msg.user}</p>
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                <p className="text-xs mt-1 opacity-75">
                                    {format(new Date(msg.timestamp), 'HH:mm')}
                                </p>
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendMessage} className="flex gap-2">
                    <textarea
                        className="flex-1 border p-2 rounded resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type message..."
                        rows="2"
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                        disabled={!message.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatBox;

import React, { useState, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { format } from "date-fns";

const ChatBox = ({ username, roomName, role }) => {
    const [message, setMessage] = useState("");
    const [chatLog, setChatLog] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);

    const normalizedUsername = username?.trim().toLowerCase();

    // ✅ WebSocket setup
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
        `ws://127.0.0.1:8001/ws/chat/complaint/${roomName.replace("complaint_", "")}/`,
        {
            shouldReconnect: () => true,
            reconnectAttempts: 20,
            reconnectInterval: 3000,
            queryParams: { token: localStorage.getItem("access") },
        }
    );

    // ✅ Update connection status
    useEffect(() => {
        setIsConnected(readyState === 1);
    }, [readyState]);

    // ✅ Fetch old messages
    useEffect(() => {
        const fetchMessages = async () => {
            const token = localStorage.getItem("access");
            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/api/complaints/${roomName.replace("complaint_", "")}/messages/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    setChatLog(
                        data.map((msg) => ({
                            id: msg.id,
                            user: msg.sender_username,
                            message: msg.message,
                            timestamp: msg.created_at,
                            is_read: msg.is_read,
                            sender_id: msg.sender_id,
                        }))
                    );
                } else {
                    console.error("Failed to load messages:", response.status);
                }
            } catch (err) {
                console.error("Failed to load messages:", err);
            }
        };

        fetchMessages();
    }, [roomName, isConnected]);

    // ✅ Handle incoming WebSocket messages
    useEffect(() => {
        if (lastJsonMessage && lastJsonMessage.type === "new_message") {
            const newMessage = {
                id: lastJsonMessage.message_id || Date.now(),
                user: lastJsonMessage.sender,
                message: lastJsonMessage.message,
                timestamp: lastJsonMessage.timestamp || new Date().toISOString(),
                is_read: false,
                sender_id: lastJsonMessage.sender_id,
            };

            setChatLog((prev) => {
                const exists = prev.some((m) => m.id === newMessage.id);
                return exists ? prev : [...prev, newMessage];
            });
        }
    }, [lastJsonMessage]);

    // ✅ Auto-scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatLog]);

    // ✅ Send message
    const sendMessage = (e) => {
        e?.preventDefault();
        if (!message.trim()) return;

        const tempMessage = {
            id: Date.now(),
            user: username,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            is_read: false,
        };

        setChatLog((prev) => [...prev, tempMessage]);
        sendJsonMessage({ message: message.trim() });
        setMessage("");
        textareaRef.current.style.height = "auto";
    };

    // ✅ Handle Enter key
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ✅ Resize textarea dynamically
    const handleTextareaChange = (e) => {
        setMessage(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    };

    const formatTime = (timestamp) => {
        try {
            return format(new Date(timestamp), "HH:mm");
        } catch {
            return "--:--";
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                            <span className="text-lg font-semibold">
                                {role === "worker" ? "👷" : "🧑"}
                            </span>
                        </div>
                        <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isConnected ? "bg-green-400" : "bg-gray-400"
                                }`}
                        ></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">
                            Complaint #{roomName.replace("complaint_", "")}
                        </h2>
                        <p className="text-sm text-blue-100">
                            {isConnected ? "Connected" : "Connecting..."}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-blue-200">{username}</div>
                    <div className="text-xs text-blue-300 capitalize">{role}</div>
                </div>
            </div>

            {/* Messages */}
            <div className="h-[500px] overflow-y-auto bg-gray-50 p-4">
                {chatLog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <span className="text-2xl mb-2">💬</span>
                        <p className="text-lg">No messages yet</p>
                    </div>
                ) : (
                    chatLog.map((msg, i) => {
                        const msgUser = msg.user?.trim().toLowerCase();
                        const isOwn = msgUser === normalizedUsername;
                        const showSender =
                            i === 0 || chatLog[i - 1].user !== msg.user;

                        return (
                            <div key={msg.id || i} className="mb-3">
                                {showSender && (
                                    <p
                                        className={`text-xs mb-1 font-semibold ${isOwn
                                                ? "text-right text-blue-500"
                                                : "text-left text-gray-600"
                                            }`}
                                    >
                                        {msg.user}
                                    </p>
                                )}

                                <div
                                    className={`flex ${isOwn ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${isOwn
                                                ? "bg-blue-500 text-white rounded-br-none"
                                                : "bg-gray-200 text-gray-800 rounded-bl-none"
                                            }`}
                                    >
                                        <p className="text-sm whitespace-pre-wrap break-words">
                                            {msg.message}
                                        </p>
                                        <div
                                            className={`flex items-center text-xs mt-1 ${isOwn
                                                    ? "justify-end text-blue-200"
                                                    : "text-gray-500"
                                                }`}
                                        >
                                            {formatTime(msg.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white p-4">
                <form onSubmit={sendMessage} className="flex space-x-3">
                    <textarea
                        ref={textareaRef}
                        className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={message}
                        onChange={handleTextareaChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message... (Enter to send)"
                        rows="1"
                        style={{ minHeight: "48px", maxHeight: "120px" }}
                    />
                    <button
                        type="submit"
                        disabled={!message.trim() || !isConnected}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 disabled:bg-gray-400 transition-all"
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatBox;

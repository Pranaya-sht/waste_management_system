import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState("Citizen");
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("access");

    // ✅ Fetch all users
    useEffect(() => {
        if (!token) {
            setMessage("❌ Please log in first");
            return;
        }

        axios
            .get("http://127.0.0.1:8000/api/users/", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setUsers(res.data))
            .catch(() => setMessage("❌ Could not load users"));
    }, [token]);

    // ✅ Approve Worker
    const handleApprove = async (userId) => {
        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/users/${userId}/approve/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(res.data.message);
            setUsers(
                users.map((u) =>
                    u.id === userId ? { ...u, is_approved: true } : u
                )
            );
        } catch (err) {
            setMessage(
                err.response?.data?.detail ||
                "❌ You are not authorized to approve this user."
            );
        }
    };

    // ✅ Unapprove Worker
    const handleUnapprove = async (userId) => {
        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/users/${userId}/unapprove_worker/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(res.data.message);
            setUsers(
                users.map((u) =>
                    u.id === userId ? { ...u, is_approved: false } : u
                )
            );
        } catch (err) {
            setMessage(
                err.response?.data?.detail ||
                "❌ You are not authorized to unapprove this user."
            );
        }
    };

    // ✅ Filter by active tab & search term
    const filteredUsers = users
        .filter((u) => u.role === activeTab)
        .filter((u) =>
            u.username.toLowerCase().includes(search.toLowerCase())
        );

    // ✅ Render user cards instead of tables
    const UserCard = ({ user }) => (
        <div className="border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all bg-white">
            <p className="font-semibold text-lg text-gray-800">{user.username}</p>
            <p className="text-sm text-gray-600">
                Status:{" "}
                <span
                    className={
                        user.is_approved ? "text-green-600" : "text-yellow-600"
                    }
                >
                    {user.is_approved ? "✅ Approved" : "⏳ Pending"}
                </span>
            </p>

            {activeTab === "Worker" && (
                <div className="mt-3">
                    {user.is_approved ? (
                        <button
                            onClick={() => handleUnapprove(user.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                            Unapprove
                        </button>
                    ) : (
                        <button
                            onClick={() => handleApprove(user.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        >
                            Approve
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-center text-green-600 mb-6">
                🧑‍💼 Admin Dashboard
            </h1>

            {message && (
                <p className="text-center text-gray-700 mb-4 font-medium">
                    {message}
                </p>
            )}

            {/* 🔹 Tabs */}
            <div className="flex justify-center mb-6 space-x-3">
                {["Citizen", "Worker", "Admin"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-full font-medium transition-all ${activeTab === tab
                                ? "bg-green-500 text-white shadow-md"
                                : "bg-white border border-green-500 text-green-600 hover:bg-green-50"
                            }`}
                    >
                        {tab}s
                    </button>
                ))}
            </div>

            {/* 🔍 Search */}
            <div className="flex justify-center mb-6">
                <input
                    type="text"
                    placeholder={`Search ${activeTab.toLowerCase()}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-96 border border-gray-300 p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
            </div>

            {/* 🧾 User Cards */}
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                        <UserCard key={user.id} user={user} />
                    ))
                ) : (
                    <p className="text-center text-gray-600 col-span-full">
                        No users found.
                    </p>
                )}
            </div>
        </div>
    );
}

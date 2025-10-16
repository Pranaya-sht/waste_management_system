import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("access");
        if (!token) {
            setError("❌ Please login first");
            return;
        }

        axios
            .get("http://127.0.0.1:8000/api/users/me/", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => setUser(res.data))
            .catch(() => setError("❌ Could not fetch user data"));
    }, []);

    if (error) return <p className="text-red-600 text-center mt-20">{error}</p>;
    if (!user) return <p className="text-gray-600 text-center mt-20">Loading...</p>;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <h1 className="text-3xl font-bold mb-4 text-green-600">
                Welcome, {user.username}!
            </h1>

            <p className="text-gray-700 mb-2">Role: {user.role}</p>
            <p className="text-gray-700 mb-6">
                Status: {user.is_approved ? "✅ Approved" : "⏳ Pending Approval"}
            </p>

            {user.role === "Admin" && (
                <div className="bg-white p-4 shadow rounded w-80 text-center">
                    <h2 className="font-bold text-lg mb-2">Admin Dashboard</h2>
                    <p>🧑‍💼 You can approve Workers and manage users.</p>
                </div>
            )}

            {user.role === "Worker" && (
                <div className="bg-white p-4 shadow rounded w-80 text-center">
                    <h2 className="font-bold text-lg mb-2">Worker Dashboard</h2>
                    <p>🚛 You can see and update assigned complaints.</p>
                </div>
            )}

            {user.role === "Citizen" && (
                <div className="bg-white p-4 shadow rounded w-80 text-center">
                    <h2 className="font-bold text-lg mb-2">Citizen Dashboard</h2>
                    <p>📢 You can submit and track your complaints.</p>
                </div>
            )}
        </div>
    );
}

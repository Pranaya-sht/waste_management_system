import { useState } from "react";
import axios from "axios";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleLogin = async () => {
        try {
            // 1️⃣ Get JWT tokens
            const res = await axios.post("http://127.0.0.1:8000/api/token/", {
                username,
                password,
            });

            const { access, refresh } = res.data;
            localStorage.setItem("access", access);
            localStorage.setItem("refresh", refresh);

            // 2️⃣ Fetch user info
            const userRes = await axios.get("http://127.0.0.1:8000/api/users/me/", {
                headers: { Authorization: `Bearer ${access}` },
            });

            const user = userRes.data;

            // 🟢 Save role and username in localStorage
            localStorage.setItem("role", user.role);
            localStorage.setItem("username", user.username);

            // 3️⃣ Block unapproved users
            if ((user.role === "Admin" || user.role === "Worker") && !user.is_approved) {
                setMessage(`⏳ Your ${user.role} account is pending approval.`);
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                localStorage.removeItem("role");
                localStorage.removeItem("username");
                return;
            }

            // 4️⃣ Success message and redirect
            setMessage(`✅ Welcome, ${user.username}! (${user.role})`);

            // 🧭 Optionally redirect based on role
            // if (user.role === "Admin") navigate("/admin-dashboard");
            // else if (user.role === "Worker") navigate("/worker-dashboard");
            // else navigate("/citizen-dashboard");
        } catch (err) {
            console.error(err);
            setMessage("❌ Invalid credentials or user not found.");
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
                <h1 className="text-2xl font-bold text-center mb-4 text-green-600">
                    Login
                </h1>
                <input
                    className="border rounded p-2 w-full mb-3"
                    placeholder="Username"
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    className="border rounded p-2 w-full mb-3"
                    type="password"
                    placeholder="Password"
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    className="bg-green-500 text-white p-2 rounded w-full hover:bg-green-600"
                    onClick={handleLogin}
                >
                    Login
                </button>
                <p className="text-center mt-3 text-gray-600">{message}</p>
            </div>
        </div>
    );
}

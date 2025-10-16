import { useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react"; // optional: install with `npm install lucide-react`

export default function Register() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "Citizen",
    });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleRegister = async () => {
        const { username, email, password, role } = formData;

        if (!username || !email || !password) {
            setMessage("⚠️ Please fill in all fields.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const res = await axios.post("http://127.0.0.1:8000/api/users/", {
                username,
                email,
                password,
                role,
            });

            setMessage(
                role === "Citizen"
                    ? "✅ Registered successfully as Citizen!"
                    : `✅ Registered as ${role}. Awaiting approval.`
            );

            setFormData({
                username: "",
                email: "",
                password: "",
                role: "Citizen",
            });
        } catch (err) {
            console.error(err);
            setMessage(
                `❌ Error: ${err.response?.data?.detail || "Something went wrong"}`
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md transition-transform transform hover:scale-[1.01]">
                <h1 className="text-3xl font-extrabold text-center text-green-600 mb-6">
                    ♻️ Waste Management Register
                </h1>

                <div className="space-y-4">
                    <input
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="👤 Username"
                    />

                    <input
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        type="email"
                        className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="📧 Email"
                    />

                    <input
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        type="password"
                        className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="🔒 Password"
                    />

                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="border border-gray-300 rounded-lg p-3 w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                        <option value="Citizen">Citizen</option>
                        <option value="Worker">Worker</option>
                        <option value="Admin">Admin</option>
                    </select>

                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className={`w-full flex justify-center items-center bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-all duration-200 ${loading ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Register"}
                    </button>
                </div>

                {message && (
                    <p
                        className={`mt-4 text-center text-sm font-medium ${message.startsWith("✅")
                                ? "text-green-600"
                                : message.startsWith("⚠️")
                                    ? "text-yellow-600"
                                    : "text-red-600"
                            }`}
                    >
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
}

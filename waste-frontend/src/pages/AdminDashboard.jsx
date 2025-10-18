import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaStar, FaUser, FaPhone } from "react-icons/fa";

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState("Citizen");
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("access");
    const navigate = useNavigate();

    // Fetch all users with detailed profile information
    useEffect(() => {
        if (!token) {
            setMessage("❌ Please log in first");
            setLoading(false);
            return;
        }

        const fetchUsersWithProfiles = async () => {
            try {
                setLoading(true);

                // First, get the list of users
                const usersResponse = await axios.get(
                    "http://127.0.0.1:8000/api/users/",
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                // Then fetch detailed profile for each user
                const usersWithProfiles = await Promise.all(
                    usersResponse.data.map(async (user) => {
                        try {
                            const profileResponse = await axios.get(
                                `http://127.0.0.1:8000/api/users/${user.id}/profile/`,
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            return {
                                ...user,
                                ...profileResponse.data, // Merge profile data
                                profile_picture: profileResponse.data.profile_picture,
                                phone_number: profileResponse.data.phone_number,
                                bio: profileResponse.data.bio,
                                rating: profileResponse.data.rating,
                                rating_count: profileResponse.data.rating_count,
                                is_approved: profileResponse.data.is_approved
                            };
                        } catch (error) {
                            console.error(`Error fetching profile for user ${user.id}:`, error);
                            return user; // Return basic user data if profile fetch fails
                        }
                    })
                );

                setUsers(usersWithProfiles);
            } catch (error) {
                console.error("Error fetching users:", error);
                setMessage("❌ Could not load users");
            } finally {
                setLoading(false);
            }
        };

        fetchUsersWithProfiles();
    }, [token]);

    // Approve/Unapprove worker
    const handleApprove = async (userId) => {
        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/users/${userId}/approve_worker/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(res.data.message);
            setUsers(users.map((u) => (u.id === userId ? { ...u, is_approved: true } : u)));
        } catch (err) {
            setMessage(err.response?.data?.detail || "❌ Not authorized.");
        }
    };

    const handleUnapprove = async (userId) => {
        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/users/${userId}/unapprove_worker/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(res.data.message);
            setUsers(users.map((u) => (u.id === userId ? { ...u, is_approved: false } : u)));
        } catch (err) {
            setMessage(err.response?.data?.detail || "❌ Not authorized.");
        }
    };

    // Filter users by active tab & search term
    const filteredUsers = users
        .filter((u) => u.role === activeTab)
        .filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));

    // User Card
    const UserCard = ({ user }) => (
        <div
            className="border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all bg-white cursor-pointer"
            onClick={() => navigate(`/profile/${user.id}`)}
        >
            <div className="flex items-center space-x-4">
                {/* Profile Picture */}
                <div className="relative">
                    {user.profile_picture ? (
                        <img
                            src={`http://127.0.0.1:8000${user.profile_picture}`}
                            alt={user.username}
                            className="w-16 h-16 rounded-full object-cover border-2 border-green-400"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div className={`w-16 h-16 rounded-full border-2 border-green-400 bg-gray-100 flex items-center justify-center ${user.profile_picture ? 'hidden' : 'flex'}`}>
                        <FaUser className="text-gray-400 text-xl" />
                    </div>
                </div>

                <div className="flex-1">
                    <p className="font-semibold text-lg text-gray-800">{user.username}</p>

                    {/* Phone Number */}
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                        <FaPhone className="mr-1 text-gray-400" />
                        <span>{user.phone_number || "Not provided"}</span>
                    </div>

                    {/* Worker Rating */}
                    {user.role === "Worker" && (
                        <div className="flex items-center mt-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                    key={star}
                                    className={`text-sm ${star <= (user.rating || 0) ? "text-yellow-400" : "text-gray-300"}`}
                                />
                            ))}
                            <span className="text-gray-600 ml-2 text-sm">({(user.rating || 0).toFixed(1)}/5)</span>
                            {user.rating_count > 0 && (
                                <span className="text-gray-500 text-xs ml-1">
                                    ({user.rating_count})
                                </span>
                            )}
                        </div>
                    )}

                    {/* Approval Status */}
                    {user.role === "Worker" && (
                        <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.is_approved ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                            {user.is_approved ? "✅ Approved" : "⏳ Pending Approval"}
                        </div>
                    )}
                </div>
            </div>

            {/* Approve/Unapprove Buttons */}
            {activeTab === "Worker" && (
                <div className="mt-3 flex justify-end space-x-2">
                    {user.is_approved ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUnapprove(user.id);
                            }}
                            className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                        >
                            Unapprove
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(user.id);
                            }}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                        >
                            Approve
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-3xl font-bold text-center text-green-600 mb-6">🧑‍💼 Admin Dashboard</h1>

            {message && (
                <div className={`max-w-2xl mx-auto mb-6 p-3 rounded-lg text-center font-medium ${message.includes("✅") ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                    {message}
                </div>
            )}

            {/* Tabs */}
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

            {/* Search */}
            <div className="flex justify-center mb-6">
                <input
                    type="text"
                    placeholder={`Search ${activeTab.toLowerCase()}s...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-96 border border-gray-300 p-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
            </div>

            {/* User Count */}
            <div className="text-center mb-4">
                <p className="text-gray-600">
                    Showing {filteredUsers.length} {activeTab.toLowerCase()}{filteredUsers.length !== 1 ? 's' : ''}
                    {search && ` matching "${search}"`}
                </p>
            </div>

            {/* User Cards */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => <UserCard key={user.id} user={user} />)
                ) : (
                    <div className="col-span-full text-center py-8">
                        <p className="text-gray-600 text-lg">No {activeTab.toLowerCase()}s found.</p>
                        {search && (
                            <p className="text-gray-500 mt-2">Try adjusting your search term</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
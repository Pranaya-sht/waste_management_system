import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { FaStar, FaEdit, FaSave, FaTimes, FaPhone, FaEnvelope, FaUser, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function ProfilePage() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        bio: "",
        phone_number: ""
    });
    const [selectedRating, setSelectedRating] = useState(0);
    const token = localStorage.getItem("access");

    // Check if this is the current user's profile
    const isOwnProfile = !id;

    // Fetch current user and profile data
    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                setMessage("❌ Please login first");
                setLoading(false);
                return;
            }

            try {
                // Fetch current user
                const userResponse = await axios.get(
                    "http://127.0.0.1:8000/api/users/me/",
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setCurrentUser(userResponse.data);

                // Fetch profile data
                let profileResponse;
                if (id) {
                    // Viewing another user's profile - use the new endpoint
                    profileResponse = await axios.get(
                        `http://127.0.0.1:8000/api/users/${id}/profile/`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                } else {
                    // Viewing own profile
                    profileResponse = await axios.get(
                        "http://127.0.0.1:8000/api/users/profile/",
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }

                setProfile(profileResponse.data);
                setFormData({
                    bio: profileResponse.data.bio || "",
                    phone_number: profileResponse.data.phone_number || ""
                });
            } catch (err) {
                console.error("Error fetching profile:", err);
                if (err.response?.status === 500) {
                    setMessage("❌ Server error. Please try again later.");
                } else {
                    setMessage(err.response?.data?.detail || "❌ Could not load profile");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, token]);

    // Handle input changes
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // Save profile updates
    const handleSave = async () => {
        try {
            const response = await axios.put(
                "http://127.0.0.1:8000/api/users/profile/",
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            setProfile(response.data);
            setEditMode(false);
            setMessage("✅ Profile updated successfully!");
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            console.error(err);
            setMessage("❌ Failed to update profile");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    // Rate worker
    const handleRate = async (ratingValue) => {
        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/workers/${profile.id}/rate/`,
                { rating: ratingValue },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(`⭐ Rated ${profile.username} with ${ratingValue} stars!`);
            setProfile(prev => ({
                ...prev,
                rating: res.data.new_average,
                rating_count: (prev.rating_count || 0) + 1
            }));
            setSelectedRating(ratingValue);
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage(err.response?.data?.detail || "❌ Failed to rate worker");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    // Approve/Unapprove user (admin only)
    const handleApprove = async () => {
        try {
            await axios.post(
                `http://127.0.0.1:8000/api/users/${profile.id}/approve_worker/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProfile(prev => ({ ...prev, is_approved: true }));
            setMessage(`✅ ${profile.username} approved successfully!`);
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage(err.response?.data?.detail || "❌ Failed to approve user");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const handleUnapprove = async () => {
        try {
            await axios.post(
                `http://127.0.0.1:8000/api/users/${profile.id}/unapprove_worker/`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProfile(prev => ({ ...prev, is_approved: false }));
            setMessage(`❌ ${profile.username} unapproved!`);
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage(err.response?.data?.detail || "❌ Failed to unapprove user");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 text-lg mb-4">{message}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">
                        User Profile
                    </h1>
                    <p className="text-gray-600">
                        {isOwnProfile ? "Manage your profile information" : `Viewing ${profile.username}'s profile`}
                    </p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 text-white">
                        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-3xl">
                                    {profile.profile_picture ? (
                                        <img
                                            src={`http://127.0.0.1:8000${profile.profile_picture}`}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full object-cover"
                                        />
                                    ) : (
                                        <FaUser />
                                    )}
                                </div>
                                {profile.is_approved && (
                                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                                        <FaCheckCircle className="text-white text-sm" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left flex-1">
                                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
                                    <h2 className="text-2xl font-bold">{profile.username}</h2>
                                    <div className="flex items-center space-x-2 justify-center md:justify-start">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${profile.role === "Admin"
                                                ? "bg-red-100 text-red-800"
                                                : profile.role === "Worker"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-green-100 text-green-800"
                                            }`}>
                                            {profile.role}
                                        </span>
                                        {profile.role !== "Citizen" && (
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${profile.is_approved
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}>
                                                {profile.is_approved ? "Approved" : "Pending Approval"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-blue-100 mt-1">
                                    Member since {new Date(profile.date_joined).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div className="p-6">
                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                                <FaEnvelope className="text-green-600 text-xl" />
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-semibold text-gray-800">
                                        {profile.email || "Not provided"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                                <FaPhone className="text-blue-600 text-xl" />
                                <div>
                                    <p className="text-sm text-gray-600">Phone</p>
                                    {editMode && isOwnProfile ? (
                                        <input
                                            type="text"
                                            name="phone_number"
                                            value={formData.phone_number}
                                            onChange={handleChange}
                                            className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                            placeholder="Add phone number"
                                        />
                                    ) : (
                                        <p className="font-semibold text-gray-800">
                                            {profile.phone_number || "Not provided"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bio Section */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                <FaUser className="mr-2 text-green-600" />
                                About
                            </h3>
                            {editMode && isOwnProfile ? (
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows="4"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-700 whitespace-pre-line">
                                        {profile.bio || "No bio added yet. Share something about yourself!"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Rating Section for Workers */}
                        {profile.role === "Worker" && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                    <FaStar className="mr-2 text-yellow-500" />
                                    Rating
                                </h3>
                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() =>
                                                    currentUser?.role === "Citizen" &&
                                                    !isOwnProfile &&
                                                    handleRate(star)
                                                }
                                                disabled={isOwnProfile || currentUser?.role !== "Citizen"}
                                                className={`text-2xl ${star <= (selectedRating || profile.rating || 0)
                                                        ? "text-yellow-500"
                                                        : "text-gray-300"
                                                    } ${currentUser?.role === "Citizen" &&
                                                        !isOwnProfile
                                                        ? "cursor-pointer hover:text-yellow-400 transition-colors"
                                                        : "cursor-default"
                                                    }`}
                                            >
                                                <FaStar />
                                            </button>
                                        ))}
                                        <span className="text-lg font-semibold text-gray-700 ml-2">
                                            ({(profile.rating || 0).toFixed(1)}/5)
                                        </span>
                                        {profile.rating_count > 0 && (
                                            <span className="text-sm text-gray-500">
                                                ({profile.rating_count || 0} ratings)
                                            </span>
                                        )}
                                    </div>
                                    {currentUser?.role === "Citizen" && !isOwnProfile ? (
                                        <p className="text-sm text-gray-600">
                                            Click on stars to rate this worker
                                        </p>
                                    ) : currentUser?.role !== "Citizen" && !isOwnProfile ? (
                                        <p className="text-sm text-gray-600">
                                            Only citizens can rate workers
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {/* Admin Actions */}
                        {currentUser?.role === "Admin" && profile.role === "Worker" && !isOwnProfile && (
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Admin Actions</h3>
                                <div className="flex space-x-3">
                                    {!profile.is_approved ? (
                                        <button
                                            onClick={handleApprove}
                                            className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                                        >
                                            <FaCheckCircle />
                                            <span>Approve Worker</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleUnapprove}
                                            className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                            <FaTimesCircle />
                                            <span>Unapprove Worker</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {isOwnProfile && (
                            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-200">
                                {editMode ? (
                                    <>
                                        <button
                                            onClick={handleSave}
                                            className="flex items-center justify-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                                        >
                                            <FaSave />
                                            <span>Save Changes</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditMode(false);
                                                setFormData({
                                                    bio: profile.bio || "",
                                                    phone_number: profile.phone_number || ""
                                                });
                                            }}
                                            className="flex items-center justify-center space-x-2 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                                        >
                                            <FaTimes />
                                            <span>Cancel</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="flex items-center justify-center space-x-2 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                                    >
                                        <FaEdit />
                                        <span>Edit Profile</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Message */}
                {message && (
                    <div className={`mt-4 p-4 rounded-lg text-center font-semibold ${message.includes("✅") || message.includes("Rated") || message.includes("approved")
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-red-100 text-red-800 border border-red-200"
                        }`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
import { useEffect, useState } from "react";
import axios from "axios";
import { FaStar } from "react-icons/fa";
import ImageCropper from "../components/Crop";
import { getCroppedImg } from "../utils/cropImage";

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [preview, setPreview] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [message, setMessage] = useState("");
    const [formData, setFormData] = useState({});
    const [selectedRating, setSelectedRating] = useState(0);
    const token = localStorage.getItem("access");

    // Crop states
    const [cropModal, setCropModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [originalImageFile, setOriginalImageFile] = useState(null); // Store original file for recropping

    // Fetch logged-in user
    useEffect(() => {
        if (token) {
            axios
                .get("http://127.0.0.1:8000/api/users/me/", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => setCurrentUser(res.data))
                .catch(() => console.warn("Could not fetch current user"));
        }
    }, []);

    // Fetch user profile
    useEffect(() => {
        if (!token) {
            setMessage("❌ Please login first");
            return;
        }
        axios
            .get("http://127.0.0.1:8000/api/users/profile/", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setProfile(res.data);
                setFormData(res.data);
                // Set initial preview from profile
                if (res.data.profile_picture) {
                    setPreview(`http://127.0.0.1:8000${res.data.profile_picture}`);
                }
            })
            .catch(() => setMessage("❌ Could not load profile"));
    }, []);

    // Input change handler
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // File select - store original file and open crop modal
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setOriginalImageFile(file); // Store original file for recropping
        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        setCropModal(true);
    };

    // Open crop modal with current image (for recropping)
    const handleRecropImage = () => {
        if (originalImageFile) {
            // If we have the original file, use it
            const imageUrl = URL.createObjectURL(originalImageFile);
            setSelectedImage(imageUrl);
            setCropModal(true);
        } else if (preview) {
            // If no original file but we have preview, use preview
            setSelectedImage(preview);
            setCropModal(true);
        } else if (profile?.profile_picture) {
            // Use the existing profile picture
            setSelectedImage(`http://127.0.0.1:8000${profile.profile_picture}`);
            setCropModal(true);
        }
    };

    // Crop confirm
    const handleCropConfirm = async (croppedBlob) => {
        const fileWithName = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });
        setFormData({ ...formData, profile_picture: fileWithName });
        setPreview(URL.createObjectURL(fileWithName));
        setCropModal(false);
        setSelectedImage(null);

        // Don't clear originalImageFile so user can recrop
    };

    // Save profile
    const handleSave = async () => {
        const form = new FormData();
        for (const key in formData) {
            form.append(key, formData[key]);
        }

        try {
            await axios.put("http://127.0.0.1:8000/api/users/profile/", form, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            });
            setMessage("✅ Profile updated successfully!");
            setEditMode(false);
            // Clear original file after successful save to avoid confusion
            setOriginalImageFile(null);
        } catch (err) {
            console.error(err);
            setMessage(
                err.response?.data?.detail || "❌ Failed to update profile"
            );
        }
    };

    // Cancel edit mode - reset states
    const handleCancelEdit = () => {
        setEditMode(false);
        setFormData(profile);
        setPreview(profile?.profile_picture ? `http://127.0.0.1:8000${profile.profile_picture}` : null);
        setOriginalImageFile(null);
    };

    // Rate worker
    const handleRate = async (ratingValue) => {
        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/workers/${profile.id}/rate/`,
                { rating: ratingValue },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage(res.data.message);
            setProfile((prev) => ({ ...prev, rating: res.data.new_average }));
        } catch (err) {
            setMessage(err.response?.data?.detail || "❌ Failed to rate worker");
        }
    };

    // Logout
    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/";
    };

    if (!profile)
        return (
            <p className="text-gray-600 text-center mt-20">
                {message || "Loading..."}
            </p>
        );

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
                <h1 className="text-3xl font-bold text-green-600 text-center mb-6">
                    👤 {profile.role === "Worker" ? "Worker" : "User"} Profile
                </h1>

                {/* Profile Picture */}
                <div className="flex flex-col items-center mb-6">
                    <div
                        className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-green-400 shadow cursor-pointer"
                        onClick={handleRecropImage}
                    >
                        <img
                            src={
                                preview ||
                                (profile.profile_picture
                                    ? `http://127.0.0.1:8000${profile.profile_picture}`
                                    : "https://via.placeholder.com/150")
                            }
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                        {editMode && (
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center text-white text-sm">
                                Click to recrop
                            </div>
                        )}
                    </div>

                    {editMode && (
                        <div className="mt-3 flex flex-col items-center space-y-2">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="text-sm text-gray-600"
                            />

                        </div>
                    )}
                </div>

                {/* Crop Modal */}
                {cropModal && selectedImage && (
                    <ImageCropper
                        imageSrc={selectedImage}
                        onCropDone={handleCropConfirm}
                        onCancel={() => setCropModal(false)}
                    />
                )}

                {/* Profile Info */}
                <div className="space-y-4">
                    <div>
                        <label className="font-semibold text-gray-700">Username:</label>
                        <p className="text-gray-800">{profile.username || "N/A"}</p>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700">Role:</label>
                        <p className="text-gray-800">{profile.role}</p>
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700">Email:</label>
                        {editMode ? (
                            <input
                                name="email"
                                value={formData.email || ""}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            />
                        ) : (
                            <p className="text-gray-800">{profile.email || "Not provided"}</p>
                        )}
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700">Phone:</label>
                        {editMode ? (
                            <input
                                name="phone_number"
                                value={formData.phone_number || ""}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            />
                        ) : (
                            <p className="text-gray-800">{profile.phone_number || "Not provided"}</p>
                        )}
                    </div>
                    <div>
                        <label className="font-semibold text-gray-700">Bio:</label>
                        {editMode ? (
                            <textarea
                                name="bio"
                                value={formData.bio || ""}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            />
                        ) : (
                            <p className="text-gray-800 whitespace-pre-line">
                                {profile.bio || "No bio added yet"}
                            </p>
                        )}
                    </div>

                    {/* ⭐ Worker Rating */}
                    {profile.role === "Worker" && (
                        <div>
                            <label className="font-semibold text-gray-700">Rating:</label>
                            <div className="flex items-center space-x-1 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <FaStar
                                        key={star}
                                        onClick={() =>
                                            currentUser?.role === "Citizen" && handleRate(star)
                                        }
                                        className={`cursor-pointer ${star <= (selectedRating || profile.rating)
                                            ? "text-yellow-400"
                                            : "text-gray-300"
                                            }`}
                                    />
                                ))}
                                <span className="text-gray-600 ml-2">
                                    ({profile.rating?.toFixed(1) || 0}/5)
                                </span>
                            </div>
                            {currentUser?.role !== "Citizen" && (
                                <p className="text-sm text-gray-500 mt-1 mb-3.5">
                                    Only citizens can rate workers.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {profile.role === "Admin" && (
                    <div className="mt-6 flex justify-center">
                        <div className="p-6 border border-green-300 rounded-xl bg-green-50 shadow-md text-center max-w-sm">
                            <h2 className="text-lg font-semibold text-green-700 mb-2">
                                Admin Portal
                            </h2>
                            <p className="text-sm text-gray-600 mb-4">
                                Manage users, complaints, and approvals from your dashboard.
                            </p>
                            <button
                                onClick={() => (window.location.href = "http://localhost:5173/admin-dashboard")}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
                            >
                                Open Admin Dashboard
                            </button>
                        </div>
                    </div>
                )}


                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-8 flex-wrap gap-4">
                    <div className="flex items-center space-x-3">
                        {editMode ? (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-all"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setEditMode(true)}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-all"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition-all"
                    >
                        Logout
                    </button>
                </div>

                {message && <p className="text-center text-gray-600 mt-4">{message}</p>}
            </div>
        </div>
    );
}
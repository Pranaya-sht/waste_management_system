import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    Plus,
    AlertCircle,
    CheckCircle,
    Info,
    Loader,
    MapPin,
    Clock,
    AlertTriangle,
    Image as ImageIcon,
    X,
    Upload,
    Search,
    Star
} from "lucide-react";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from "react-router-dom";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ProfessionalComplaintPortal = ({ complaint, user }) => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [assigning, setAssigning] = useState({});
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // New state for rating system
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    const [form, setForm] = useState({
        title: "",
        description: "",
        waste_type: "",
        quantity: "Light",
        location: "",
        landmark: "",
        desired_cleanup_time: "",
        location_lat: null,
        location_lng: null,
        picture: null,
        video: null,
    });

    const token = localStorage.getItem("access");

    const api = axios.create({
        baseURL: "http://127.0.0.1:8000/api",
        headers: { Authorization: `Bearer ${token}` },
    });
    const navigate = useNavigate();

    // Rating Functions
    const handleOpenRatingModal = (complaint) => {
        setSelectedComplaint(complaint);
        setRating(0);
        setComment("");
        setShowRatingModal(true);
    };

    const submitRating = async () => {
        if (!rating) {
            showToast("Please select a rating", "warning");
            return;
        }

        try {
            setSubmittingRating(true);
            await api.post(`/complaints/${selectedComplaint.id}/rate_worker/`, {
                rating: rating,
                comment: comment
            });

            showToast("Rating submitted successfully!", "success");
            setShowRatingModal(false);
            setSelectedComplaint(null);
            setRating(0);
            setComment("");
            fetchData();
        } catch (err) {
            console.error("Error submitting rating:", err.response?.data || err);
            const errorMsg = err.response?.data?.error || "Error submitting rating";
            showToast(errorMsg, "error");
        } finally {
            setSubmittingRating(false);
        }
    };

    // Star Rating Component
    const StarRating = ({ rating, setRating, hoverRating, setHoverRating }) => {
        return (
            <div className="flex justify-center space-x-2 my-4">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className={`text-3xl ${star <= (hoverRating || rating)
                            ? "text-yellow-400"
                            : "text-gray-300"
                            } transition-colors duration-200`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                    >
                        ★
                    </button>
                ))}
            </div>
        );
    };

    // Map Functions
    function MapClickHandler({ onLocationSelect }) {
        useMapEvents({
            click: (e) => {
                const { lat, lng } = e.latlng;
                onLocationSelect(lat, lng);
            },
        });
        return null;
    }

    // Toast Notification
    const showToast = (text, type = "info") => {
        setMessage({ text, type });
        setTimeout(() => setMessage(""), 4000);
    };

    // Data Fetching
    const fetchData = async () => {
        try {
            const [complaintsRes, statsRes] = await Promise.all([
                api.get("/complaints/"),
                api.get("/complaints/stats/")
            ]);
            console.log("Complaints data:", complaintsRes.data);
            console.log("Stats:", statsRes.data);

            setComplaints(complaintsRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error("Error loading data:", err);
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
        }
    };

    // Location Search Functions
    const searchLocation = async (query) => {
        if (!query.trim()) return;

        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error("Error searching location:", error);
            showToast("Error searching location", "error");
        } finally {
            setSearching(false);
        }
    };

    const handleLocationSelect = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();

            const address = data.display_name || "Selected location";

            setForm(prev => ({
                ...prev,
                location: address,
                location_lat: lat,
                location_lng: lng
            }));

            setShowMap(false);
            showToast("Location selected successfully!", "success");
        } catch (error) {
            console.error("Error getting address:", error);
            setForm(prev => ({
                ...prev,
                location: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                location_lat: lat,
                location_lng: lng
            }));
            setShowMap(false);
        }
    };

    const selectSearchResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        setForm(prev => ({
            ...prev,
            location: result.display_name,
            location_lat: lat,
            location_lng: lng
        }));

        setSearchResults([]);
        setSearchQuery("");
        setShowMap(false);
        showToast("Location selected!", "success");
    };

    // File Handling Functions
    const handlePictureChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            showToast("File exceeds 20MB", "warning");
            return;
        }
        if (!file.type.startsWith("image/")) {
            showToast("Please select an image file", "warning");
            return;
        }

        setForm(prev => ({
            ...prev,
            picture: file
        }));
    };

    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            showToast("File exceeds 20MB", "warning");
            return;
        }
        if (!file.type.startsWith("video/")) {
            showToast("Please select a video file", "warning");
            return;
        }

        setForm(prev => ({
            ...prev,
            video: file
        }));
    };

    const removePicture = () => {
        setForm(prev => ({
            ...prev,
            picture: null
        }));
    };

    const removeVideo = () => {
        setForm(prev => ({
            ...prev,
            video: null
        }));
    };

    // Complaint Submission
    const submitComplaint = async () => {
        if (!form.title || !form.description || !form.waste_type) {
            return showToast("Please fill all required fields", "warning");
        }

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('waste_type', form.waste_type);
        formData.append('quantity', form.quantity);
        formData.append('location', form.location);
        formData.append('landmark', form.landmark);

        if (form.desired_cleanup_time) {
            formData.append('desired_cleanup_time', form.desired_cleanup_time);
        }

        if (form.location_lat && form.location_lng) {
            formData.append('location_lat', form.location_lat);
            formData.append('location_lng', form.location_lng);
        }

        if (form.picture) {
            formData.append('picture', form.picture);
        }
        if (form.video) {
            formData.append('video', form.video);
        }

        // Debug: Log form data
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }

        try {
            setUploading(true);
            const response = await api.post("/complaints/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            console.log("Response:", response.data);
            showToast("Complaint submitted successfully!", "success");
            setForm({
                title: "",
                description: "",
                waste_type: "",
                quantity: "Light",
                location: "",
                landmark: "",
                desired_cleanup_time: "",
                location_lat: null,
                location_lng: null,
                picture: null,
                video: null
            });
            setShowForm(false);
            fetchData();
        } catch (err) {
            console.error("Submission error:", err.response?.data || err);
            showToast("Error submitting complaint", "error");
        } finally {
            setUploading(false);
        }
    };

    // Worker Assignment
    const assignWorkers = async (complaintId) => {
        const selectedIds = Object.entries(assigning)
            .filter(([_, checked]) => checked)
            .map(([id]) => parseInt(id));

        if (selectedIds.length === 0) {
            showToast("Select at least one worker", "warning");
            return;
        }

        try {
            await api.post(`/complaints/${complaintId}/assign_workers/`, {
                worker_ids: selectedIds,
            });
            showToast("Workers assigned successfully!", "success");
            setAssigning({});
            fetchData();
        } catch (err) {
            showToast("Error assigning workers", "error");
        }
    };

    // Communication
    const handleCommunicate = (complaint) => {
        console.log("Initiating communication for complaint:")
        const targetUser = complaint.assigned_to || complaint.citizen;

        if (!targetUser) {
            alert("No user assigned to this complaint yet.");
            return;
        }

        if (!targetUser.id || !targetUser.username) {
            console.warn("Invalid target user data:", targetUser);
            alert("Cannot start chat — user info is incomplete.");
            return;
        }

        navigate(`/chat/${targetUser.id}`, {
            state: {
                username: targetUser.username,
                complaintId: complaint.id,
            },
        });
    };

    // Status Color Helper
    const getStatusColor = (status) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            under_review: "bg-blue-100 text-blue-800 border-blue-200",
            in_progress: "bg-purple-100 text-purple-800 border-purple-200",
            resolved: "bg-green-100 text-green-800 border-green-200",
            rejected: "bg-red-100 text-red-800 border-red-200",
            expired: "bg-gray-100 text-gray-800 border-gray-200",
        };
        return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader className="animate-spin h-8 w-8 text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Citizen Complaint Portal
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Report civic issues and track their resolution in real-time. Together we can build a better community.
                    </p>
                </div>

                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.total_complaints}</div>
                            <div className="text-gray-600">Total Complaints</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                            <div className="text-gray-600">Resolved</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.in_progress}</div>
                            <div className="text-gray-600">In Progress</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.resolution_rate}%</div>
                            <div className="text-gray-600">Resolution Rate</div>
                        </div>
                    </div>
                )}

                {message.text && (
                    <div className={`flex items-center p-4 mb-6 rounded-lg border ${message.type === "success" ? "bg-green-50 text-green-800 border-green-200" :
                        message.type === "error" ? "bg-red-50 text-red-800 border-red-200" :
                            "bg-blue-50 text-blue-800 border-blue-200"
                        }`}>
                        {message.type === "success" ? <CheckCircle className="h-5 w-5 mr-2" /> :
                            message.type === "error" ? <AlertCircle className="h-5 w-5 mr-2" /> :
                                <Info className="h-5 w-5 mr-2" />}
                        {message.text}
                    </div>
                )}

                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-semibold text-gray-800">Your Complaints</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        <Plus className="h-5 w-5" />
                        File New Complaint
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">File New Complaint</h3>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Complaint Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Brief description of the issue"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Waste Type *
                                    </label>
                                    <select
                                        value={form.waste_type}
                                        onChange={(e) => setForm({ ...form, waste_type: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select waste type</option>
                                        <option value="Organic">Organic</option>
                                        <option value="Plastic">Plastic</option>
                                        <option value="Construction">Construction</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Quantity
                                    </label>
                                    <select
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Light">Light</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Heavy">Heavy</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Clock className="inline h-4 w-4 mr-1" /> Desired Cleanup Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.desired_cleanup_time}
                                        onChange={(e) => setForm({ ...form, desired_cleanup_time: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Choose a preferred date and time for the issue to be resolved.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Detailed Description *
                                    </label>
                                    <textarea
                                        placeholder="Please provide detailed information about the issue..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        rows={6}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <MapPin className="inline h-4 w-4 mr-1" />
                                        Location
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search or click on map to select location"
                                                value={form.location}
                                                onChange={(e) => setForm({ ...form, location: e.target.value })}
                                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowMap(true)}
                                                className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <MapPin className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search for location..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <button
                                                    onClick={() => searchLocation(searchQuery)}
                                                    disabled={searching}
                                                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                                                >
                                                    {searching ? <Loader className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {searchResults.map((result, index) => (
                                                        <div
                                                            key={index}
                                                            className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                                                            onClick={() => selectSearchResult(result)}
                                                        >
                                                            <div className="font-medium">{result.display_name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Landmark
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nearby landmark for easy identification"
                                        value={form.landmark}
                                        onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <ImageIcon className="inline h-4 w-4 mr-1" />
                                            Picture
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePictureChange}
                                                className="hidden"
                                                id="picture-upload"
                                            />
                                            <label
                                                htmlFor="picture-upload"
                                                className="cursor-pointer flex flex-col items-center"
                                            >
                                                <Upload className="h-6 w-6 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600">
                                                    Upload Image
                                                </span>
                                            </label>
                                        </div>
                                        {form.picture && (
                                            <div className="mt-2 relative">
                                                <img
                                                    src={URL.createObjectURL(form.picture)}
                                                    alt="Preview"
                                                    className="w-full h-20 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={removePicture}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <ImageIcon className="inline h-4 w-4 mr-1" />
                                            Video
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleVideoChange}
                                                className="hidden"
                                                id="video-upload"
                                            />
                                            <label
                                                htmlFor="video-upload"
                                                className="cursor-pointer flex flex-col items-center"
                                            >
                                                <Upload className="h-6 w-6 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600">
                                                    Upload Video
                                                </span>
                                            </label>
                                        </div>
                                        {form.video && (
                                            <div className="mt-2 relative">
                                                <video
                                                    src={URL.createObjectURL(form.video)}
                                                    controls
                                                    className="w-full h-20 object-cover rounded-lg"
                                                />
                                                <button
                                                    onClick={removeVideo}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-gray-200">
                            <button
                                onClick={submitComplaint}
                                disabled={uploading}
                                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {uploading ? <Loader className="animate-spin h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                Submit Complaint
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {showMap && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh]">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-2xl font-bold text-gray-900">Select Location on Map</h3>
                                <button
                                    onClick={() => setShowMap(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="h-full p-6">
                                <MapContainer
                                    center={[28.6139, 77.2090]}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <MapClickHandler onLocationSelect={handleLocationSelect} />
                                    {form.location_lat && form.location_lng && (
                                        <Marker position={[form.location_lat, form.location_lng]}>
                                            <Popup>
                                                Selected Location: {form.location}
                                            </Popup>
                                        </Marker>
                                    )}
                                </MapContainer>
                            </div>
                            <div className="p-6 border-t border-gray-200">
                                <p className="text-sm text-gray-600 mb-4">
                                    Click anywhere on the map to select the location. The address will be automatically detected.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowMap(false)}
                                        className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => setShowMap(false)}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Confirm Selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {complaints.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
                            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
                            <p className="text-gray-600">No complaints filed yet. File a new complaint to get started.</p>
                        </div>
                    ) : (
                        complaints.map(complaint => (
                            <div key={complaint.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-lg font-bold text-gray-900">{complaint.title}</h4>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(complaint.status)}`}>
                                        {complaint.status.replace("_", " ")}
                                    </span>
                                </div>
                                <div className="flex gap-4 text-sm text-gray-500 mb-3">
                                    <span>Waste: {complaint.waste_type}</span>
                                    <span>Quantity: {complaint.quantity}</span>
                                    {complaint.location && <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{complaint.location}</span>}
                                    {complaint.landmark && <span>Landmark: {complaint.landmark}</span>}
                                    {complaint.desired_cleanup_time && <span>Cleanup: {new Date(complaint.desired_cleanup_time).toLocaleString()}</span>}
                                </div>
                                <p className="text-gray-700 mb-3">{complaint.description}</p>

                                {complaint.location_lat && complaint.location_lng && (
                                    <div className="text-sm text-gray-500 mb-3">
                                        Coordinates: {complaint.location_lat.toFixed(4)}, {complaint.location_lng.toFixed(4)}
                                    </div>
                                )}

                                <div className="flex gap-4 mb-3">
                                    {complaint.picture_url && (
                                        <div>
                                            <img src={complaint.picture_url} alt="Complaint" className="w-32 h-32 object-cover rounded-lg" />
                                        </div>
                                    )}
                                    {complaint.video_url && (
                                        <div>
                                            <video src={complaint.video_url} controls className="w-32 h-32 object-cover rounded-lg" />
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-4">
                                    <button
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                                        onClick={() => handleCommunicate(complaint)}
                                    >
                                        Communicate
                                    </button>

                                    {/* Rate Worker Button - Only show for completed complaints */}
                                    {complaint.status === "Completed" && complaint.assigned_worker && (
                                        <button
                                            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors flex items-center gap-2"
                                            onClick={() => handleOpenRatingModal(complaint)}
                                        >
                                            <Star className="h-4 w-4" />
                                            Rate Worker
                                        </button>
                                    )}

                                    {/* Existing assign workers section */}
                                    {complaint.status === "pending" && complaint.available_workers?.length > 0 && (
                                        <div className="ml-auto">
                                            <div className="text-sm font-medium text-gray-700 mb-2">Assign Workers:</div>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {complaint.available_workers.map(worker => (
                                                    <label key={worker.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg cursor-pointer hover:bg-gray-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={assigning[worker.id] || false}
                                                            onChange={(e) => setAssigning(prev => ({ ...prev, [worker.id]: e.target.checked }))}
                                                            className="accent-blue-600"
                                                        />
                                                        {worker.name}
                                                    </label>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => assignWorkers(complaint.id)}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Assign Selected
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Rating Modal */}
                {showRatingModal && selectedComplaint && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-2xl font-bold text-gray-900">Rate Worker</h3>
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="text-center mb-4">
                                    <p className="text-gray-700 mb-2">
                                        How would you rate the work done by <strong>{selectedComplaint.assigned_worker?.username}</strong>?
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        For complaint: "{selectedComplaint.title}"
                                    </p>
                                </div>

                                <StarRating
                                    rating={rating}
                                    setRating={setRating}
                                    hoverRating={hoverRating}
                                    setHoverRating={setHoverRating}
                                />

                                <div className="text-center mb-4">
                                    <span className="text-lg font-semibold text-gray-700">
                                        {rating > 0 ? `${rating} Star${rating > 1 ? 's' : ''}` : "Select Rating"}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Comments (Optional)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your experience with this worker..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 border-t border-gray-200">
                                <button
                                    onClick={submitRating}
                                    disabled={submittingRating || rating === 0}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submittingRating ? (
                                        <Loader className="animate-spin h-4 w-4" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4" />
                                    )}
                                    {submittingRating ? "Submitting..." : "Submit Rating"}
                                </button>
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfessionalComplaintPortal;
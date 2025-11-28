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
    Star,
    Calendar,
    Navigation
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

// Custom marker icon
const customIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Nepal coordinates (centered on Kathmandu)
const NEPAL_CENTER = [27.7172, 85.3240];
const NEPAL_BOUNDS = [
    [26.347, 80.058], // Southwest coordinates
    [30.447, 88.201]  // Northeast coordinates
];

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
    const [formErrors, setFormErrors] = useState({});

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

    // Get minimum datetime for calendar (current time + 5 hours)
    const getMinDateTime = () => {
        const now = new Date();
        now.setHours(now.getHours() + 5); // Add 5 hour buffer
        return now.toISOString().slice(0, 16);
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Validate form
    const validateForm = () => {
        const errors = {};

        if (!form.title.trim()) errors.title = "Title is required";
        if (!form.description.trim()) errors.description = "Description is required";
        if (!form.waste_type) errors.waste_type = "Waste type is required";
        if (!form.location.trim() || !form.location_lat || !form.location_lng) {
            errors.location = "Please select a location from the map";
        }
        if (form.desired_cleanup_time) {
            const selectedDate = new Date(form.desired_cleanup_time);
            const minDate = new Date(getMinDateTime());
            if (selectedDate < minDate) {
                errors.desired_cleanup_time = "Please select a date and time at least 5 hours from now";
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

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
                        className={`text-3xl transition-all duration-300 transform hover:scale-110 ${star <= (hoverRating || rating)
                            ? "text-yellow-400 drop-shadow-lg"
                            : "text-gray-300"
                            }`}
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

    // Map Bounds Handler to restrict to Nepal
    function MapBoundsHandler() {
        const map = useMapEvents({
            load: () => {
                // Set max bounds to Nepal
                map.setMaxBounds(NEPAL_BOUNDS);

                // If user tries to pan outside Nepal, bring them back
                map.on('drag', () => {
                    map.panInsideBounds(NEPAL_BOUNDS, { animate: true });
                });
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

    // Location Search Functions - Focus on Nepal
    const searchLocation = async (query) => {
        if (!query.trim()) return;

        setSearching(true);
        try {
            // Add Nepal boundary to search to prioritize results in Nepal
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=np&limit=5&viewbox=80.058,30.447,88.201,26.347&bounded=1`
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

            setFormErrors(prev => ({ ...prev, location: "" }));
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
            setFormErrors(prev => ({ ...prev, location: "" }));
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

        setFormErrors(prev => ({ ...prev, location: "" }));
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
        if (!validateForm()) {
            showToast("Please fix the errors in the form", "warning");
            return;
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
            setFormErrors({});
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

        navigate(`/chat/${complaint.id}`, {
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading your complaints...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-6">
                        <Navigation className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        Citizen Complaint Portal
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        Report civic issues and track their resolution in real-time. Together we can build a cleaner, better community in Nepal.
                    </p>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {[
                            { value: stats.total_complaints, label: "Total Complaints", color: "from-blue-500 to-blue-600" },
                            { value: stats.completed, label: "Resolved", color: "from-green-500 to-green-600" },
                            { value: stats.in_progress, label: "In Progress", color: "from-purple-500 to-purple-600" },
                            { value: `${stats.resolution_rate}%`, label: "Resolution Rate", color: "from-orange-500 to-orange-600" }
                        ].map((stat, index) => (
                            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                <div className={`bg-gradient-to-r ${stat.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-md`}>
                                    <CheckCircle className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                                <div className="text-gray-600 font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Toast Notification */}
                {message.text && (
                    <div className={`flex items-center p-4 mb-8 rounded-2xl border-2 shadow-lg ${message.type === "success" ? "bg-green-50 text-green-800 border-green-200" :
                        message.type === "error" ? "bg-red-50 text-red-800 border-red-200" :
                            "bg-blue-50 text-blue-800 border-blue-200"
                        }`}>
                        {message.type === "success" ? <CheckCircle className="h-6 w-6 mr-3" /> :
                            message.type === "error" ? <AlertCircle className="h-6 w-6 mr-3" /> :
                                <Info className="h-6 w-6 mr-3" />}
                        <span className="font-semibold">{message.text}</span>
                    </div>
                )}

                {/* Header with New Complaint Button */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Your Complaints</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold group"
                    >
                        <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                        File New Complaint
                    </button>
                </div>

                {/* Complaint Form */}
                {showForm && (
                    <div className="bg-white rounded-3xl shadow-2xl p-8 mb-12 border border-gray-200 backdrop-blur-sm bg-opacity-95">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-2">File New Complaint</h3>
                                <p className="text-gray-600">Fill in the details below to report a new issue </p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-xl p-2"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column */}
                            <div className="space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Complaint Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Brief description of the issue"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${formErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    {formErrors.title && (
                                        <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {formErrors.title}
                                        </p>
                                    )}
                                </div>

                                {/* Waste Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Waste Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.waste_type}
                                        onChange={(e) => setForm({ ...form, waste_type: e.target.value })}
                                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.waste_type ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    >
                                        <option value="">Select waste type</option>
                                        <option value="Organic">Organic</option>
                                        <option value="Plastic">Plastic</option>
                                        <option value="Construction">Construction</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {formErrors.waste_type && (
                                        <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {formErrors.waste_type}
                                        </p>
                                    )}
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Quantity
                                    </label>
                                    <select
                                        value={form.quantity}
                                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="Light">Light</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Heavy">Heavy</option>
                                    </select>
                                </div>

                                {/* Desired Cleanup Time */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        <Clock className="inline h-4 w-4 mr-2" />
                                        Desired Cleanup Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        min={getMinDateTime()}
                                        value={form.desired_cleanup_time}
                                        onChange={(e) => setForm({ ...form, desired_cleanup_time: e.target.value })}
                                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${formErrors.desired_cleanup_time ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <Info className="h-3 w-3" />
                                        Choose a date and time at least 5 hours from now for cleanup
                                    </p>
                                    {formErrors.desired_cleanup_time && (
                                        <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {formErrors.desired_cleanup_time}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Detailed Description <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        placeholder="Please provide detailed information about the issue..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        rows={6}
                                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${formErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    {formErrors.description && (
                                        <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                                            <AlertCircle className="h-4 w-4" />
                                            {formErrors.description}
                                        </p>
                                    )}
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        <MapPin className="inline h-4 w-4 mr-2" />
                                        Location  <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-3">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Selected location will appear here"
                                                    value={form.location}
                                                    readOnly
                                                    className={`w-full px-4 py-3 border-2 rounded-xl bg-gray-50 ${formErrors.location ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowMap(true)}
                                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                                            >
                                                <MapPin className="h-5 w-5" />
                                            </button>
                                        </div>

                                        {form.location_lat && form.location_lng && (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                                <div className="flex items-center gap-2 text-green-800">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Location selected </span>
                                                </div>
                                                <div className="text-xs text-green-600 mt-1">
                                                    Coordinates: {form.location_lat.toFixed(6)}, {form.location_lng.toFixed(6)}
                                                </div>
                                            </div>
                                        )}

                                        {formErrors.location && (
                                            <p className="text-red-600 text-sm flex items-center gap-1">
                                                <AlertCircle className="h-4 w-4" />
                                                {formErrors.location}
                                            </p>
                                        )}

                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search for location "
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <button
                                                    onClick={() => searchLocation(searchQuery)}
                                                    disabled={searching}
                                                    className="bg-gray-600 text-white px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50 shadow-lg"
                                                >
                                                    {searching ? <Loader className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            {searchResults.length > 0 && (
                                                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-300 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                    {searchResults.map((result, index) => (
                                                        <div
                                                            key={index}
                                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 last:border-b-0 transition-colors"
                                                            onClick={() => selectSearchResult(result)}
                                                        >
                                                            <div className="font-medium text-gray-900">{result.display_name}</div>
                                                            <div className="text-xs text-gray-500 mt-1"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Landmark */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Landmark
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nearby landmark for easy identification"
                                        value={form.landmark}
                                        onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* File Uploads */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            <ImageIcon className="inline h-4 w-4 mr-2" />
                                            Picture
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
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
                                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600 font-medium">
                                                    Upload Image
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">Max 20MB</span>
                                            </label>
                                        </div>
                                        {form.picture && (
                                            <div className="mt-3 relative">
                                                <img
                                                    src={URL.createObjectURL(form.picture)}
                                                    alt="Preview"
                                                    className="w-full h-24 object-cover rounded-xl shadow-md"
                                                />
                                                <button
                                                    onClick={removePicture}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            <ImageIcon className="inline h-4 w-4 mr-2" />
                                            Video
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
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
                                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600 font-medium">
                                                    Upload Video
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">Max 20MB</span>
                                            </label>
                                        </div>
                                        {form.video && (
                                            <div className="mt-3 relative">
                                                <video
                                                    src={URL.createObjectURL(form.video)}
                                                    controls
                                                    className="w-full h-24 object-cover rounded-xl shadow-md"
                                                />
                                                <button
                                                    onClick={removeVideo}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex gap-4 pt-8 border-t border-gray-200 mt-8">
                            <button
                                onClick={submitComplaint}
                                disabled={uploading}
                                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 font-semibold flex-1 justify-center"
                            >
                                {uploading ? <Loader className="animate-spin h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                {uploading ? "Submitting..." : "Submit Complaint"}
                            </button>
                            <button
                                onClick={() => setShowForm(false)}
                                className="bg-gray-500 text-white px-8 py-4 rounded-2xl hover:bg-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Map Modal */}
                {showMap && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-2xl font-bold text-gray-900">Select Location </h3>
                                <button
                                    onClick={() => setShowMap(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-xl p-2"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="flex-1 p-6">
                                <MapContainer
                                    center={form.location_lat && form.location_lng ? [form.location_lat, form.location_lng] : NEPAL_CENTER}
                                    zoom={10}
                                    style={{ height: '100%', width: '100%', borderRadius: '12px' }}
                                    maxBounds={NEPAL_BOUNDS}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <MapClickHandler onLocationSelect={handleLocationSelect} />
                                    <MapBoundsHandler />
                                    {form.location_lat && form.location_lng && (
                                        <Marker position={[form.location_lat, form.location_lng]} icon={customIcon}>
                                            <Popup>
                                                Selected Location: {form.location}
                                            </Popup>
                                        </Marker>
                                    )}
                                </MapContainer>
                            </div>
                            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
                                <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    Click anywhere on the map to select the location. The address will be automatically detected.
                                </p>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowMap(false)}
                                        className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors font-semibold shadow-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => setShowMap(false)}
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold shadow-lg"
                                    >
                                        Confirm Selection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Complaints List */}
                <div className="space-y-6">
                    {complaints.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-lg border border-gray-200">
                            <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-6" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">No Complaints Yet</h3>
                            <p className="text-gray-600 max-w-md mx-auto mb-6">
                                You haven't filed any complaints yet. Start by filing your first complaint to help improve our community.
                            </p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                            >
                                File Your First Complaint
                            </button>
                        </div>
                    ) : (
                        complaints.map(complaint => (
                            <div key={complaint.id} className="bg-white p-8 rounded-3xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">{complaint.title}</h4>
                                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">Waste: {complaint.waste_type}</span>
                                            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">Quantity: {complaint.quantity}</span>
                                            {complaint.location && (
                                                <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-medium flex items-center">
                                                    <MapPin className="h-3 w-3 mr-1" />
                                                    {complaint.location.length > 30 ? complaint.location.substring(0, 30) + '...' : complaint.location}
                                                </span>
                                            )}
                                            {complaint.desired_cleanup_time && (
                                                <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
                                                    Cleanup: {formatDate(complaint.desired_cleanup_time)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(complaint.status)} shadow-sm`}>
                                        {complaint.status.replace("_", " ").toUpperCase()}
                                    </span>
                                </div>

                                <p className="text-gray-700 mb-4 leading-relaxed">{complaint.description}</p>

                                {complaint.landmark && (
                                    <div className="text-sm text-gray-600 mb-4">
                                        <strong>Landmark:</strong> {complaint.landmark}
                                    </div>
                                )}

                                {complaint.location_lat && complaint.location_lng && (
                                    <div className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl">
                                        <strong>Coordinates:</strong> {complaint.location_lat.toFixed(6)}, {complaint.location_lng.toFixed(6)}
                                    </div>
                                )}

                                <div className="flex gap-4 mb-4">
                                    {complaint.picture_url && (
                                        <div className="relative group">
                                            <img
                                                src={complaint.picture_url}
                                                alt="Complaint"
                                                className="w-32 h-32 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all" />
                                        </div>
                                    )}
                                    {complaint.video_url && (
                                        <div className="relative group">
                                            <video
                                                src={complaint.video_url}
                                                controls
                                                className="w-32 h-32 object-cover rounded-xl shadow-md group-hover:shadow-lg transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all" />
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                                        onClick={() => handleCommunicate(complaint)}
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                        Communicate
                                    </button>

                                    {/* Rate Worker Button - Only show for completed complaints */}
                                    {complaint.status === "resolved" && complaint.assigned_worker && (
                                        <button
                                            className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-xl hover:bg-yellow-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                                            onClick={() => handleOpenRatingModal(complaint)}
                                        >
                                            <Star className="h-4 w-4" />
                                            Rate Worker
                                        </button>
                                    )}

                                    {/* Existing assign workers section */}
                                    {complaint.status === "pending" && complaint.available_workers?.length > 0 && (
                                        <div className="ml-auto">
                                            <div className="text-sm font-semibold text-gray-700 mb-3">Assign Workers:</div>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {complaint.available_workers.map(worker => (
                                                    <label key={worker.id} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors shadow-sm">
                                                        <input
                                                            type="checkbox"
                                                            checked={assigning[worker.id] || false}
                                                            onChange={(e) => setAssigning(prev => ({ ...prev, [worker.id]: e.target.checked }))}
                                                            className="accent-blue-600 w-4 h-4"
                                                        />
                                                        <span className="font-medium">{worker.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => assignWorkers(complaint.id)}
                                                className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                                            >
                                                Assign Selected Workers
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
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                            <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                <h3 className="text-2xl font-bold text-gray-900">Rate Worker</h3>
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-xl p-2"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <Star className="h-8 w-8 text-white" />
                                    </div>
                                    <p className="text-gray-700 mb-2 text-lg">
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

                                <div className="text-center mb-6">
                                    <span className="text-xl font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-xl">
                                        {rating > 0 ? `${rating} Star${rating > 1 ? 's' : ''}` : "Select Rating"}
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Comments (Optional)
                                    </label>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Share your experience with this worker..."
                                        rows={4}
                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
                                <button
                                    onClick={submitRating}
                                    disabled={submittingRating || rating === 0}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                                >
                                    {submittingRating ? (
                                        <Loader className="animate-spin h-5 w-5" />
                                    ) : (
                                        <CheckCircle className="h-5 w-5" />
                                    )}
                                    {submittingRating ? "Submitting..." : "Submit Rating"}
                                </button>
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="flex-1 bg-gray-500 text-white py-4 rounded-xl hover:bg-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
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
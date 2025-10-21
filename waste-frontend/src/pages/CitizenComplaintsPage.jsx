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
    Search
} from "lucide-react";

// You'll need to install these map packages:
// npm install leaflet react-leaflet
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ProfessionalComplaintPortal = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [stats, setStats] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [assigning, setAssigning] = useState({});
    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        category: "",
        priority: "medium",
        location: "",
        landmark: "",
        location_lat: null,
        location_lng: null,
        media: []
    });

    const token = localStorage.getItem("access");

    const api = axios.create({
        baseURL: "http://127.0.0.1:8000/api",
        headers: { Authorization: `Bearer ${token}` },
    });

    // Map click handler component
    function MapClickHandler({ onLocationSelect }) {
        useMapEvents({
            click: (e) => {
                const { lat, lng } = e.latlng;
                onLocationSelect(lat, lng);
            },
        });
        return null;
    }

    const showToast = (text, type = "info") => {
        setMessage({ text, type });
        setTimeout(() => setMessage(""), 4000);
    };

    const fetchData = async () => {
        try {
            const [complaintsRes, categoriesRes, statsRes] = await Promise.all([
                api.get("/complaints/"),
                api.get("/complaints/categories/"),
                api.get("/complaints/stats/")
            ]);

            setComplaints(complaintsRes.data);
            setCategories(categoriesRes.data.categories);
            setPriorities(categoriesRes.data.priorities);
            setStats(statsRes.data);
        } catch (err) {
            showToast("Error loading data", "error");
        } finally {
            setLoading(false);
        }
    };

    // Search for location using Nominatim (OpenStreetMap)
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
            // Reverse geocoding to get address from coordinates
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
            // If reverse geocoding fails, still set the coordinates
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

    const handleMediaChange = (e) => {
        const files = Array.from(e.target.files);

        if (form.media.length + files.length > 5) {
            showToast("Maximum 5 files allowed", "warning");
            return;
        }

        const validFiles = files.filter(file => {
            if (file.size > 20 * 1024 * 1024) {
                showToast(`${file.name} exceeds 20MB`, "warning");
                return false;
            }
            if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
                showToast(`${file.name} is not a valid image or video`, "warning");
                return false;
            }
            return true;
        });

        setForm(prev => ({
            ...prev,
            media: [...prev.media, ...validFiles]
        }));
    };

    const removeMedia = (index) => {
        setForm(prev => ({
            ...prev,
            media: prev.media.filter((_, i) => i !== index)
        }));
    };

    const submitComplaint = async () => {
        if (!form.title || !form.description || !form.category) {
            return showToast("Please fill all required fields", "warning");
        }

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('category', form.category);
        formData.append('priority', form.priority);
        formData.append('location', form.location);
        formData.append('landmark', form.landmark);

        // Add coordinates if available
        if (form.location_lat && form.location_lng) {
            formData.append('location_lat', form.location_lat);
            formData.append('location_lng', form.location_lng);
        }

        // Append media files
        form.media.forEach((file, index) => {
            if (file.type.startsWith("image/")) {
                formData.append(`picture_${index + 1}`, file);
            } else if (file.type.startsWith("video/")) {
                formData.append(`video_${index + 1}`, file);
            }
        });

        try {
            setUploading(true);
            await api.post("/complaints/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            showToast("Complaint submitted successfully!", "success");
            setForm({
                title: "",
                description: "",
                category: "",
                priority: "medium",
                location: "",
                landmark: "",
                location_lat: null,
                location_lng: null,
                media: []
            });
            setShowForm(false);
            fetchData();
        } catch (err) {
            showToast("Error submitting complaint", "error");
            console.error("Submission error:", err);
        } finally {
            setUploading(false);
        }
    };

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

    useEffect(() => {
        fetchData();
    }, []);

    const getPriorityColor = (priority) => {
        const colors = {
            low: "bg-blue-100 text-blue-800 border-blue-200",
            medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
            high: "bg-orange-100 text-orange-800 border-orange-200",
            urgent: "bg-red-100 text-red-800 border-red-200",
        };
        return colors[priority] || "bg-gray-100 text-gray-800 border-gray-200";
    };

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

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader className="animate-spin h-8 w-8 text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header with Stats */}
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
                            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
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

                {/* Toast Message */}
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

                {/* Action Bar */}
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

                {/* Complaint Form */}
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
                                        <Clock className="inline h-4 w-4 mr-1" /> Desired Cleanup Time
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="datetime-local"
                                            value={form.desired_cleanup_time || ""}
                                            onChange={(e) => setForm({ ...form, desired_cleanup_time: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, desired_cleanup_time: "" })}
                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                            title="Clear"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Choose a preferred date and time for the issue to be resolved.
                                    </p>
                                </div>


                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select a category</option>
                                        {Object.entries(categories).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority Level
                                    </label>
                                    <select
                                        value={form.priority}
                                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {Object.entries(priorities).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
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

                                        {/* Search location */}
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

                                            {/* Search results */}
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
                                        rows={8}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <ImageIcon className="inline h-4 w-4 mr-1" />
                                        Attach Media (Images/Videos) Max 5
                                    </label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*,video/*"
                                            onChange={handleMediaChange}
                                            className="hidden"
                                            id="media-upload"
                                        />
                                        <label
                                            htmlFor="media-upload"
                                            className="cursor-pointer flex flex-col items-center"
                                        >
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-600">
                                                Click to upload images/videos or drag and drop
                                            </span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                Images: PNG, JPG, JPEG | Videos: MP4 up to 20MB
                                            </span>
                                        </label>
                                    </div>

                                    {form.media.length > 0 && (
                                        <div className="grid grid-cols-3 gap-2 mt-3">
                                            {form.media.map((file, index) => (
                                                <div key={index} className="relative group">
                                                    {file.type.startsWith("image/") ? (
                                                        <img
                                                            src={URL.createObjectURL(file)}
                                                            alt={`Preview ${index + 1}`}
                                                            className="w-full h-20 object-cover rounded-lg"
                                                        />
                                                    ) : (
                                                        <video
                                                            src={URL.createObjectURL(file)}
                                                            controls
                                                            className="w-full h-20 object-cover rounded-lg"
                                                        />
                                                    )}
                                                    <button
                                                        onClick={() => removeMedia(index)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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

                {/* Map Modal */}
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
                                    center={[28.6139, 77.2090]} // Default to Delhi
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

                {/* Complaints List */}
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
                                    <span>{complaint.category}</span>
                                    <span className={`font-semibold ${getPriorityColor(complaint.priority)}`}>{complaint.priority}</span>
                                    {complaint.location && <span className="flex items-center"><MapPin className="h-4 w-4 mr-1" />{complaint.location}</span>}
                                    {complaint.landmark && <span>Landmark: {complaint.landmark}</span>}
                                </div>
                                <p className="text-gray-700 mb-3">{complaint.description}</p>

                                {/* Show coordinates if available */}
                                {complaint.location_lat && complaint.location_lng && (
                                    <div className="text-sm text-gray-500 mb-3">
                                        Coordinates: {complaint.location_lat.toFixed(4)}, {complaint.location_lng.toFixed(4)}
                                    </div>
                                )}

                                {/* Media Preview */}
                                {complaint.media && complaint.media.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {complaint.media.map((file, idx) => (
                                            file.type.startsWith("image/") ? (
                                                <img key={idx} src={file.url} alt="media" className="w-full h-24 object-cover rounded-lg" />
                                            ) : (
                                                <video key={idx} src={file.url} controls className="w-full h-24 object-cover rounded-lg" />
                                            )
                                        ))}
                                    </div>
                                )}

                                {/* Worker Assignment Section */}
                                {complaint.status === "pending" && complaint.available_workers?.length > 0 && (
                                    <div className="mt-3">
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
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfessionalComplaintPortal;
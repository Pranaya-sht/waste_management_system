// src/components/WorkerComplaintCard.jsx
import React, { useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
    CheckCircle,
    XCircle,
    Clock,
    MapPin,
    User,
    Phone,
    Mail,
    AlertCircle,
    Loader,
    Image as ImageIcon,
    Video,
    Eye
} from "lucide-react";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const locationIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [30, 30],
});

const WorkerComplaintCard = ({ complaint, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [showMedia, setShowMedia] = useState({ picture: false, video: false });
    const [mediaErrors, setMediaErrors] = useState({ picture: false, video: false });
    const token = localStorage.getItem("access");

    const handleAccept = async () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    await axios.post(
                        `http://127.0.0.1:8000/api/complaints/${complaint.id}/accept/`,
                        { worker_lat: latitude, worker_lng: longitude },
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json"
                            }
                        }
                    );
                    onUpdate();
                } catch (err) {
                    console.error("Error accepting complaint:", err);
                    alert("Error accepting complaint. Please try again.");
                } finally {
                    setLoading(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Unable to get your location. Please enable location services.");
                setLoading(false);
            }
        );
    };

    const handleStatusUpdate = async (status) => {
        setStatusLoading(status);
        try {
            await axios.post(
                `http://127.0.0.1:8000/api/complaints/${complaint.id}/update_status/`,
                { status },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            onUpdate();
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Error updating status. Please try again.");
        } finally {
            setStatusLoading(false);
        }
    };

    // Fix for image URLs - check different possible URL formats
    const getPictureUrl = () => {
        if (!complaint.picture) return null;

        // If it's already a full URL
        if (complaint.picture.startsWith('http')) {
            return complaint.picture;
        }

        // If it's a relative path, construct the full URL
        if (complaint.picture.startsWith('/')) {
            return `http://127.0.0.1:8000${complaint.picture}`;
        }

        // If it's just a filename
        return `http://127.0.0.1:8000/media/${complaint.picture}`;
    };

    const getVideoUrl = () => {
        if (!complaint.video) return null;

        // If it's already a full URL
        if (complaint.video.startsWith('http')) {
            return complaint.video;
        }

        // If it's a relative path, construct the full URL
        if (complaint.video.startsWith('/')) {
            return `http://127.0.0.1:8000${complaint.video}`;
        }

        // If it's just a filename
        return `http://127.0.0.1:8000/media/${complaint.video}`;
    };

    // Use the URL methods or fall back to the URL fields from API
    const pictureUrl = getPictureUrl() || complaint.picture_url;
    const videoUrl = getVideoUrl() || complaint.video_url;

    const handleImageError = () => {
        setMediaErrors(prev => ({ ...prev, picture: true }));
    };

    const handleVideoError = () => {
        setMediaErrors(prev => ({ ...prev, video: true }));
    };

    const getStatusColor = (status) => {
        const colors = {
            Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            Accepted: "bg-blue-100 text-blue-800 border-blue-200",
            "In Progress": "bg-purple-100 text-purple-800 border-purple-200",
            Completed: "bg-green-100 text-green-800 border-green-200",
            reported: "bg-red-100 text-red-800 border-red-200",
            Incomplete: "bg-orange-100 text-orange-800 border-orange-200",
            Expired: "bg-gray-100 text-gray-800 border-gray-200",
        };
        return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
    };

    const getWasteTypeColor = (wasteType) => {
        const colors = {
            Organic: "bg-green-100 text-green-800",
            Plastic: "bg-blue-100 text-blue-800",
            Construction: "bg-orange-100 text-orange-800",
            Other: "bg-gray-100 text-gray-800",
        };
        return colors[wasteType] || "bg-gray-100 text-gray-800";
    };

    const getQuantityColor = (quantity) => {
        const colors = {
            Light: "bg-green-100 text-green-800",
            Medium: "bg-yellow-100 text-yellow-800",
            Heavy: "bg-red-100 text-red-800",
        };
        return colors[quantity] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{complaint.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(complaint.status)}`}>
                            {complaint.status}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWasteTypeColor(complaint.waste_type)}`}>
                            {complaint.waste_type}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getQuantityColor(complaint.quantity)}`}>
                            {complaint.quantity}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Description */}
                <div className="mb-6">
                    <p className="text-gray-700 leading-relaxed">{complaint.description}</p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Citizen Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <User className="h-4 w-4" />
                            Citizen Information
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Name:</span>
                                <span>{complaint.citizen?.username || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{complaint.citizen?.email || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{complaint.citizen?.phone_number || "Not provided"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Complaint Details */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <Clock className="h-4 w-4" />
                            Complaint Details
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                            {complaint.desired_cleanup_time && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Desired Cleanup:</span>
                                    <span>{new Date(complaint.desired_cleanup_time).toLocaleString()}</span>
                                </div>
                            )}
                            {complaint.landmark && (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Landmark:</span>
                                    <span>{complaint.landmark}</span>
                                </div>
                            )}
                            {complaint.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span className="line-clamp-1">{complaint.location}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Media Section - Only show if we have valid URLs and no errors */}
                {(pictureUrl || videoUrl) && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                            <ImageIcon className="h-4 w-4" />
                            Media Attachments
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Picture */}
                            {pictureUrl && !mediaErrors.picture && (
                                <div className="relative group bg-gray-100 rounded-lg">
                                    <img
                                        src={pictureUrl}
                                        alt="Complaint"
                                        className="w-full h-48 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity bg-white"
                                        onClick={() => setShowMedia({ ...showMedia, picture: true })}
                                        onError={handleImageError}
                                    />
                                    {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-2 py-1 rounded text-sm flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            Click to enlarge
                                        </span>
                                    </div> */}
                                </div>
                            )}

                            {/* Video */}
                            {videoUrl && !mediaErrors.video && (
                                <div className="relative group bg-gray-100 rounded-lg">
                                    <video
                                        controls
                                        className="w-full h-48 object-contain rounded-lg cursor-pointer bg-white"
                                        onClick={() => setShowMedia({ ...showMedia, video: true })}
                                        onError={handleVideoError}
                                        preload="metadata"
                                    >
                                        <source src={videoUrl} type="video/mp4" />
                                        Your browser does not support the video tag.
                                    </video>
                                    {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-2 py-1 rounded text-sm flex items-center gap-1">
                                            <Eye className="h-3 w-3" />
                                            Click to enlarge
                                        </span>
                                    </div> */}
                                </div>
                            )}

                            {/* Media Error Placeholders */}
                            {mediaErrors.picture && (
                                <div className="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
                                    <ImageIcon className="h-12 w-12 mb-2 text-gray-400" />
                                    <p className="text-sm">Image not available</p>
                                    <p className="text-xs text-gray-400 mt-1">Failed to load image</p>
                                </div>
                            )}

                            {mediaErrors.video && (
                                <div className="flex flex-col items-center justify-center h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
                                    <Video className="h-12 w-12 mb-2 text-gray-400" />
                                    <p className="text-sm">Video not available</p>
                                    <p className="text-xs text-gray-400 mt-1">Failed to load video</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Map */}
                {complaint.location_lat && complaint.location_lng && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                            <MapPin className="h-4 w-4" />
                            Location Map
                        </div>
                        <div className="h-80 rounded-lg overflow-hidden border border-gray-200">
                            <MapContainer
                                center={[complaint.location_lat, complaint.location_lng]}
                                zoom={15}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={false}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker
                                    position={[complaint.location_lat, complaint.location_lng]}
                                    icon={locationIcon}
                                >
                                    <Popup>
                                        <div className="text-sm">
                                            <strong>Complaint Location</strong><br />
                                            {complaint.location}<br />
                                            {complaint.landmark && `Landmark: ${complaint.landmark}`}
                                        </div>
                                    </Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    {complaint.status === "Pending" && (
                        <>
                            <button
                                disabled={loading}
                                onClick={handleAccept}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader className="animate-spin h-4 w-4" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        Accept Complaint
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => handleStatusUpdate("Denied")}
                                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <XCircle className="h-4 w-4" />
                                report
                            </button>
                        </>
                    )}

                    {(complaint.status === "Accepted" || complaint.status === "In Progress") && (
                        <>
                            <button
                                disabled={statusLoading === "Completed"}
                                onClick={() => handleStatusUpdate("Completed")}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {statusLoading === "Completed" ? (
                                    <Loader className="animate-spin h-4 w-4" />
                                ) : (
                                    <CheckCircle className="h-4 w-4" />
                                )}
                                Mark Complete
                            </button>

                            <button
                                disabled={statusLoading === "Incomplete"}
                                onClick={() => handleStatusUpdate("Incomplete")}
                                className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                            >
                                {statusLoading === "Incomplete" ? (
                                    <Loader className="animate-spin h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                Mark Incomplete
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Media Modal - Larger & Clearer */}
            {(showMedia.picture || showMedia.video) && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {showMedia.picture ? "Image Preview" : "Video Preview"}
                            </h3>
                            <button
                                onClick={() => setShowMedia({ picture: false, video: false })}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex items-center justify-center p-6 bg-gray-100 max-h-[80vh] overflow-auto">
                            {showMedia.picture && (
                                <img
                                    src={pictureUrl}
                                    alt="Complaint"
                                    className="max-w-full max-h-[75vh] rounded-lg object-contain bg-white shadow-md"
                                />
                            )}
                            {showMedia.video && (
                                <video
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[75vh] rounded-lg bg-black shadow-md"
                                >
                                    <source src={videoUrl} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default WorkerComplaintCard;
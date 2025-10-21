import React, { useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const locationIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
    iconSize: [30, 30],
});

const WorkerComplaintCard = ({ complaint, refreshComplaints }) => {
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem("access");

    const handleAccept = async () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");

        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                await axios.post(
                    `http://127.0.0.1:8000/api/complaints/${complaint.id}/accept/`,
                    { worker_lat: latitude, worker_lng: longitude },
                    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
                );
                alert("✅ Complaint accepted!");
                refreshComplaints();
            } catch (err) {
                alert("❌ Error accepting complaint");
            } finally {
                setLoading(false);
            }
        });
    };

    const handleStatusUpdate = async (status) => {
        try {
            await axios.post(
                `http://127.0.0.1:8000/api/complaints/${complaint.id}/update_status/`,
                { status },
                { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
            );
            alert(`✅ Marked as ${status}`);
            refreshComplaints();
        } catch (err) {
            alert("❌ Error updating status");
        }
    };

    return (
        <div className="bg-white border rounded-xl shadow-md p-4 mb-4">
            <h3 className="text-xl font-semibold mb-2">{complaint.title}</h3>
            <p>{complaint.description}</p>
            <p><b>Waste Type:</b> {complaint.waste_type}</p>
            <p><b>Quantity:</b> {complaint.quantity}</p>
            <p><b>Status:</b> {complaint.status}</p>
            <p><b>Desired Cleanup Time:</b> {complaint.desired_cleanup_time || "N/A"}</p>
            <p><b>Citizen:</b> {complaint.citizen?.username}</p>
            <p><b>Email:</b> {complaint.citizen?.email}</p>
            <p><b>Phone:</b> {complaint.citizen?.phone_number || "Not provided"}</p>

            {complaint.picture && (
                <img
                    src={`http://127.0.0.1:8000${complaint.picture}`}
                    alt="Complaint"
                    className="w-full h-48 object-cover rounded-md mt-3"
                />
            )}

            {complaint.video && (
                <video controls className="w-full h-48 rounded-md mt-3">
                    <source src={`http://127.0.0.1:8000${complaint.video}`} type="video/mp4" />
                </video>
            )}

            {/* Map */}
            {complaint.location_lat && complaint.location_lng && (
                <div className="mt-4 h-56 rounded-lg overflow-hidden">
                    <MapContainer
                        center={[complaint.location_lat, complaint.location_lng]}
                        zoom={15}
                        style={{ height: "100%", width: "100%" }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker
                            position={[complaint.location_lat, complaint.location_lng]}
                            icon={locationIcon}
                        >
                            <Popup>Citizen Location</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 mt-4">
                <button
                    disabled={loading || complaint.status !== "Pending"}
                    onClick={handleAccept}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                    {loading ? "Processing..." : "Accept"}
                </button>

                <button
                    onClick={() => handleStatusUpdate("Denied")}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                >
                    Deny
                </button>

                <button
                    onClick={() => handleStatusUpdate("Incomplete")}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                >
                    Incomplete
                </button>
            </div>
        </div>
    );
};

export default WorkerComplaintCard;

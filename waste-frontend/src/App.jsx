import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import axios from "axios";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboardAnalysis from "./pages/AdminDashboardAnalysis";
import CitizenComplaintsPage from "./pages/CitizenComplaintsPage";
import WorkerComplaintPage from "./pages/WorkerComplaintPage";
import ChatPage from "./pages/ChatBoxPage";
//import { AuthProvider } from "./context/AuthContext";
export default function App() {

  const [admins, setAdmins] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // Fetch all admins from backend (adjust URL as needed)
    axios.get("http://localhost:8000/api/admins/")
      .then((res) => setAdmins(res.data))
      .catch((err) => console.error("Error fetching admins:", err));
  }, []);
  return (

    <BrowserRouter>
      <nav className="bg-green-600 text-white p-4 flex justify-center space-x-6 relative">
        <Link to="/">Register</Link>
        <Link to="/login">Login</Link>
        <Link to="/dashboard">Dashboard</Link>

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-green-700 px-3 py-2 rounded-md hover:bg-green-800 transition-all"
          >
            Inquire / Report ▼
          </button>

          {dropdownOpen && (
            <div className="absolute mt-2 bg-white text-black rounded-md shadow-lg w-48 z-50">
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <Link
                    key={admin.id}
                    to={`/profile/${admin.id}`}
                    className="block px-4 py-2 hover:bg-gray-200"
                    onClick={() => setDropdownOpen(false)}
                  >
                    {admin.username}
                  </Link>
                ))
              ) : (
                <p className="px-4 py-2 text-gray-500">No admins found</p>
              )}
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/admin-dashboard-analysis" element={<AdminDashboardAnalysis />} />
        <Route path="/citizen-complants" element={<CitizenComplaintsPage />} />
        <Route path="/worker-complants-acceptance" element={<WorkerComplaintPage />} />
        <Route path="/chat/:complaintId" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>

  );
}

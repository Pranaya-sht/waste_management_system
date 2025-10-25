import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboardAnalysis from "./pages/AdminDashboardAnalysis";
import CitizenComplaintsPage from "./pages/CitizenComplaintsPage";
import WorkerComplaintPage from "./pages/WorkerComplaintPage";
import ChatBoxPage from "./pages/ChatBoxPage";
export default function App() {
  return (
    <BrowserRouter>
      <nav className="bg-green-600 text-white p-4 flex justify-center space-x-6">
        <Link to="/">Register</Link>
        <Link to="/login">Login</Link>
        <Link to="/dashboard">Dashboard</Link>
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
        <Route path="/chat/:complaintId" element={<ChatBoxPage />} />
      </Routes>
    </BrowserRouter>
  );
}

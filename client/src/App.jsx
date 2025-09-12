import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Layout and Pages
import Header from './components/layout/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyAccount from './pages/MyAccount';
import ChatPage from './pages/ChatPage';
import Scanner from './pages/Scanner';
import OCRScannerPage from './components/shared/OCRScanner'; // Assuming this is a full-page component for now

// Dashboards
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DoctorDashboard from './pages/dashboards/DoctorDashboard';
import PatientDashboard from './pages/dashboards/PatientDashboard';
import ShopDashboard from './pages/dashboards/ShopDashboard';

// A component to handle role-based dashboard redirection
const DashboardRedirect = () => {
    const { user } = useContext(AuthContext);
    if (!user) return <Navigate to="/login" />;

    switch (user.role) {
        case 'patient':
            return <PatientDashboard />;
        case 'doctor':
            return <DoctorDashboard />;
        case 'shop':
            return <ShopDashboard />;
        case 'admin':
            return <AdminDashboard />;
        default:
            return <Navigate to="/" />;
    }
};

// A component to protect routes
const ProtectedRoute = ({ children, roles }) => {
    const { user } = useContext(AuthContext);
    if (!user) {
        return <Navigate to="/login" />;
    }
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" />; // Redirect to their default dashboard
    }
    return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Header can be rendered conditionally or inside specific page layouts if needed */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Generic dashboard route that redirects based on role */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
          
          {/* Specific Protected Routes */}
          <Route path="/my-account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="/ocr-scanner" element={<ProtectedRoute><OCRScannerPage /></ProtectedRoute>} />

          {/* Role-specific routes */}
          <Route path="/chatbot" element={<ProtectedRoute roles={['patient']}><ChatPage /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          
          {/* Fallback for any other route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
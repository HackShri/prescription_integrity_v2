import React, { useContext, useState, useEffect } from 'react';
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
import EmergencyContact from './components/shared/emergencyContact';

// Dashboards
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DoctorDashboard from './pages/dashboards/DoctorDashboard';
import PatientDashboard from './pages/dashboards/PatientDashboard';
import ShopDashboard from './pages/dashboards/ShopDashboard';
import PatientSurvey from './pages/PatientSurvey';

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
  // While auth is initializing, don't redirect — keep the UI steady
  if (typeof user === 'undefined') {
    return null; // or a loading spinner component
  }
  if (!user) {
    return <Navigate to="/login" />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />; // Redirect to their default dashboard
  }
  return children;
};

const AppInner = () => {
  return (
    <Router>
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
          <Route path="/emergency-contact" element={<ProtectedRoute><EmergencyContact /></ProtectedRoute>} />

          {/* New full-page survey route for patients */}
          <Route path="/survey" element={<ProtectedRoute roles={['patient']}><PatientSurvey /></ProtectedRoute>} />

          {/* Role-specific routes */}
          <Route path="/chatbot" element={<ProtectedRoute roles={['patient']}><ChatPage /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          {/* Fallback for any other route */}
          <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
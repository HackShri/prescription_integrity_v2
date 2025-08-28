import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import AuthProvider, { AuthContext } from './context/AuthContext.jsx';
import Navbar from './components/Header';
import Login from './components/Login';
import Signup from './components/Signup';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import ShopDashboard from './pages/ShopDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Scanner from './pages/Scanner';
import OCRScanner from './pages/OCRScanner';
import ChatbotPage from './pages/ChatPage';
import MyAccount from './pages/MyAccount';
import Home from './components/Home';
import "./index.css";

const AppContent = () => {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {user && <Navbar />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
          <Route path="/my-account" element={user ? <MyAccount /> : <Navigate to="/login" />} />
          <Route
            path="/dashboard"
            element={
              user ? (
                user.role === 'doctor' ? <DoctorDashboard /> :
                user.role === 'patient' ? <PatientDashboard /> :
                user.role === 'shop' ? <ShopDashboard /> :
                <AdminDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route path="/scanner" element={user ? <Scanner /> : <Navigate to="/login" />} />
          <Route path="/ocr-scanner" element={user ? <OCRScanner /> : <Navigate to="/login" />} />
          <Route
            path="/chatbot"
            element={
              user && user.role === 'patient' ? <ChatbotPage /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </Router>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
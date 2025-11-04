import React, { createContext, useState, useEffect } from 'react';
import { fetchCurrentUser, uploadPatientPhoto } from '../api/authService';
// Lightweight JWT decode helper to avoid bundler issues with 'jwt-decode'
function decodeJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const payload = parts[1];
    // base64url -> base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // pad with '='
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    // decode percent-encoding (handle UTF-8)
    const json = decodeURIComponent(decoded.split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (err) {
    throw new Error('Failed to decode token');
  }
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // user: undefined = loading, null = not authenticated, object = authenticated
  const [user, setUser] = useState(undefined);

  const loadUser = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      setUser(null);
      return;
    }
    try {
      // Decode token minimally to ensure it's present
      decodeJwt(token);
      const res = await fetchCurrentUser();
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (token) => {
    // Save under both keys for compatibility
    localStorage.setItem('token', token);
    localStorage.setItem('authToken', token);
    await loadUser();
    // If a photo was captured during signup, upload it now after login
    const pendingPhoto = localStorage.getItem('pendingSignupPhoto');
    if (pendingPhoto) {
      try {
        const response = await fetch(pendingPhoto);
        const blob = await response.blob();
        const file = new File([blob], 'profile.jpg', { type: blob.type || 'image/jpeg' });
        await uploadPatientPhoto(file);
        localStorage.removeItem('pendingSignupPhoto');
        await loadUser();
      } catch (e) {
        // keep the pending photo for retry later
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, reloadUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};
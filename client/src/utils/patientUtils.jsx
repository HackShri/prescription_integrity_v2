// Shared utilities for patient data fetching and management
import { useState, useEffect, useCallback } from 'react';

// Custom hook for patient search and auto-population
export const usePatientSearch = (initialData = {}) => {
  const [searchId, setSearchId] = useState('');
  const [patientData, setPatientData] = useState({
    patientEmail: '',
    patientMobile: '',
    age: '',
    weight: '',
    height: '',
    ...initialData
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Debounced patient search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchId && searchId.length > 3) {
        fetchPatientDetails(searchId);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [searchId]);

  const fetchPatientDetails = useCallback(async (id) => {
    try {
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`http://localhost:5000/api/users/find/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Patient not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update patient data with fetched information
      setPatientData(prev => ({
        ...prev,
        patientEmail: data.email || prev.patientEmail,
        patientMobile: data.mobile || prev.patientMobile,
        age: data.age || prev.age,
        weight: data.weight || prev.weight,
        height: data.height || prev.height
      }));

      setSuccess('Patient details loaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to fetch patient data: ${err.message}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePatientData = useCallback((field, value) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update search ID when email or mobile is changed
    if (field === 'patientEmail' || field === 'patientMobile') {
      setSearchId(value);
    }
  }, []);

  const resetPatientData = useCallback(() => {
    setPatientData({
      patientEmail: '',
      patientMobile: '',
      age: '',
      weight: '',
      height: ''
    });
    setSearchId('');
    setError('');
    setSuccess('');
  }, []);

  return {
    searchId,
    setSearchId,
    patientData,
    setPatientData,
    updatePatientData,
    resetPatientData,
    isLoading,
    error,
    success,
    fetchPatientDetails
  };
};

// Utility function to validate patient data
export const validatePatientData = (data) => {
  const errors = {};

  if (!data.patientEmail && !data.patientMobile) {
    errors.contact = 'Please provide either email or mobile number';
  }

  if (data.patientEmail && !isValidEmail(data.patientEmail)) {
    errors.email = 'Please provide a valid email address';
  }

  if (data.patientMobile && !isValidMobile(data.patientMobile)) {
    errors.mobile = 'Please provide a valid mobile number';
  }

  if (data.age && (parseInt(data.age) < 0 || parseInt(data.age) > 150)) {
    errors.age = 'Age must be between 0 and 150';
  }

  if (data.weight && (parseFloat(data.weight) < 0 || parseFloat(data.weight) > 500)) {
    errors.weight = 'Weight must be between 0 and 500 kg';
  }

  if (data.height && (parseFloat(data.height) < 50 || parseFloat(data.height) > 300)) {
    errors.height = 'Height must be between 50 and 300 cm';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Mobile validation helper
const isValidMobile = (mobile) => {
  // Remove all non-digit characters for validation
  const cleanMobile = mobile.replace(/\D/g, '');
  // Should be at least 10 digits
  return cleanMobile.length >= 10 && cleanMobile.length <= 15;
};

// Format patient data for display
export const formatPatientData = (data) => {
  return {
    ...data,
    age: data.age ? `${data.age} years` : '',
    weight: data.weight ? `${data.weight} kg` : '',
    height: data.height ? `${data.height} cm` : '',
    mobile: data.patientMobile ? formatMobileNumber(data.patientMobile) : ''
  };
};

// Format mobile number for display
const formatMobileNumber = (mobile) => {
  const cleaned = mobile.replace(/\D/g, '');
  
  // Format Indian numbers
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  // Format international numbers with country codes
  if (cleaned.length > 10) {
    const countryCode = cleaned.slice(0, -10);
    const number = cleaned.slice(-10);
    return `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
  }
  
  return mobile;
};

// Patient search suggestions (for autocomplete functionality)
export const getPatientSuggestions = async (query) => {
  try {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (!token) return [];

    const response = await fetch(`http://localhost:5000/api/users/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map(user => ({
      id: user._id,
      email: user.email,
      mobile: user.mobile,
      name: user.name || `${user.email} / ${user.mobile}`
    }));
  } catch (err) {
    console.error('Search suggestions error:', err);
    return [];
  }
};

// Export default object for easier importing
export default {
  usePatientSearch,
  validatePatientData,
  formatPatientData,
  getPatientSuggestions
};
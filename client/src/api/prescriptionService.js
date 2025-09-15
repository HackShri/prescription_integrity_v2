import apiClient from './apiClient';

// Prescription Endpoints
export const createPrescription = (payload) => {
  return apiClient.post('/prescriptions', payload, { withCredentials: true });
};

export const getPatientPrescriptions = () => {
  return apiClient.get('/prescriptions/patient');
};

export const getPrescriptionById = (id) => {
    return apiClient.get(`/prescriptions/${id}`);
};

export const getPrescriptionByShortId = (shortId) => {
    return apiClient.get(`/prescriptions/short/${shortId}`);
};

export const getShopHistory = () => {
    return apiClient.get('/prescriptions/shop-history');
};

export const markPrescriptionAsUsed = (id) => {
    return apiClient.patch(`/prescriptions/${id}/use`);
};

export const downloadPrescriptionPdf = (id) => {
    return apiClient.get(`/prescriptions/${id}/download`, { responseType: 'blob' });
};


// Pill Schedule Endpoints
export const getPillSchedule = () => {
    return apiClient.get('/pill-schedule');
};

export const addPillToSchedule = (pillData) => {
    return apiClient.post('/pill-schedule', pillData);
};

export const togglePillTakenStatus = (pillId) => {
    return apiClient.patch(`/pill-schedule/${pillId}/toggle`);
};


// User Management (Admin) Endpoints
export const getAllUsers = () => {
    return apiClient.get('/users');
};

export const verifyUser = (userId, action) => {
    return apiClient.patch(`/users/verify/${userId}`, { action });
};

// Chatbot Endpoint
export const postChatMessage = (messages) => {
    return apiClient.post('/chat', { messages });
};

// Transcription Endpoint
export const transcribeAudio = (formData) => {
    return apiClient.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// Smart Transcription Endpoint with Prescription Generation
export const smartTranscribeAudio = (formData, age = 25, weight = 70) => {
    const data = new FormData();
    data.append('audio', formData.get('audio'));
    data.append('age', age.toString());
    data.append('weight', weight.toString());
    
    return apiClient.post('/smart-transcribe', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

// Offline Prescription Creation Endpoint
export const createOfflinePrescription = (prescriptionData) => {
    return apiClient.post('/prescriptions/offline', prescriptionData, { withCredentials: true });
};

// Drug Interaction Check Endpoint
export const checkDrugInteractions = (drugs, age = 25, weight = 70) => {
    return fetch('http://localhost:8001/check-drug-interactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drugs, age, weight })
    }).then(response => response.json());
};
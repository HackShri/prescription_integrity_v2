import apiClient from './apiClient';

export const fetchDangerousList = () => apiClient.get('/verification/dangerous-list');

export const checkDangerousForPrescription = (prescriptionId) =>
  apiClient.post('/verification/check', { prescriptionId });

export const requestVerification = (prescriptionId, notes) =>
  apiClient.post('/verification/request', { prescriptionId, notes });

export const approveVerification = (prescriptionId, approve, notes) =>
  apiClient.post('/verification/approve', { prescriptionId, approve, notes });

export const getVerificationStatus = (prescriptionId) =>
  apiClient.get(`/verification/status/${prescriptionId}`);

export const listPendingVerifications = () =>
  apiClient.get('/verification/pending');



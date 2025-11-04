import apiClient from './apiClient';

export const loginUser = (credentials) => {
  return apiClient.post('/auth/login', credentials);
};

export const signupUser = (userData) => {
  return apiClient.post('/auth/signup', userData);
};

export const fetchCurrentUser = () => {
  return apiClient.get('/auth/me');
};

// ADD THESE NEW EXPORTS
export const fetchNotifications = () => {
    return apiClient.get('/auth/notifications');
};

export const markNotificationAsRead = (notificationId) => {
    // Note: The empty {} is the request body, which is not needed for this PATCH request.
    return apiClient.patch(`/auth/notifications/${notificationId}/read`, {});
};

export const markAllNotificationsAsRead = () => {
    return apiClient.patch('/auth/notifications/read-all', {});
};

// Upload patient photo (multipart/form-data), stored locally on server
export const uploadPatientPhoto = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return apiClient.post('/auth/upload-photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Submit first-time survey
export const submitPatientSurvey = (survey) => {
  return apiClient.post('/auth/survey', survey);
};
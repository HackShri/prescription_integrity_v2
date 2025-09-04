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
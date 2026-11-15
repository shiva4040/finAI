import { apiClient } from './client';

export const settingsApi = {
  getSettings: () => apiClient.get('/settings'),
  updateSettings: (data) => apiClient.patch('/settings', data),
  getMe: () => apiClient.get('/users/me'),
  updateProfile: (data) => apiClient.patch('/users/me', data),
  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

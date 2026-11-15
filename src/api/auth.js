import { apiClient } from './client';

export const authApi = {
  register: (name, email, password) => apiClient.post('/auth/register', { name, email, password }),
  login: (email, password, rememberMe = true) => apiClient.post('/auth/login', { email, password, remember_me: rememberMe }),
  logout: (refreshToken) => apiClient.post('/auth/logout', { refresh_token: refreshToken }),
  getMe: () => apiClient.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => apiClient.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  }),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/auth/reset-password', { token, new_password: newPassword }),
};

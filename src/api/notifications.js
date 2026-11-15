import { apiClient } from './client';

export const notificationsApi = {
  getNotifications: (page = 1, pageSize = 20) =>
    apiClient.get(`/notifications?page=${page}&page_size=${pageSize}`),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.post('/notifications/read-all', {}),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
  clearAll: () => apiClient.delete('/notifications/clear-all'),
  checkOverdue: () => apiClient.post('/notifications/check-overdue', {}),
};

import { apiClient } from './client';

export const assistantApi = {
  chat: (message, conversationId = null, currency = 'INR') =>
    apiClient.post('/assistant/chat', {
      message,
      conversation_id: conversationId,
      currency,
    }),
  getConversations: (limit = 20) => apiClient.get(`/assistant/conversations?limit=${limit}`),
  getMessages: (conversationId, limit = 50) =>
    apiClient.get(`/assistant/conversations/${conversationId}/messages?limit=${limit}`),
  updateConversation: (conversationId, title) =>
    apiClient.patch(`/assistant/conversations/${conversationId}`, { title }),
  deleteConversation: (conversationId) =>
    apiClient.delete(`/assistant/conversations/${conversationId}`),
};

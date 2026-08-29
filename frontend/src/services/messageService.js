/**
 * Message service — API wrapper for /api/messages/*.
 *
 * Follows the same pattern as adminService.js / pickupService.js: imports
 * the shared `api` instance and returns `response.data.data` — the
 * unwrapped payload.
 */

import api from "@/services/api";

export const listConversations = async (contextType) => {
  const response = await api.get("/messages/conversations", { params: contextType ? { contextType } : {} });
  return response.data.data;
};

export const getUnreadCount = async (contextType) => {
  const response = await api.get("/messages/unread-count", { params: contextType ? { contextType } : {} });
  return response.data.data;
};

/** @param {{recipientId: string, contextType: "marketplace_product"|"campaign", contextId: string}} payload */
export const getOrCreateConversation = async (payload) => {
  const response = await api.post("/messages/conversations", payload);
  return response.data.data;
};

export const getMessages = async (conversationId, { before } = {}) => {
  const response = await api.get(`/messages/conversations/${conversationId}/messages`, {
    params: before ? { before } : {},
  });
  return response.data.data;
};

export const sendMessage = async (conversationId, body) => {
  const response = await api.post(`/messages/conversations/${conversationId}/messages`, { body });
  return response.data.data;
};

export const markConversationRead = async (conversationId) => {
  await api.patch(`/messages/conversations/${conversationId}/read`);
};

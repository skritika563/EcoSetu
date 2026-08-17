/**
 * Notification service — backed by /api/notifications.
 *
 * Replaces the mock feed in data/notificationData.js that reset on every
 * reload. Notifications are now created server-side as a side effect of real
 * pickup lifecycle events (backend/services/notificationService.js), so what
 * shows up here reflects what actually happened to the user's pickups.
 */

import api from "@/services/api";

/** → GET /api/notifications */
export const getNotifications = async () => {
  const response = await api.get("/notifications");
  return response.data.data;
};

/** → GET /api/notifications/unread-count */
export const getUnreadCount = async () => {
  const response = await api.get("/notifications/unread-count");
  return response.data.data.count;
};

/** → PATCH /api/notifications/:id/read */
export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data.data;
};

/** → POST /api/notifications/read-all */
export const markAllAsRead = async () => {
  await api.post("/notifications/read-all");
};

export default { getNotifications, getUnreadCount, markAsRead, markAllAsRead };

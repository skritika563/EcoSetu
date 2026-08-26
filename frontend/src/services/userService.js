/**
 * User service — /api/users, the one general public-profile lookup shared
 * by Marketplace's seller view and Campaigns' participant/volunteer lookup.
 * See backend/controllers/userController.js's header comment.
 */

import api from "@/services/api";

/** → GET /api/users/:id/profile */
export const getUserProfile = async (userId) => {
  const response = await api.get(`/users/${userId}/profile`);
  return response.data.data;
};

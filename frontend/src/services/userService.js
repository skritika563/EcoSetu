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

/** → PUT /api/users/profile */
export const updateProfile = async (profileData) => {
  const response = await api.put("/users/profile", profileData);
  return response.data.data;
};

/** → POST /api/users/upload-avatar */
export const uploadProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/users/upload-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
};


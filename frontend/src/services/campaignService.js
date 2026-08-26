/**
 * Campaign service — backed by /api/campaigns.
 *
 * Real backend throughout, same discipline as services/productService.js:
 * browse, filters, join/volunteer, management and analytics all hit
 * MongoDB through the real API. No mock campaign array anywhere in the
 * frontend — the starter campaigns a new user sees are real Campaign
 * documents seeded server-side (backend/scripts/seedCampaigns.js).
 */

import api from "@/services/api";

/**
 * → GET /api/campaigns
 * @param {object} [params] - search, category, status, city, organizationId,
 *   sort, page, limit. Undefined/empty values are stripped.
 */
export const getCampaigns = async (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all")
  );
  const response = await api.get("/campaigns", { params: clean });
  return response.data.data;
};

/** → GET /api/campaigns/:id */
export const getCampaignById = async (id) => {
  const response = await api.get(`/campaigns/${id}`);
  return response.data.data;
};

/** → GET /api/campaigns/mine — the signed-in organizer's own campaigns. */
export const getMyCampaigns = async (status) => {
  const response = await api.get("/campaigns/mine", { params: status && status !== "all" ? { status } : {} });
  return response.data.data;
};

/** → GET /api/campaigns/mine/participation — campaigns I've joined/volunteered for. */
export const getMyParticipation = async ({ type, status } = {}) => {
  const response = await api.get("/campaigns/mine/participation", {
    params: { ...(type ? { type } : {}), ...(status ? { status } : {}) },
  });
  return response.data.data;
};

/** → POST /api/campaigns. organizerId comes from the token, not here. */
export const createCampaign = async (payload) => {
  const response = await api.post("/campaigns", payload);
  return response.data.data;
};

/** → PATCH /api/campaigns/:id */
export const updateCampaign = async (id, payload) => {
  const response = await api.patch(`/campaigns/${id}`, payload);
  return response.data.data;
};

/** → PATCH /api/campaigns/:id/cancel */
export const cancelCampaign = async (id, reason) => {
  const response = await api.patch(`/campaigns/${id}/cancel`, { reason });
  return response.data.data;
};

/** → DELETE /api/campaigns/:id — only allowed with zero participants; see backend. */
export const deleteCampaign = async (id) => {
  const response = await api.delete(`/campaigns/${id}`);
  return response.data.data;
};

/**
 * → POST /api/campaigns/:id/banner
 * Multipart, single file. Content-Type cleared so the browser sets the
 * multipart boundary itself (same footgun documented in productService.js).
 */
export const uploadCampaignBanner = async (id, file) => {
  const formData = new FormData();
  formData.append("banner", file);
  const response = await api.post(`/campaigns/${id}/banner`, formData, {
    headers: { "Content-Type": undefined },
  });
  return response.data.data;
};

/** → POST /api/campaigns/:id/gallery */
export const uploadCampaignGalleryImages = async (id, files) => {
  const valid = files.filter((file) => file instanceof File);
  if (valid.length === 0) throw new Error("No valid image files to upload — please re-select and try again.");
  const formData = new FormData();
  valid.forEach((file) => formData.append("images", file));
  const response = await api.post(`/campaigns/${id}/gallery`, formData, {
    headers: { "Content-Type": undefined },
  });
  return response.data.data;
};

/** → DELETE /api/campaigns/:id/gallery/:imageId */
export const deleteCampaignGalleryImage = async (id, imageId) => {
  const response = await api.delete(`/campaigns/${id}/gallery/${imageId}`);
  return response.data.data;
};

/** → POST /api/campaigns/:id/join */
export const joinCampaign = async (id) => {
  const response = await api.post(`/campaigns/${id}/join`);
  return response.data.data;
};

/** → DELETE /api/campaigns/:id/join */
export const leaveCampaign = async (id) => {
  const response = await api.delete(`/campaigns/${id}/join`);
  return response.data.data;
};

/** → POST /api/campaigns/:id/volunteer */
export const volunteerForCampaign = async (id) => {
  const response = await api.post(`/campaigns/${id}/volunteer`);
  return response.data.data;
};

/** → DELETE /api/campaigns/:id/volunteer */
export const leaveVolunteering = async (id) => {
  const response = await api.delete(`/campaigns/${id}/volunteer`);
  return response.data.data;
};

/** → GET /api/campaigns/:id/participants — owner only. */
export const getCampaignParticipants = async (id, status) => {
  const response = await api.get(`/campaigns/${id}/participants`, { params: status && status !== "all" ? { status } : {} });
  return response.data.data;
};

/** → GET /api/campaigns/:id/volunteers — owner only. */
export const getCampaignVolunteers = async (id, status) => {
  const response = await api.get(`/campaigns/${id}/volunteers`, { params: status && status !== "all" ? { status } : {} });
  return response.data.data;
};

/** → PATCH /api/campaigns/:id/participants/:participantId — owner only. */
export const updateParticipantStatus = async (campaignId, participantId, status) => {
  const response = await api.patch(`/campaigns/${campaignId}/participants/${participantId}`, { status });
  return response.data.data;
};

/** → PATCH /api/campaigns/:id/participants/:participantId/attendance — owner only. */
export const markAttendance = async (campaignId, participantId, attended) => {
  const response = await api.patch(`/campaigns/${campaignId}/participants/${participantId}/attendance`, { attended });
  return response.data.data;
};

/** → POST /api/campaigns/:id/collection — owner only. */
export const recordCollection = async (id, { category, weightKg }) => {
  const response = await api.post(`/campaigns/${id}/collection`, { category, weightKg });
  return response.data.data;
};

/** → GET /api/campaigns/:id/pickups — owner only. Real Pickup records linked to this campaign. */
export const getCampaignPickups = async (id) => {
  const response = await api.get(`/campaigns/${id}/pickups`);
  return response.data.data;
};

/** → GET /api/campaigns/:id/analytics — owner only. */
export const getCampaignAnalytics = async (id) => {
  const response = await api.get(`/campaigns/${id}/analytics`);
  return response.data.data;
};

/** → GET /api/campaigns/:id/certificate */
export const getCertificate = async (id, type) => {
  const response = await api.get(`/campaigns/${id}/certificate`, { params: type ? { type } : {} });
  return response.data.data;
};

/** → GET /api/campaigns/certificates/mine */
export const getMyCertificates = async () => {
  const response = await api.get("/campaigns/certificates/mine");
  return response.data.data;
};

export default {
  getCampaigns,
  getCampaignById,
  getMyCampaigns,
  getMyParticipation,
  createCampaign,
  updateCampaign,
  cancelCampaign,
  deleteCampaign,
  uploadCampaignBanner,
  uploadCampaignGalleryImages,
  deleteCampaignGalleryImage,
  joinCampaign,
  leaveCampaign,
  volunteerForCampaign,
  leaveVolunteering,
  getCampaignParticipants,
  getCampaignVolunteers,
  updateParticipantStatus,
  markAttendance,
  recordCollection,
  getCampaignPickups,
  getCampaignAnalytics,
  getCertificate,
  getMyCertificates,
};

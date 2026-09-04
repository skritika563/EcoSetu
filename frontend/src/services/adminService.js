/**
 * Admin service — API wrapper for all admin endpoints.
 *
 * Follows the same pattern as pickupService.js / productService.js:
 * imports the shared `api` instance (which auto-attaches the Firebase token)
 * and returns `response.data.data` — the unwrapped payload.
 */

import api from "@/services/api";

// ── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const response = await api.get("/admin/dashboard/stats");
  return response.data.data;
};

export const getPlatformActivity = async (limit = 20) => {
  const response = await api.get("/admin/dashboard/activity", { params: { limit } });
  return response.data.data;
};

// ── Analytics ────────────────────────────────────────────────────────────────

export const getAnalytics = async (period = "30d") => {
  const response = await api.get("/admin/analytics", { params: { period } });
  return response.data.data;
};

export const getEnvironmentalImpact = async () => {
  const response = await api.get("/admin/analytics/environmental-impact");
  return response.data.data;
};

// ── Users ────────────────────────────────────────────────────────────────────

export const listUsers = async (params = {}) => {
  const response = await api.get("/admin/users", { params });
  return response.data.data;
};

export const getUserDetails = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data.data;
};

export const updateUserStatus = async (id, isActive) => {
  const response = await api.patch(`/admin/users/${id}/status`, { isActive });
  return response.data.data;
};

export const updateUserRole = async (id, role, organizationType = null) => {
  const response = await api.patch(`/admin/users/${id}/role`, { role, organizationType });
  return response.data.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data.data;
};

// ── Pickups ──────────────────────────────────────────────────────────────────

export const listPickups = async (params = {}) => {
  const response = await api.get("/admin/pickups", { params });
  return response.data.data;
};

export const getPickupDetails = async (id) => {
  const response = await api.get(`/admin/pickups/${id}`);
  return response.data.data;
};

// ── Marketplace ──────────────────────────────────────────────────────────────

export const getMarketplaceOverview = async () => {
  const response = await api.get("/admin/marketplace/overview");
  return response.data.data;
};

export const listProducts = async (params = {}) => {
  const response = await api.get("/admin/marketplace/products", { params });
  return response.data.data;
};

export const updateProductStatus = async (id, status) => {
  const response = await api.patch(`/admin/marketplace/products/${id}/status`, { status });
  return response.data.data;
};

// ── Campaigns ────────────────────────────────────────────────────────────────

export const listCampaigns = async (params = {}) => {
  const response = await api.get("/admin/campaigns", { params });
  return response.data.data;
};

export const cancelCampaign = async (id, reason = null) => {
  const response = await api.patch(`/admin/campaigns/${id}/status`, { action: "cancel", reason });
  return response.data.data;
};

// ── Scrap Rates ──────────────────────────────────────────────────────────────

export const listScrapRates = async () => {
  const response = await api.get("/admin/scrap-rates");
  return response.data.data;
};

export const updateScrapRate = async (id, pricePerKg) => {
  const response = await api.patch(`/admin/scrap-rates/${id}`, { pricePerKg });
  return response.data.data;
};

// ── Notifications ────────────────────────────────────────────────────────────

export const sendNotification = async ({ target, targetRole, targetUserId, title, description, type }) => {
  const response = await api.post("/admin/notifications/send", {
    target, targetRole, targetUserId, title, description, type,
  });
  return response.data.data;
};

export const listNotifications = async (params = {}) => {
  const response = await api.get("/admin/notifications", { params });
  return response.data.data;
};

// ── Audit Logs ───────────────────────────────────────────────────────────────

export const getAuditLogs = async (params = {}) => {
  const response = await api.get("/admin/audit-logs", { params });
  return response.data.data;
};

// ── Reward Redemptions ─────────────────────────────────────────────────────

export const listRedemptions = async (params = {}) => {
  const response = await api.get("/admin/redemptions", { params });
  return response.data.data;
};

export const updateRedemptionStatus = async (id, status) => {
  const response = await api.patch(`/admin/redemptions/${id}/status`, { status });
  return response.data.data;
};

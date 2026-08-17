/**
 * Pickup service — the seam between the Pickups module and its data.
 *
 * Backed by /api/pickups on the real backend (backend/controllers/
 * pickupController.js) — the in-memory mock store this file used to hold is
 * gone. Every function below keeps its exact prior name and signature, so no
 * component or hook changes were needed to make this swap; only this file did.
 *
 * The server is the only place a pickup's amount is ever computed
 * (backend/services/pricingService.js) — verifyAndCompletePickup sends only
 * {category, weight} pairs and trusts whatever total comes back.
 */

import api from "@/services/api";

/** → GET /api/pickups (server scopes this by role: mine, or jobs I can see). */
export const getPickupsForRole = async (_role, { empty = false } = {}) => {
  if (empty) return [];
  const response = await api.get("/pickups");
  return response.data.data;
};

/** → GET /api/pickups (collector view — same endpoint, server does the filtering). */
export const getJobsForCollector = async ({ empty = false } = {}) => {
  if (empty) return [];
  const response = await api.get("/pickups");
  return response.data.data;
};

/** → GET /api/pickups/:id */
export const getPickupById = async (id) => {
  const response = await api.get(`/pickups/${id}`);
  return response.data.data;
};

/**
 * Book a new pickup. `categories` and `estimatedWeightKg` are optional —
 * the household/organization is never forced to classify their scrap.
 *
 * For an instant pickup, `razorpayOrderId`/`razorpayPaymentId`/
 * `razorpaySignature` must come from a completed Razorpay Checkout (see
 * services/paymentService.js + BookPickupPage.jsx) — the server re-verifies
 * the signature and rejects the booking outright if it's missing or
 * invalid. Omitted entirely for scheduled pickups, which carry no fee.
 * → POST /api/pickups
 */
export const createPickup = async ({
  pickupType = "scheduled",
  pickupAddress,
  pickupDate,
  pickupTimeSlot,
  estimatedCategories = [],
  itemCount = null,
  estimatedWeightKg = null,
  classificationSource = "skipped",
  aiPrediction = null,
  imageCount = 0,
  notes = null,
  isDonation = false,
  razorpayOrderId = null,
  razorpayPaymentId = null,
  razorpaySignature = null,
}) => {
  const response = await api.post("/pickups", {
    pickupType,
    pickupAddress,
    pickupDate,
    pickupTimeSlot,
    estimatedCategories,
    itemCount,
    estimatedWeight: estimatedWeightKg,
    classificationSource,
    aiPrediction,
    imageCount,
    notes,
    isDonation,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
  return response.data.data;
};

/**
 * Upload the scrap photos selected during booking to an already-created
 * pickup. Must run AFTER createPickup succeeds — there is no pickup id to
 * attach images to before that (see BookPickupPage.jsx's confirm flow).
 *
 * Sends real files via multipart/form-data — never JSON, never base64.
 *
 * IMPORTANT: this `api` instance is created with a default
 * `Content-Type: application/json` header (services/api.js). Leaving that
 * header in place on a FormData request is a well-known axios footgun — some
 * environments don't reliably strip/override it for FormData bodies, so the
 * request can go out with the wrong Content-Type and no multipart boundary,
 * which the backend then sees as an empty upload with zero files. Explicitly
 * clearing it here (not omitting it) is what actually lets the browser set
 * the correct `multipart/form-data; boundary=...` header itself.
 *
 * → POST /api/pickups/:id/images
 * @param {string} id
 * @param {File[]} files
 * @returns {Promise<{ imageUrls: string[], pickup: object }>}
 */
export const uploadPickupImages = async (id, files) => {
  // Defensive: only ever send entries that are real File objects. If
  // something upstream handed us a malformed entry, silently sending it
  // anyway would produce the exact confusing "Attach at least one image"
  // server response — filtering it out here and failing loudly client-side
  // is far easier to diagnose.
  const validFiles = files.filter((file) => file instanceof File);
  if (validFiles.length === 0) {
    throw new Error("No valid photo files to upload — please re-select your photos and try again.");
  }

  const formData = new FormData();
  validFiles.forEach((file) => formData.append("images", file));
  const response = await api.post(`/pickups/${id}/images`, formData, {
    headers: { "Content-Type": undefined },
  });
  return response.data.data;
};

/** → PUT /api/pickups/:id/cancel */
export const cancelPickup = async (id, { reason }) => {
  const response = await api.put(`/pickups/${id}/cancel`, { reason });
  return response.data.data;
};

/** → POST /api/pickups/:id/rate */
export const rateCollector = async (id, { stars, review }) => {
  const response = await api.post(`/pickups/${id}/rate`, { stars, review });
  return response.data.data;
};

/** → PUT /api/pickups/:id/accept */
export const acceptJob = async (id) => {
  const response = await api.put(`/pickups/${id}/accept`);
  return response.data.data;
};

/**
 * Move a job forward: collector_assigned → on_the_way → in_progress.
 * → PUT /api/pickups/:id/status
 */
export const updateJobStatus = async (id, status) => {
  const response = await api.put(`/pickups/${id}/status`, { status });
  return response.data.data;
};

/** → PUT /api/pickups/:id/cancel (collector-initiated) */
export const reportJobIssue = async (id, reason) => cancelPickup(id, { reason });

/**
 * Collector's final, authoritative classification. The collector must record
 * EVERY category actually present — never just confirm the customer's
 * estimate — and the amount is always Σ(actual category × actual weight ×
 * current rate), computed server-side and never trusted from the client.
 * → PUT /api/pickups/:id/verify
 */
export const verifyAndCompletePickup = async (id, verifiedCategories) => {
  const response = await api.put(`/pickups/${id}/verify`, { verifiedCategories });
  return response.data.data;
};

export default {
  getPickupsForRole,
  getJobsForCollector,
  getPickupById,
  createPickup,
  uploadPickupImages,
  cancelPickup,
  rateCollector,
  acceptJob,
  updateJobStatus,
  reportJobIssue,
  verifyAndCompletePickup,
};

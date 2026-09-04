/**
 * Product service — marketplace listings, backed by /api/marketplace.
 *
 * Real backend throughout: browse, search, filters, sections, CRUD and
 * images all hit MongoDB through the existing axios instance. There is no
 * mock listing array anywhere in the marketplace frontend — the starter
 * listings a new user sees are real Product documents seeded server-side
 * (backend/scripts/seedMarketplace.js), indistinguishable from user-created
 * ones because they ARE the same thing.
 */

import api from "@/services/api";

/**
 * → GET /api/marketplace/products
 * @param {object} [params] - search, category, city, condition, minPrice,
 *   maxPrice, ecoVerified, sort, page, limit. Undefined/empty values are
 *   stripped so the URL never carries `?category=` with nothing after it.
 * @returns {Promise<{ products: object[], pagination: object }>}
 */
export const getProducts = async (params = {}) => {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "all")
  );
  const response = await api.get("/marketplace/products", { params: clean });
  return response.data.data;
};

/** → GET /api/marketplace/products/sections — the Browse landing rows. */
export const getProductSections = async () => {
  const response = await api.get("/marketplace/products/sections");
  return response.data.data;
};

/** → GET /api/marketplace/products/:id (also increments views server-side). */
export const getProductById = async (id) => {
  const response = await api.get(`/marketplace/products/${id}`);
  return response.data.data;
};

/**
 * → GET /api/marketplace/products/mine
 * The only endpoint that returns drafts/inactive/sold — scoped server-side
 * to the authenticated seller.
 */
export const getMyListings = async (status) => {
  const response = await api.get("/marketplace/products/mine", {
    params: status && status !== "all" ? { status } : {},
  });
  return response.data.data;
};

/** → POST /api/marketplace/products. sellerId comes from the token, not here. */
export const createProduct = async (payload) => {
  const response = await api.post("/marketplace/products", payload);
  return response.data.data;
};

/** → PUT /api/marketplace/products/:id */
export const updateProduct = async (id, payload) => {
  const response = await api.put(`/marketplace/products/${id}`, payload);
  return response.data.data;
};

/** → PATCH /api/marketplace/products/:id/sold */
export const markProductSold = async (id) => {
  const response = await api.patch(`/marketplace/products/${id}/sold`);
  return response.data.data;
};

/**
 * → DELETE /api/marketplace/products/:id
 * A listing with order history is deactivated rather than deleted — the
 * response says which happened via { deleted, deactivated }.
 */
export const deleteProduct = async (id) => {
  const response = await api.delete(`/marketplace/products/${id}`);
  return response.data.data;
};

/**
 * → POST /api/marketplace/products/:id/images
 * Multipart, never JSON or base64. Content-Type is explicitly cleared so the
 * browser sets the multipart boundary itself — the `api` instance defaults
 * to application/json, which would otherwise make the server see an empty
 * upload (the same footgun already documented in pickupService.js).
 */
export const uploadProductImages = async (id, files) => {
  const valid = files.filter((file) => file instanceof File);
  if (valid.length === 0) {
    throw new Error("No valid image files to upload — please re-select and try again.");
  }
  const formData = new FormData();
  valid.forEach((file) => formData.append("images", file));

  const response = await api.post(`/marketplace/products/${id}/images`, formData, {
    headers: { "Content-Type": undefined },
  });
  return response.data.data;
};

/** → DELETE /api/marketplace/products/:id/images/:publicId */
export const deleteProductImage = async (id, publicId) => {
  const response = await api.delete(
    `/marketplace/products/${id}/images/${encodeURIComponent(publicId)}`
  );
  return response.data.data;
};

/** → GET /api/marketplace/sellers/:id */
export const getSellerProfile = async (id) => {
  const response = await api.get(`/marketplace/sellers/${id}`);
  return response.data.data;
};

/** → GET /api/marketplace/my-stats — real aggregates for the seller panel. */
export const getMyMarketplaceStats = async () => {
  const response = await api.get("/marketplace/my-stats");
  return response.data.data;
};

/**
 * → GET /api/marketplace/eligible-pickups
 * Completed pickups this user collected, offered as a provenance source when
 * listing. Empty for anyone who has never collected — correct, not an error.
 */
export const getEligiblePickups = async () => {
  const response = await api.get("/marketplace/eligible-pickups");
  return response.data.data;
};

/**
 * → POST /api/marketplace/ai/listing
 * REAL Gemini call (backend/services/marketplaceAiService.js). Returns
 * { title, description, category } as SUGGESTIONS for the seller to edit —
 * nothing is auto-applied. Throws a 503-shaped error when Gemini is
 * unreachable rather than returning invented text.
 */
export const generateListingWithAi = async ({ notes, category, condition, material, city }) => {
  const response = await api.post("/marketplace/ai/listing", {
    notes,
    category,
    condition,
    material,
    city,
  });
  return response.data.data;
};

/**
 * → GET /api/marketplace/inventory
 * A collector's material stock: what they've collected on completed
 * pickups vs what they've already turned into listings.
 */
export const getInventory = async () => {
  const response = await api.get("/marketplace/inventory");
  return response.data.data;
};

export default {
  getProducts,
  getProductSections,
  getProductById,
  getMyListings,
  createProduct,
  updateProduct,
  markProductSold,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  getSellerProfile,
  getMyMarketplaceStats,
  getEligiblePickups,
  getInventory,
  generateListingWithAi,
};

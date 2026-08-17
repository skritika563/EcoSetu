/**
 * Address service — saved pickup addresses, backed by /api/addresses.
 *
 * Replaces the session-only address list that used to live in
 * data/pickupData.js's SAVED_ADDRESSES + local component state. Addresses now
 * persist for the signed-in user across reloads and devices.
 */

import api from "@/services/api";

/** → GET /api/addresses */
export const getAddresses = async () => {
  const response = await api.get("/addresses");
  return response.data.data;
};

/** → POST /api/addresses */
export const createAddress = async (address) => {
  const response = await api.post("/addresses", address);
  return response.data.data;
};

/** → PATCH /api/addresses/:id */
export const updateAddress = async (id, patch) => {
  const response = await api.patch(`/addresses/${id}`, patch);
  return response.data.data;
};

/** → DELETE /api/addresses/:id */
export const deleteAddress = async (id) => {
  await api.delete(`/addresses/${id}`);
};

export default { getAddresses, createAddress, updateAddress, deleteAddress };

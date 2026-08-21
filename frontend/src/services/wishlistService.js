/**
 * Wishlist service — backed by /api/marketplace/wishlist.
 *
 * Persistent in MongoDB, scoped server-side to the authenticated user.
 * Deliberately NOT localStorage: a wishlist has to survive a reload, a
 * sign-out and a device change, and localStorage does none of those.
 */

import api from "@/services/api";

/** → GET /api/marketplace/wishlist — full product objects, not just ids. */
export const getWishlist = async () => {
  const response = await api.get("/marketplace/wishlist");
  return response.data.data;
};

/** → POST /api/marketplace/wishlist/:productId (idempotent server-side). */
export const addToWishlist = async (productId) => {
  const response = await api.post(`/marketplace/wishlist/${productId}`);
  return response.data.data;
};

/** → DELETE /api/marketplace/wishlist/:productId */
export const removeFromWishlist = async (productId) => {
  const response = await api.delete(`/marketplace/wishlist/${productId}`);
  return response.data.data;
};

export default { getWishlist, addToWishlist, removeFromWishlist };

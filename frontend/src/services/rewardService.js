/**
 * Reward service — API wrapper for /api/rewards/*.
 *
 * The Eco Points redemption catalogue and this user's redemption ledger.
 * Same unwrap convention as every other service here.
 */

import api from "@/services/api";

/** → GET /api/rewards — catalogue plus the caller's live points balance. */
export const getRewards = async (category) => {
  const response = await api.get("/rewards", {
    params: category && category !== "all" ? { category } : {},
  });
  return response.data.data;
};

/** → GET /api/rewards/my-redemptions */
export const getMyRedemptions = async () => {
  const response = await api.get("/rewards/my-redemptions");
  return response.data.data;
};

/** → POST /api/rewards/:id/redeem */
export const redeemReward = async (rewardId) => {
  const response = await api.post(`/rewards/${rewardId}/redeem`);
  return response.data.data;
};

export default { getRewards, getMyRedemptions, redeemReward };

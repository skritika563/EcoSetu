/**
 * Earnings service — API wrapper for GET /api/analytics/earnings.
 *
 * A collector's money view: marketplace sales income minus what they paid
 * households at pickup. Same unwrap convention as every other service here.
 */

import api from "@/services/api";

/** @param {number} [months] - how many months of history to chart (1–24). */
export const getEarnings = async (months = 6) => {
  const response = await api.get("/analytics/earnings", { params: { months } });
  return response.data.data;
};

export default { getEarnings };

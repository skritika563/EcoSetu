/**
 * Pricing service — turns categories + weights into money.
 *
 * Pure, synchronous, and framework-free on purpose: both the collector's live
 * verification form and the completed-pickup receipt need the exact same
 * arithmetic, so it lives in one place instead of being reimplemented in JSX.
 *
 * When `/api/scrap-rates` exists, `getScrapRate`/`SCRAP_RATES` in
 * data/pricingData.js become an API-backed lookup and every function below
 * keeps working unchanged — they only take rates as input, never fetch them.
 */

import { getScrapRate, INSTANT_PICKUP_FEE } from "@/data/pricingData";

/**
 * Price one category line.
 * @param {string} category
 * @param {number} weightKg
 * @returns {{ category, weightKg, ratePerKg, amount }}
 */
export const priceCategoryLine = (category, weightKg) => {
  const ratePerKg = getScrapRate(category);
  const safeWeight = Math.max(0, Number(weightKg) || 0);
  return {
    category,
    weightKg: safeWeight,
    ratePerKg,
    amount: Math.round(safeWeight * ratePerKg * 100) / 100,
  };
};

/**
 * Price a full set of verified categories.
 * Business rule: total = Σ(actual category × actual weight × current rate).
 * Never derived from the household's estimated weight.
 *
 * @param {{category: string, weight: number}[]} verifiedCategories
 * @returns {{ lines: object[], totalAmount: number }}
 */
export const calculatePickupTotal = (verifiedCategories = []) => {
  const lines = verifiedCategories
    .filter((c) => c.category && Number(c.weight) > 0)
    .map((c) => priceCategoryLine(c.category, c.weight));

  const totalAmount = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;

  return { lines, totalAmount };
};

/**
 * Rough value range shown during booking, BEFORE the collector verifies
 * anything. Deliberately a range, not a number — nothing is guaranteed until
 * the actual weigh-in. Returns null when there isn't enough information to
 * even guess (no category and no weight).
 *
 * @param {string[]} categories - user-selected or AI-suggested (may be empty)
 * @param {number} [estimatedWeightKg]
 */
export const estimatePickupValue = (categories = [], estimatedWeightKg) => {
  if (!estimatedWeightKg || estimatedWeightKg <= 0) return null;

  const activeCategories = categories.length > 0 ? categories : ["mixed"];
  const rates = activeCategories.map(getScrapRate);
  const lowRate = Math.min(...rates);
  const highRate = Math.max(...rates);

  return {
    low: Math.round(estimatedWeightKg * lowRate),
    high: Math.round(estimatedWeightKg * highRate),
  };
};

/** Platform fee for an instant pickup; 0 for scheduled. */
export const getServiceCharge = (pickupType) => (pickupType === "instant" ? INSTANT_PICKUP_FEE : 0);

export default {
  priceCategoryLine,
  calculatePickupTotal,
  estimatePickupValue,
  getServiceCharge,
};

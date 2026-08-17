const ScrapRate = require("../models/ScrapRate");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Pricing Service — server-side pickup valuation
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The ONLY place a pickup's amount is ever calculated. The collector's client
 * sends categories + weights; this service looks up the CURRENT rate from the
 * database and computes the total — a client-supplied rate or amount is never
 * accepted or trusted, closing off the obvious "edit the request in devtools"
 * attack on payouts.
 *
 * Mirrors frontend/src/services/pricingService.js's `calculatePickupTotal`
 * shape exactly ({ lines, totalAmount }), so the API response needs no
 * reshaping on the frontend once it switches from the mock to this endpoint.
 */

/**
 * Price a set of collector-submitted category/weight pairs against current
 * database rates.
 *
 * @param {{category: string, weight: number}[]} verifiedCategories
 * @returns {Promise<{ lines: object[], totalAmount: number }>}
 * @throws if a submitted category has no active rate on record
 */
const calculatePickupTotal = async (verifiedCategories = []) => {
  const entries = verifiedCategories.filter((c) => c.category && Number(c.weight) > 0);

  if (entries.length === 0) {
    return { lines: [], totalAmount: 0 };
  }

  const categories = [...new Set(entries.map((e) => e.category))];
  const rates = await ScrapRate.find({ category: { $in: categories }, isActive: true });
  const rateByCategory = new Map(rates.map((r) => [r.category, r.pricePerKg]));

  const missing = categories.filter((c) => !rateByCategory.has(c));
  if (missing.length > 0) {
    const error = new Error(`No active rate found for categories: ${missing.join(", ")}`);
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const lines = entries.map((entry) => {
    const ratePerKg = rateByCategory.get(entry.category);
    const weightKg = Math.max(0, Number(entry.weight));
    return {
      category: entry.category,
      weightKg,
      ratePerKg,
      amount: Math.round(weightKg * ratePerKg * 100) / 100,
    };
  });

  const totalAmount = Math.round(lines.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;

  return { lines, totalAmount };
};

/** Flat platform fee for an instant pickup; 0 for scheduled. Mirrors the frontend constant. */
const INSTANT_PICKUP_FEE = 30;
const getServiceCharge = (pickupType) => (pickupType === "instant" ? INSTANT_PICKUP_FEE : 0);

module.exports = { calculatePickupTotal, getServiceCharge, INSTANT_PICKUP_FEE };

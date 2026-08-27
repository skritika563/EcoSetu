/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Scrap/Material Categories — the ONE official EcoSetu vocabulary
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every backend feature dealing in raw scrap/reusable materials — ScrapRate,
 * Pickup (estimated + collector-verified categories), pricing, and the
 * Gemini classification endpoint — imports this single list rather than
 * declaring its own copy. Before this file existed, the same "7 scrap
 * categories" vocabulary was hand-duplicated in models/Pickup.js,
 * models/ScrapRate.js and services/geminiService.js, which is exactly how
 * they drift out of sync (see: geminiService.js briefly shipped with its own
 * unrelated 7-category list that didn't match either model).
 *
 * NOT the same vocabulary as:
 *   - models/Product.js's CATEGORIES — Marketplace's own listing taxonomy
 *     (includes "diy"/"upcycled"/"electronics", concepts that don't apply to
 *     a pickup). Bridged in ONE place only, deliberately — see
 *     controllers/productController.js's PICKUP_TO_PRODUCT_CATEGORY.
 *   - models/Campaign.js's CAMPAIGN_CATEGORIES — a collection-drive's target
 *     materials, a third, separate vocabulary.
 * Do not merge any of these — they solve different problems and are allowed
 * to diverge.
 */

const SCRAP_CATEGORIES = [
  "plastic",
  "metal",
  "paper",
  "cardboard",
  "glass",
  "e-waste",
  "wooden",
  "decorations",
  "furniture",
  "books",
  "stationery",
  "home-decor",
  "others",
];

const SCRAP_CATEGORY_SET = new Set(SCRAP_CATEGORIES);

/** @returns {boolean} true only for an exact, known category string. */
const isValidScrapCategory = (category) => typeof category === "string" && SCRAP_CATEGORY_SET.has(category);

/**
 * Trims/lowercases a candidate category string and returns it only if it's a
 * real category — never silently substitutes a fallback like "others" for an
 * unrecognized value, since what to do with an invalid category is a
 * caller-specific decision (reject it, log it, etc.), not this function's.
 * @returns {string|null}
 */
const normalizeScrapCategory = (category) => {
  if (typeof category !== "string") return null;
  const normalized = category.trim().toLowerCase();
  return SCRAP_CATEGORY_SET.has(normalized) ? normalized : null;
};

/** @returns {string[]} a fresh copy — callers can't mutate the shared list. */
const getScrapCategories = () => [...SCRAP_CATEGORIES];

module.exports = {
  SCRAP_CATEGORIES,
  SCRAP_CATEGORY_SET,
  isValidScrapCategory,
  normalizeScrapCategory,
  getScrapCategories,
};

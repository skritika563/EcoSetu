/**
 * Pickup pricing data — the numbers the CLIENT-SIDE preview runs on.
 *
 * STILL MOCK, on purpose, and STILL SAFE: `GET /api/scrap-rates` is now real
 * (backend/controllers/scrapRateController.js, seeded from these exact same
 * numbers by backend/scripts/seedScrapRates.js — see RATE SOURCE below), but
 * nothing here is ever trusted. Every figure this file feeds — the booking
 * estimate range, the collector's live verification form, the receipt
 * preview — is a display-only preview; the actual amount is ALWAYS
 * recomputed server-side from the live ScrapRate collection
 * (backend/services/pricingService.js) when a pickup is verified, and the
 * client-sent rate is never trusted. Wiring this file to the API would only
 * remove a moment of duplicated numbers, not add any real behavior — so it
 * stays local and synchronous, which every component here still assumes.
 *
 * RATE SOURCE:
 * Base ₹/kg rates match backend/models/ScrapRate.js's DEFAULT_RATES — the
 * numbers already agreed as EcoSetu's canonical pricing model. The original
 * 7 track typical unorganized-sector kabadiwala rates across Indian metros
 * (plastic/PET and metal command the highest ₹/kg; glass the lowest); the 6
 * added for the 13-category expansion (wooden/decorations/furniture/books/
 * stationery/home-decor) are conservative placeholders, same as their
 * backend counterparts — see that file's own comment. Pickups pay the BASE
 * rate only — `marketMultiplier` and `quantityDiscountTiers` below exist in
 * the schema for the Marketplace resale module, not for what a collector
 * pays a household/organization at pickup.
 */

/** ₹ per kg a collector pays for verified material at pickup — mirrors backend/constants/categories.js's 13 official categories exactly. */
export const SCRAP_RATES = {
  plastic: { displayName: "Plastic", unit: "kg", pricePerKg: 18 },
  metal: { displayName: "Metal", unit: "kg", pricePerKg: 35 },
  paper: { displayName: "Paper", unit: "kg", pricePerKg: 12 },
  cardboard: { displayName: "Cardboard", unit: "kg", pricePerKg: 10 },
  glass: { displayName: "Glass", unit: "kg", pricePerKg: 4 },
  "e-waste": { displayName: "E-Waste", unit: "kg", pricePerKg: 25 },
  wooden: { displayName: "Wooden Scraps", unit: "kg", pricePerKg: 8 },
  decorations: { displayName: "Decorations", unit: "kg", pricePerKg: 6 },
  furniture: { displayName: "Furniture", unit: "kg", pricePerKg: 15 },
  books: { displayName: "Books", unit: "kg", pricePerKg: 10 },
  stationery: { displayName: "Stationery", unit: "kg", pricePerKg: 8 },
  "home-decor": { displayName: "Home Decor", unit: "kg", pricePerKg: 10 },
  others: { displayName: "Others", unit: "kg", pricePerKg: 5 },
};

/** Categories a collector can record during on-site verification. */
export const VERIFIABLE_CATEGORIES = Object.keys(SCRAP_RATES);

/**
 * Instant pickup platform fee (₹, flat).
 *
 * Scheduled pickups are free — this is the "extra charge" the spec calls for
 * on priority same-day pickups. A flat convenience fee (Urban Company /
 * Swiggy-style) rather than a percentage, so it's predictable regardless of
 * how much scrap is involved.
 */
export const INSTANT_PICKUP_FEE = 30;

export const getScrapRate = (category) => SCRAP_RATES[category]?.pricePerKg ?? SCRAP_RATES.others.pricePerKg;

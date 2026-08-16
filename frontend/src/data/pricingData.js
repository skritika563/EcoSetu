/**
 * Pickup pricing data — the numbers the pricing algorithm runs on.
 *
 * WHY THIS ISN'T IN .env:
 * .env holds infrastructure config (API URLs, Firebase keys) — values that
 * differ per deployment and are read once at boot. Scrap rates are DOMAIN
 * DATA: numeric, looked up by category throughout the UI, and destined to be
 * replaced by `GET /api/scrap-rates` (API_SPEC.md — "List rates, rate detail,
 * update base rates/multipliers (admin)"). That makes it the same kind of
 * mock data as dashboardData.js or sustainabilityData.js, so it lives here
 * under src/data/ rather than in an env file. No action needed on your side.
 *
 * RATE SOURCE:
 * Base ₹/kg rates match DATABASE_SCHEMA.md §3.3 ScrapRates "Default Seed
 * Data" — the numbers already agreed as EcoSetu's canonical pricing model,
 * which in turn track typical unorganized-sector kabadiwala rates across
 * Indian metros as of 2024–25 (plastic/PET and metal command the highest
 * ₹/kg; glass and mixed waste the lowest). Pickups pay the BASE rate only —
 * `marketMultiplier` and `quantityDiscountTiers` below exist in the schema
 * for the Marketplace resale module, not for what a collector pays a
 * household/organization at pickup.
 */

/** ₹ per kg a collector pays for verified material at pickup. */
export const SCRAP_RATES = {
  plastic: { displayName: "Plastic", unit: "kg", pricePerKg: 18 },
  metal: { displayName: "Metal", unit: "kg", pricePerKg: 35 },
  paper: { displayName: "Paper", unit: "kg", pricePerKg: 12 },
  cardboard: { displayName: "Cardboard", unit: "kg", pricePerKg: 10 },
  glass: { displayName: "Glass", unit: "kg", pricePerKg: 4 },
  "e-waste": { displayName: "E-Waste", unit: "kg", pricePerKg: 25 },
  mixed: { displayName: "Mixed Waste", unit: "kg", pricePerKg: 5 },
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
export const INSTANT_PICKUP_FEE = 79;

export const getScrapRate = (category) => SCRAP_RATES[category]?.pricePerKg ?? SCRAP_RATES.mixed.pricePerKg;

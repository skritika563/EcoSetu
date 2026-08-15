/**
 * Sustainability service — the seam between the dashboard and its data.
 *
 * Today every method resolves mock data from src/data/sustainabilityData.js.
 * When `/api/analytics` lands (API_SPEC.md §Analytics — "user impact stats,
 * trend analysis"), each method body becomes an `api.get(...)` call and no
 * component changes.
 *
 * Deliberately NOT issuing Axios requests to endpoints that don't exist yet —
 * that would produce real network failures rather than a working dashboard.
 */

import { buildSustainabilityData } from "@/data/sustainabilityData";

/** Mock latency so loading states are real rather than theoretical. */
const LATENCY_MS = 500;

const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string} role - household | organization | collector
 * @param {object} [options]
 * @param {boolean} [options.empty] - model a brand-new account
 */
const load = async (role, options) => {
  await delay();

  const data = buildSustainabilityData(role, options);
  if (!data) {
    throw new Error(`No sustainability data available for role "${role}".`);
  }
  return data;
};

/** Headline impact totals. → GET /api/analytics/impact */
export const getOverview = async (role, options) => (await load(role, options)).summary;

/** Per-month activity powering the plants and the tree. → GET /api/analytics/trends */
export const getMonthlyActivity = async (role, options) => (await load(role, options)).months;

/** Chart series + category breakdown. → GET /api/analytics/trends */
export const getImpactHistory = async (role, options) => {
  const { months, categories } = await load(role, options);
  return { months, categories };
};

/** Achievement definitions with live progress. */
export const getAchievements = async (role, options) => (await load(role, options)).achievements;

/**
 * Everything the dashboard needs in one call. Once the API exists this becomes
 * a `Promise.all` over the endpoints above.
 */
export const getSustainabilityDashboard = async (role, options) => load(role, options);

export default {
  getOverview,
  getMonthlyActivity,
  getImpactHistory,
  getAchievements,
  getSustainabilityDashboard,
};

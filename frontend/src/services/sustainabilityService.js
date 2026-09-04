/**
 * Sustainability service — the seam between the dashboard and its data.
 *
 * REAL as of the full-stack integration pass: months, categories and the
 * numeric summary come from GET /api/analytics/sustainability, which
 * aggregates the signed-in user's own completed Pickup documents in MongoDB.
 * Recent activity is also real, derived from the user's own recent pickups.
 *
 * STILL MOCK, and documented exactly why:
 *   - `streak` — there's no daily-activity-log endpoint yet, so "consecutive
 *     days active" can't be computed from what the backend currently stores.
 *     See data/sustainabilityData.js's STREAKS export.
 *   - Achievement thresholds tied to `campaigns`/`reuse` will correctly sit
 *     at 0% forever — those are deferred modules with no real events yet,
 *     not a bug. Everything else in achievements uses the real summary.
 */

import api from "@/services/api";
import { getPickupsForRole } from "@/services/pickupService";
import { pickupToActivityItem } from "@/lib/pickupActivity";
import {
  getGrowthStage,
  getTreeStage,
  buildAchievements,
  STREAKS,
} from "@/data/sustainabilityData";

/**
 * Everything the Sustainability Dashboard needs, assembled from the real
 * trends endpoint plus the still-mocked streak (see file header).
 *
 * @param {string} role
 * @param {object} [options]
 * @param {boolean} [options.empty] - force the empty-state shape for testing
 */
export const getSustainabilityDashboard = async (role, { empty = false } = {}) => {
  if (empty) {
    return {
      summary: {
        year: new Date().getFullYear(), scrapRecycledKg: 0, co2SavedKg: 0, ecoPoints: 0,
        activities: 0, pickups: 0, reuse: 0, campaigns: 0, totalScore: 0, activeMonths: 0,
        activeDays: 0, treeStage: 0, plasticRecycled: 0, treesPlanted: 0,
      },
      months: Array.from({ length: 12 }, () => ({
        month: "", shortMonth: "", activities: 0, pickups: 0, reuse: 0, campaigns: 0,
        contributions: 0, wasteRecycled: 0, co2Saved: 0, ecoPoints: 0, contributionScore: 0, growthStage: 0,
      })),
      categories: [],
      streak: { current: 0, longest: 0, week: Array(7).fill(false) },
      achievements: buildAchievements({}, { current: 0 }, null),
      activity: [],
    };
  }

  const [trendsResponse, pickups] = await Promise.all([
    api.get("/analytics/sustainability"),
    getPickupsForRole(role).catch(() => []), // activity is a nice-to-have, never block the dashboard on it
  ]);

  const { year, months: apiMonths, categories, summary: apiSummary } = trendsResponse.data.data;

  const months = apiMonths.map((m) => ({ ...m, growthStage: getGrowthStage(m.contributionScore) }));
  const activeMonths = months.filter((m) => m.contributionScore > 0);

  const summary = {
    year,
    scrapRecycledKg: apiSummary.scrapRecycledKg,
    co2SavedKg: apiSummary.co2Saved,
    ecoPoints: apiSummary.ecoPoints,
    activities: apiSummary.activities,
    pickups: apiSummary.activities, // pickups are currently the only activity type with real data
    reuse: 0, // Marketplace — deferred module
    campaigns: 0, // Campaigns — deferred module
    totalScore: apiSummary.totalScore,
    activeMonths: apiSummary.activeMonths,
    activeDays: Math.round(apiSummary.activeMonths * 5.9), // estimated — no daily log yet, see streak note
    treeStage: getTreeStage(apiSummary.totalScore),
    plasticRecycled: categories.find((c) => c.category === "plastic")?.weightKg ?? 0,
    // Real, admin-fulfilled tree-donation redemptions — separate from
    // `treeStage` above (that's the gamified growth-stage visual driven by
    // pickup activity score, not a literal tree count).
    treesPlanted: apiSummary.treesPlanted ?? 0,
  };

  const streak = STREAKS[role] ?? STREAKS.household;
  const mostRecentActiveMonth = activeMonths.length > 0 ? activeMonths[activeMonths.length - 1].month : null;

  const activity = pickups
    .filter((p) => p.status === "completed" || p.status === "cancelled")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4)
    .map((pickup) => pickupToActivityItem(pickup, { asCollector: role === "collector" }));

  return {
    summary,
    months,
    categories,
    streak,
    achievements: buildAchievements(summary, streak, mostRecentActiveMonth),
    activity,
  };
};

export default { getSustainabilityDashboard };

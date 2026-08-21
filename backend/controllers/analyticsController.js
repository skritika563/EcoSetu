const Pickup = require("../models/Pickup");
const { CO2_PER_KG } = require("../services/ecoScoreService");
const { toTitleCase } = require("../utils/textNormalize");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Analytics Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Powers two already-built, mock-data-driven surfaces:
 *   getDashboardSummary   → Home (useDashboardData.js)
 *   getSustainabilityTrends → Sustainability Dashboard (useSustainabilityData.js)
 *
 * Everything here is computed on the fly from Pickup + User documents — no
 * separate pre-aggregated Analytics collection. At this scale that's simpler
 * and can never drift from the source data; worth revisiting if the
 * collection grows large enough for aggregation cost to matter.
 *
 * No cross-user leakage: every pipeline's $match is keyed off req.user._id
 * (as userId for household/organization, as collectorId for collector) —
 * there is no user-supplied id anywhere in these queries.
 */

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);

/** Shape a Pickup doc into what DashboardHero.jsx / NextJobCard.jsx already expect. */
const toHeroShape = (pickup, { asCustomerView }) => {
  if (!pickup) return null;

  const base = {
    id: pickup._id.toString(),
    scheduledFor: pickup.pickupDate,
    timeSlot: pickup.pickupTimeSlot,
    status: pickup.status,
    pickupType: pickup.pickupType,
    estimatedWeightKg: pickup.estimatedWeight ?? null,
    address: { line: pickup.pickupAddress?.line, city: toTitleCase(pickup.pickupAddress?.city) },
  };

  if (asCustomerView) {
    // DashboardHero (household/organization) shows who's coming.
    const collector = pickup.collectorId;
    return {
      ...base,
      categories: pickup.estimatedCategories ?? [],
      collector: collector
        ? {
            name: collector.name,
            rating: collector.collectorProfile?.rating ?? 4.5,
            totalPickups: collector.totalPickups ?? 0,
            verified: collector.isVerified ?? false,
          }
        : null,
    };
  }

  // NextJobCard (collector) shows who they're going to.
  const customer = pickup.userId;
  return {
    ...base,
    customer: customer ? { name: customer.name, type: customer.role } : null,
    distanceKm: null, // no geolocation yet — component already renders this as optional
  };
};

/** GET /api/analytics/dashboard */
const getDashboardSummary = async (req, res) => {
  try {
    const { role } = req.user;

    if (role === "household" || role === "organization") {
      const [upcomingPickup, earningsAgg] = await Promise.all([
        Pickup.findOne({
          userId: req.user._id,
          status: { $in: ["pending", "collector_assigned", "on_the_way", "in_progress"] },
        })
          .sort({ pickupDate: 1 })
          .populate("collectorId", "name totalPickups isVerified collectorProfile"),
        Pickup.aggregate([
          { $match: { userId: req.user._id, status: "completed", isDonation: false } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ]);

      const scrapRecycledKg = req.user.totalWeightRecycled || 0;

      return res.status(200).json({
        success: true,
        message: "Dashboard summary retrieved",
        data: {
          impact: {
            scrapRecycledKg,
            co2SavedKg: Math.round(scrapRecycledKg * CO2_PER_KG * 10) / 10,
            moneyEarned: earningsAgg[0]?.total ?? 0,
            ecoPoints: req.user.ecoPoints || 0,
          },
          upcomingPickup: toHeroShape(upcomingPickup, { asCustomerView: true }),
        },
      });
    }

    if (role === "collector") {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = addDays(todayStart, 1);
      const weekAgo = addDays(todayStart, -6);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayAgg, nextJob, weekRows, categoryRows] = await Promise.all([
        // jobsTotal and jobsCompleted must describe the SAME population —
        // every job scheduled for pickup today — or the "X / Y" ratio on the
        // dashboard is comparing two unrelated counts (e.g. a job completed
        // today but scheduled for another day would inflate jobsCompleted
        // without ever counting toward jobsTotal, showing something like
        // "1 / 0"). Both numbers now come from one query keyed on pickupDate,
        // with jobsCompleted/earnings/weightKg conditioned on status.
        Pickup.aggregate([
          {
            $match: {
              collectorId: req.user._id,
              pickupDate: { $gte: todayStart, $lt: todayEnd },
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: null,
              jobsTotal: { $sum: 1 },
              jobsCompleted: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
              earnings: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0] } },
              weightKg: {
                $sum: {
                  $cond: [{ $eq: ["$status", "completed"] }, { $sum: "$verifiedCategories.weightKg" }, 0],
                },
              },
            },
          },
        ]),
        Pickup.findOne({
          collectorId: req.user._id,
          status: { $in: ["collector_assigned", "on_the_way", "in_progress"] },
        })
          .sort({ pickupDate: 1 })
          .populate("userId", "name role"),
        Pickup.aggregate([
          { $match: { collectorId: req.user._id, status: "completed", completedAt: { $gte: weekAgo, $lt: todayEnd } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } }, amount: { $sum: "$totalAmount" } } },
        ]),
        Pickup.aggregate([
          { $match: { collectorId: req.user._id, status: "completed", completedAt: { $gte: monthStart } } },
          { $unwind: "$verifiedCategories" },
          { $group: { _id: "$verifiedCategories.category", weightKg: { $sum: "$verifiedCategories.weightKg" } } },
        ]),
      ]);

      const weekByDate = new Map(weekRows.map((r) => [r._id, r.amount]));
      const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyEarnings = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekAgo, i);
        const key = date.toISOString().slice(0, 10);
        return { day: DAY_LABELS[date.getDay()], amount: weekByDate.get(key) ?? 0 };
      });

      return res.status(200).json({
        success: true,
        message: "Dashboard summary retrieved",
        data: {
          today: {
            jobsCompleted: todayAgg[0]?.jobsCompleted ?? 0,
            jobsTotal: todayAgg[0]?.jobsTotal ?? 0,
            earnings: todayAgg[0]?.earnings ?? 0,
            weightKg: Math.round((todayAgg[0]?.weightKg ?? 0) * 10) / 10,
          },
          nextJob: toHeroShape(nextJob, { asCustomerView: false }),
          weeklyEarnings,
          categoryBreakdown: categoryRows.map((r) => ({
            category: r._id,
            weightKg: Math.round(r.weightKg * 10) / 10,
          })),
          // Marketplace orders are a deferred module — the frontend's
          // MarketplaceOrders component already renders a correct empty state.
          orders: [],
        },
      });
    }

    return res.status(200).json({ success: true, message: "Dashboard summary retrieved", data: null });
  } catch (error) {
    console.error("Dashboard summary error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your dashboard.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/analytics/sustainability
 *
 * Monthly activity for the current year, computed from completed pickups —
 * `contributionScore`/`ecoPointsEarned` were snapshotted per-pickup at
 * completion time (services/ecoScoreService.js), so this is a straight sum,
 * never a re-derivation that could drift if the formula changes later.
 */
const getSustainabilityTrends = async (req, res) => {
  try {
    const { role } = req.user;
    const matchField = role === "collector" ? "collectorId" : "userId";
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const rows = await Pickup.aggregate([
      { $match: { [matchField]: req.user._id, status: "completed", completedAt: { $gte: yearStart, $lt: yearEnd } } },
      {
        $group: {
          _id: { $month: "$completedAt" },
          activities: { $sum: 1 },
          wasteRecycled: { $sum: { $sum: "$verifiedCategories.weightKg" } },
          ecoPoints: { $sum: "$ecoPointsEarned" },
          contributionScore: { $sum: "$contributionScore" },
          pickups: { $sum: 1 },
          reuse: { $sum: 0 }, // Marketplace reuse — deferred module, always 0 for now
          campaigns: { $sum: 0 }, // Campaigns — deferred module, always 0 for now
        },
      },
    ]);

    const categoryRows = await Pickup.aggregate([
      { $match: { [matchField]: req.user._id, status: "completed" } },
      { $unwind: "$verifiedCategories" },
      { $group: { _id: "$verifiedCategories.category", weightKg: { $sum: "$verifiedCategories.weightKg" } } },
    ]);

    const MONTH_NAMES = [
      ["January", "Jan"], ["February", "Feb"], ["March", "Mar"], ["April", "Apr"],
      ["May", "May"], ["June", "Jun"], ["July", "Jul"], ["August", "Aug"],
      ["September", "Sep"], ["October", "Oct"], ["November", "Nov"], ["December", "Dec"],
    ];
    const byMonth = new Map(rows.map((r) => [r._id, r])); // Mongo $month is 1-indexed

    const months = MONTH_NAMES.map(([month, shortMonth], i) => {
      const row = byMonth.get(i + 1);
      const wasteRecycled = Math.round((row?.wasteRecycled ?? 0) * 10) / 10;
      return {
        month,
        shortMonth,
        activities: row?.activities ?? 0,
        pickups: row?.pickups ?? 0,
        // Marketplace reuse and campaign participation/contributions are
        // deferred modules with no real data yet — 0, not aliased to pickup
        // count, so this never overstates activity that hasn't happened.
        reuse: 0,
        campaigns: 0,
        contributions: 0,
        wasteRecycled,
        co2Saved: Math.round(wasteRecycled * CO2_PER_KG * 10) / 10,
        ecoPoints: row?.ecoPoints ?? 0,
        contributionScore: row?.contributionScore ?? 0,
      };
    });

    const summary = months.reduce(
      (acc, m) => ({
        activities: acc.activities + m.activities,
        wasteRecycled: Math.round((acc.wasteRecycled + m.wasteRecycled) * 10) / 10,
        ecoPoints: acc.ecoPoints + m.ecoPoints,
        totalScore: acc.totalScore + m.contributionScore,
        activeMonths: acc.activeMonths + (m.activities > 0 ? 1 : 0),
      }),
      { activities: 0, wasteRecycled: 0, ecoPoints: 0, totalScore: 0, activeMonths: 0 }
    );

    return res.status(200).json({
      success: true,
      message: "Sustainability trends retrieved",
      data: {
        year,
        months,
        categories: categoryRows.map((r) => ({
          category: r._id,
          weightKg: Math.round(r.weightKg * 10) / 10,
        })),
        summary: {
          ...summary,
          co2Saved: Math.round(summary.wasteRecycled * CO2_PER_KG * 10) / 10,
          scrapRecycledKg: summary.wasteRecycled,
        },
      },
    });
  } catch (error) {
    console.error("Sustainability trends error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your sustainability data.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { getDashboardSummary, getSustainabilityTrends };

/**
 * Sustainability mock data.
 *
 * Every number on the Sustainability Dashboard derives from ONE source: the
 * per-month activity table below, run through ECO_SCORE_RULES. Totals, growth
 * stages, Eco Points and chart series are all computed — nothing is stated
 * twice, so the dashboard can never contradict itself.
 *
 * Shaped for the eventual `/api/analytics` endpoints (API_SPEC.md §Analytics:
 * "user impact stats, trend analysis"). Data is plain and serialisable; the UI
 * maps string keys to icons and colours.
 */

/* ─── Eco Activity Score ─────────────────────────────────────────────────────
 * The score drives the visual growth system. It is deliberately NOT just
 * kilograms: a campaign or a reuse purchase grows your garden too, so the
 * dashboard rewards the whole sustainability habit rather than weight alone.
 * Replace these weights with server-side rules when scoring moves to backend.
 */
export const ECO_SCORE_RULES = {
  pickup: { label: "Completed pickup", points: 10, unit: "each" },
  recycled: { label: "Recycled material", points: 2, unit: "per kg" },
  reuse: { label: "Marketplace reuse", points: 5, unit: "each" },
  campaign: { label: "Campaign participation", points: 10, unit: "each" },
  contribution: { label: "Campaign contribution", points: 15, unit: "each" },
};

/** kg CO₂ avoided per kg of material diverted from landfill (blended average). */
const CO2_PER_KG = 2.6;
/** Eco Points awarded per point of Eco Activity Score. */
const POINTS_PER_SCORE = 1.5;

/* ─── Growth stages ──────────────────────────────────────────────────────── */
export const GROWTH_STAGES = [
  { stage: 0, label: "Dormant", description: "No activity yet", minScore: 0 },
  { stage: 1, label: "Seedling", description: "Getting started", minScore: 1 },
  { stage: 2, label: "Young plant", description: "Building the habit", minScore: 45 },
  { stage: 3, label: "Growing", description: "Steady progress", minScore: 90 },
  { stage: 4, label: "Mature", description: "Strong month", minScore: 150 },
  { stage: 5, label: "Flourishing", description: "Outstanding month", minScore: 210 },
];

export const getGrowthStage = (score = 0) =>
  GROWTH_STAGES.reduce((best, s) => (score >= s.minScore ? s.stage : best), 0);

export const getStageMeta = (stage) => GROWTH_STAGES[stage] ?? GROWTH_STAGES[0];

/* ─── Yearly tree stages ─────────────────────────────────────────────────── */
export const TREE_STAGES = [
  { stage: 0, label: "Bare sapling", minScore: 0 },
  { stage: 1, label: "Small sapling", minScore: 60 },
  { stage: 2, label: "Young tree", minScore: 250 },
  { stage: 3, label: "Growing tree", minScore: 500 },
  { stage: 4, label: "Mature tree", minScore: 800 },
  { stage: 5, label: "Full eco canopy", minScore: 1200 },
];

export const getTreeStage = (score = 0) =>
  TREE_STAGES.reduce((best, s) => (score >= s.minScore ? s.stage : best), 0);

/* ─── Month inputs ───────────────────────────────────────────────────────────
 * [pickups, recycledKg, reuse, campaigns, contributions]
 * Months after the current one are left empty — a real year in progress.
 */
const MONTH_NAMES = [
  ["January", "Jan"], ["February", "Feb"], ["March", "Mar"], ["April", "Apr"],
  ["May", "May"], ["June", "Jun"], ["July", "Jul"], ["August", "Aug"],
  ["September", "Sep"], ["October", "Oct"], ["November", "Nov"], ["December", "Dec"],
];

const HOUSEHOLD_MONTHS = [
  [2, 3.2, 1, 0, 0],
  [3, 4.1, 2, 1, 0],
  [3, 3.8, 2, 0, 0],
  [5, 6.4, 3, 1, 1],
  [4, 5.2, 3, 1, 0],
  [6, 7.6, 5, 1, 1],
  [8, 9.4, 7, 2, 1],
  [10, 8.9, 10, 3, 1],
];

const ORGANIZATION_MONTHS = [
  [4, 48, 2, 1, 1],
  [6, 62, 3, 2, 1],
  [5, 55, 2, 1, 1],
  [9, 96, 5, 3, 2],
  [7, 74, 4, 2, 1],
  [11, 118, 6, 3, 2],
  [14, 142, 8, 4, 3],
  [16, 155, 9, 5, 3],
];

const COLLECTOR_MONTHS = [
  [38, 210, 2, 0, 0],
  [44, 248, 3, 1, 0],
  [41, 232, 2, 0, 0],
  [56, 318, 4, 1, 1],
  [49, 276, 3, 1, 0],
  [63, 356, 5, 1, 1],
  [71, 402, 6, 2, 1],
  [78, 438, 7, 2, 1],
];

/** Build a full month record from raw activity counts. */
const buildMonth = ([name, shortMonth], input) => {
  const [pickups = 0, wasteRecycled = 0, reuse = 0, campaigns = 0, contributions = 0] =
    input ?? [];

  const contributionScore =
    pickups * ECO_SCORE_RULES.pickup.points +
    Math.round(wasteRecycled * ECO_SCORE_RULES.recycled.points) +
    reuse * ECO_SCORE_RULES.reuse.points +
    campaigns * ECO_SCORE_RULES.campaign.points +
    contributions * ECO_SCORE_RULES.contribution.points;

  return {
    month: name,
    shortMonth,
    pickups,
    reuse,
    campaigns,
    contributions,
    activities: pickups + reuse + campaigns + contributions,
    wasteRecycled: Number(wasteRecycled.toFixed(1)),
    co2Saved: Number((wasteRecycled * CO2_PER_KG).toFixed(1)),
    ecoPoints: Math.round(contributionScore * POINTS_PER_SCORE),
    contributionScore,
    growthStage: getGrowthStage(contributionScore),
  };
};

const buildYear = (inputs) => MONTH_NAMES.map((n, i) => buildMonth(n, inputs[i]));

/* ─── Recycling mix (share of total weight, by role) ─────────────────────── */
const CATEGORY_MIX = {
  household: [
    ["plastic", 0.379], ["paper", 0.249], ["metal", 0.199], ["glass", 0.119], ["e-waste", 0.054],
  ],
  organization: [
    ["paper", 0.412], ["plastic", 0.263], ["e-waste", 0.152], ["metal", 0.108], ["glass", 0.065],
  ],
  collector: [
    ["plastic", 0.317], ["metal", 0.244], ["paper", 0.207], ["glass", 0.151], ["e-waste", 0.081],
  ],
};

/* ─── Achievements ───────────────────────────────────────────────────────────
 * `metric` names a total the UI resolves from the computed summary, so
 * progress is always real rather than a second hardcoded number.
 */
const ACHIEVEMENT_DEFINITIONS = [
  { id: "first-pickup", name: "First Pickup", description: "Complete your first recycling pickup.", metric: "pickups", target: 1, unit: "pickup", icon: "truck" },
  { id: "10kg-club", name: "10 KG Club", description: "Recycle 10 kg of material.", metric: "scrapRecycledKg", target: 10, unit: "kg", icon: "recycle" },
  { id: "eco-explorer", name: "Eco Explorer", description: "Take part in your first campaign.", metric: "campaigns", target: 1, unit: "campaign", icon: "compass" },
  { id: "reuse-champion", name: "Reuse Champion", description: "Complete 10 marketplace reuse activities.", metric: "reuse", target: 10, unit: "reuse", icon: "repeat" },
  { id: "eco-champion", name: "Eco Champion", description: "Reach 1,000 Eco Points.", metric: "ecoPoints", target: 1000, unit: "points", icon: "sparkles" },
  { id: "plastic-fighter", name: "Plastic Fighter", description: "Recycle 25 kg of plastic.", metric: "plasticRecycled", target: 25, unit: "kg", icon: "shield" },
  { id: "50kg-club", name: "50 KG Club", description: "Recycle 50 kg of material.", metric: "scrapRecycledKg", target: 50, unit: "kg", icon: "medal" },
  { id: "streak-keeper", name: "Streak Keeper", description: "Stay eco-active 7 days in a row.", metric: "streak", target: 7, unit: "days", icon: "flame" },
];

/* ─── Streaks (mock — a real one would come from activity timestamps) ────── */
const STREAKS = {
  household: { current: 6, longest: 14, week: [true, true, true, true, true, true, false] },
  organization: { current: 9, longest: 21, week: [true, true, true, true, true, true, false] },
  collector: { current: 12, longest: 28, week: [true, true, true, true, true, true, true] },
};

/* ─── Recent eco activity ────────────────────────────────────────────────────
 * `type` keys match the icon map already used by RecentActivity.
 */
const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString();

const RECENT_ECO_ACTIVITY = {
  general: [
    { id: "ECO-401", type: "pickup_completed", title: "Pickup completed", description: "4.2 kg collected from your doorstep", timestamp: hoursAgo(6), value: "+18 score", status: "completed" },
    { id: "ECO-398", type: "points_earned", title: "Eco Points earned", description: "Credited for this week's recycling", timestamp: hoursAgo(28), value: "+80 pts", status: "completed" },
    { id: "ECO-392", type: "campaign_joined", title: "Campaign participated", description: "Clean Bengaluru Drive", timestamp: hoursAgo(96), value: "+10 score", status: "active" },
    { id: "ECO-388", type: "marketplace_purchase", title: "Reusable item purchased", description: "Upcycled desk organizer", timestamp: hoursAgo(148), value: "+5 score", status: "delivered" },
  ],
  collector: [
    { id: "ECO-511", type: "pickup_completed", title: "Collection completed", description: "18.2 kg diverted from landfill", timestamp: hoursAgo(3), value: "+46 score", status: "completed" },
    { id: "ECO-508", type: "product_sold", title: "Material resold", description: "45 kg sorted PET returned to the supply chain", timestamp: hoursAgo(9), value: "+5 score", status: "approved" },
    { id: "ECO-502", type: "points_earned", title: "Eco Points earned", description: "Credited for August collections", timestamp: hoursAgo(30), value: "+140 pts", status: "completed" },
    { id: "ECO-497", type: "campaign_joined", title: "Drive supported", description: "Powai E-Waste Collection Drive", timestamp: hoursAgo(120), value: "+10 score", status: "active" },
  ],
};

/* ─── Assembly ───────────────────────────────────────────────────────────── */
const MONTHS_BY_ROLE = {
  household: HOUSEHOLD_MONTHS,
  organization: ORGANIZATION_MONTHS,
  collector: COLLECTOR_MONTHS,
};

const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);

/**
 * Build the full sustainability payload for a role.
 * Pass `empty: true` to model a brand-new account (all months at stage 0).
 */
export const buildSustainabilityData = (role = "household", { empty = false } = {}) => {
  // Only the roles this module targets have a sustainability journey. Anything
  // else (admin) returns null so the caller surfaces a real state rather than
  // showing someone another role's fabricated numbers.
  if (!empty && !MONTHS_BY_ROLE[role]) return null;

  const inputs = empty ? [] : MONTHS_BY_ROLE[role];
  const months = buildYear(inputs);
  const activeMonths = months.filter((m) => m.contributionScore > 0);

  const wasteRecycled = Number(sum(months, "wasteRecycled").toFixed(1));
  const totalScore = sum(months, "contributionScore");

  const mix = CATEGORY_MIX[role] ?? CATEGORY_MIX.household;
  const categories = mix.map(([category, share]) => ({
    category,
    weightKg: Number((wasteRecycled * share).toFixed(1)),
  }));

  const summary = {
    year: new Date().getFullYear(),
    // `scrapRecycledKg` / `co2SavedKg` match the impact shape already used by
    // dashboardData and ImpactSummary — one canonical contract app-wide. The
    // per-month records keep the API's `wasteRecycled` / `co2Saved` naming.
    scrapRecycledKg: wasteRecycled,
    co2SavedKg: Number(sum(months, "co2Saved").toFixed(1)),
    ecoPoints: sum(months, "ecoPoints"),
    activities: sum(months, "activities"),
    pickups: sum(months, "pickups"),
    reuse: sum(months, "reuse"),
    campaigns: sum(months, "campaigns") + sum(months, "contributions"),
    totalScore,
    activeMonths: activeMonths.length,
    activeDays: Math.round(activeMonths.length * 5.9),
    treeStage: getTreeStage(totalScore),
    plasticRecycled: Number(
      ((categories.find((c) => c.category === "plastic")?.weightKg ?? 0)).toFixed(1)
    ),
  };

  const streak = empty
    ? { current: 0, longest: 0, week: [false, false, false, false, false, false, false] }
    : STREAKS[role] ?? STREAKS.household;

  const achievements = ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const current =
      definition.metric === "streak" ? streak.current : summary[definition.metric] ?? 0;
    const unlocked = current >= definition.target;

    return {
      ...definition,
      current: Number(current.toFixed ? current.toFixed(1) : current),
      unlocked,
      // Mock unlock date: the month the threshold was likely crossed.
      unlockedAt: unlocked && activeMonths.length ? activeMonths[Math.min(activeMonths.length - 1, 2)].month : null,
    };
  });

  return {
    summary,
    months,
    categories,
    streak,
    achievements,
    activity: empty ? [] : RECENT_ECO_ACTIVITY[role === "collector" ? "collector" : "general"],
  };
};

export default buildSustainabilityData;

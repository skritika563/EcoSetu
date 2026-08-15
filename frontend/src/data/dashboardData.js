/**
 * Mock dashboard data.
 *
 * Shaped like the API responses described in API_SPEC.md so that swapping to
 * Axios later means replacing `getDashboardData` with a request — no component
 * changes. Values are plain and serialisable: no JSX, no icon components.
 * Category/status/type fields are string keys the UI maps to icons and colours.
 *
 * Dates are computed relative to "now" so the demo never reads as stale.
 */

const hoursFromNow = (hours) => new Date(Date.now() + hours * 3600_000).toISOString();
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

/* ─── Household ──────────────────────────────────────────────────────────── */
export const HOUSEHOLD_DASHBOARD = {
  impact: {
    scrapRecycledKg: 128.4,
    co2SavedKg: 92.6,
    moneyEarned: 3240,
    ecoPoints: 1450,
  },
  upcomingPickup: {
    id: "PKP-2417",
    scheduledFor: daysFromNow(1),
    timeSlot: "10:00 AM – 12:00 PM",
    status: "accepted",
    pickupType: "scheduled",
    estimatedWeightKg: 12,
    categories: ["plastic", "cardboard", "metal"],
    address: { line: "B-402, Green Meadows, Andheri West", city: "Mumbai" },
    collector: { name: "Ramesh Kumar", rating: 4.8, verified: true, totalPickups: 312 },
  },
};

/* ─── Organization (NGO / school / university) ───────────────────────────── */
export const ORGANIZATION_DASHBOARD = {
  impact: {
    scrapRecycledKg: 1842.5,
    co2SavedKg: 1320.8,
    moneyEarned: 48600,
    ecoPoints: 12400,
  },
  upcomingPickup: {
    id: "PKP-2455",
    scheduledFor: daysFromNow(2),
    timeSlot: "02:00 PM – 05:00 PM",
    status: "pending",
    pickupType: "scheduled",
    estimatedWeightKg: 180,
    categories: ["paper", "e-waste", "plastic"],
    address: { line: "Block C, Admin Building, Sector 21", city: "Pune" },
    collector: null,
  },
};

/* ─── Collector ──────────────────────────────────────────────────────────── */
export const COLLECTOR_DASHBOARD = {
  // Lifetime totals — surfaced on the Sustainability dashboard, not on Home.
  impact: {
    scrapRecycledKg: 4820.6,
    co2SavedKg: 3465.2,
    moneyEarned: 128400,
    ecoPoints: 8600,
  },
  today: {
    jobsCompleted: 3,
    jobsTotal: 8,
    earnings: 1840,
    weightKg: 96.5,
  },
  nextJob: {
    id: "JOB-8821",
    customer: { name: "Anjali Mehta", type: "household" },
    scheduledFor: hoursFromNow(1.5),
    timeSlot: "11:30 AM – 12:30 PM",
    distanceKm: 2.4,
    status: "on_the_way",
    estimatedWeightKg: 18,
    address: { line: "14, Sunrise Apartments, Kothrud", city: "Pune" },
  },
  weeklyEarnings: [
    { day: "Mon", amount: 1450 },
    { day: "Tue", amount: 1920 },
    { day: "Wed", amount: 1180 },
    { day: "Thu", amount: 2240 },
    { day: "Fri", amount: 1760 },
    { day: "Sat", amount: 2680 },
    { day: "Sun", amount: 1840 },
  ],
  categoryBreakdown: [
    { category: "plastic", weightKg: 142.5 },
    { category: "metal", weightKg: 98.2 },
    { category: "paper", weightKg: 76.4 },
    { category: "glass", weightKg: 54.8 },
    { category: "e-waste", weightKg: 31.6 },
    { category: "wooden", weightKg: 22.4 },
    { category: "decorations", weightKg: 11.2 },
  ],
  orders: [
    {
      id: "ORD-5512",
      item: "Sorted PET Bottles",
      buyer: "Green Earth NGO",
      quantityKg: 45,
      amount: 1154,
      status: "approved",
      placedAt: hoursFromNow(-5),
    },
    {
      id: "ORD-5509",
      item: "Aluminium Scrap",
      buyer: "Sunrise Public School",
      quantityKg: 12,
      amount: 588,
      status: "pending",
      placedAt: hoursFromNow(-26),
    },
    {
      id: "ORD-5501",
      item: "Corrugated Cardboard",
      buyer: "Rhea Nair",
      quantityKg: 30,
      amount: 390,
      status: "delivered",
      placedAt: hoursFromNow(-52),
    },
  ],
};

/**
 * Assemble the dashboard payload for a user.
 * Replace the body with `api.get("/analytics/dashboard")` when the endpoint exists.
 */
export const getDashboardData = (role) => {
  switch (role) {
    case "household":
      return HOUSEHOLD_DASHBOARD;
    case "organization":
      return ORGANIZATION_DASHBOARD;
    case "collector":
      return COLLECTOR_DASHBOARD;
    default:
      return null;
  }
};

/**
 * Mock recent activity feed — compact Home summary only.
 *
 * `type` maps to an icon in the UI; `status` maps to a StatusBadge tone.
 * The full history belongs to the Pickups / Rewards modules.
 */

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600_000).toISOString();

const GENERAL_ACTIVITY = [
  {
    id: "ACT-771",
    type: "pickup_completed",
    title: "Pickup completed",
    description: "12.4 kg collected by Ramesh Kumar",
    timestamp: hoursAgo(20),
    value: "+₹268",
    status: "completed",
  },
  {
    id: "ACT-768",
    type: "points_earned",
    title: "Eco Points earned",
    description: "Credited for your October recycling streak",
    timestamp: hoursAgo(26),
    value: "+120 pts",
    status: "completed",
  },
  {
    id: "ACT-764",
    type: "marketplace_purchase",
    title: "Marketplace purchase",
    description: "30 kg corrugated cardboard from Imran Shaikh",
    timestamp: hoursAgo(50),
    value: "−₹390",
    status: "delivered",
  },
  {
    id: "ACT-759",
    type: "campaign_joined",
    title: "Joined a campaign",
    description: "Campus Paper Recycling Month by Symbiosis University",
    timestamp: hoursAgo(74),
    value: null,
    status: "active",
  },
];

const COLLECTOR_ACTIVITY = [
  {
    id: "ACT-882",
    type: "pickup_completed",
    title: "Job completed",
    description: "18.2 kg from Anjali Mehta, Kothrud",
    timestamp: hoursAgo(3),
    value: "+₹412",
    status: "completed",
  },
  {
    id: "ACT-879",
    type: "product_sold",
    title: "Listing sold",
    description: "45 kg sorted PET bottles to Green Earth NGO",
    timestamp: hoursAgo(5),
    value: "+₹1,154",
    status: "approved",
  },
  {
    id: "ACT-875",
    type: "pickup_completed",
    title: "Job completed",
    description: "31.5 kg from Sunrise Public School",
    timestamp: hoursAgo(9),
    value: "+₹690",
    status: "completed",
  },
  {
    id: "ACT-870",
    type: "product_sold",
    title: "Listing sold",
    description: "30 kg corrugated cardboard to Rhea Nair",
    timestamp: hoursAgo(52),
    value: "+₹390",
    status: "delivered",
  },
];

/** Replace with `api.get("/analytics/activity")` when the endpoint exists. */
export const getRecentActivity = (role, limit = 4) =>
  (role === "collector" ? COLLECTOR_ACTIVITY : GENERAL_ACTIVITY).slice(0, limit);

/**
 * Mock collection drives / campaigns — Home preview only.
 *
 * Households see nearby drives they can join; organizations see the drives they
 * are running. Full drive management belongs to the Campaigns module.
 */

const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

/** Drives near the user — shown to households. */
export const NEARBY_CAMPAIGNS = [
  {
    id: "DRV-118",
    name: "Andheri Plastic-Free Weekend",
    organization: { name: "Green Earth NGO", organizationType: "ngo" },
    startDate: daysFromNow(3),
    location: { area: "Versova Beach", city: "Mumbai" },
    participants: 148,
    goalKg: 500,
    collectedKg: 212,
    status: "upcoming",
  },
  {
    id: "DRV-114",
    name: "E-Waste Collection Drive",
    organization: { name: "Sunrise Public School", organizationType: "school" },
    startDate: daysFromNow(6),
    location: { area: "Powai", city: "Mumbai" },
    participants: 62,
    goalKg: 250,
    collectedKg: 40,
    status: "upcoming",
  },
  {
    id: "DRV-109",
    name: "Campus Paper Recycling Month",
    organization: { name: "Symbiosis University", organizationType: "university" },
    startDate: daysFromNow(-2),
    location: { area: "Viman Nagar", city: "Pune" },
    participants: 430,
    goalKg: 1200,
    collectedKg: 845,
    status: "active",
  },
];

/** Drives the organization itself is running. */
export const ORGANIZATION_CAMPAIGNS = [
  {
    id: "DRV-121",
    name: "Zero-Waste Campus Week",
    organization: { name: "Your organization", organizationType: "university" },
    startDate: daysFromNow(-1),
    location: { area: "Main Campus", city: "Pune" },
    participants: 286,
    goalKg: 800,
    collectedKg: 512,
    status: "active",
  },
  {
    id: "DRV-125",
    name: "Neighbourhood Scrap Collection",
    organization: { name: "Your organization", organizationType: "ngo" },
    startDate: daysFromNow(5),
    location: { area: "Sector 21", city: "Pune" },
    participants: 74,
    goalKg: 400,
    collectedKg: 0,
    status: "upcoming",
  },
];

/** Replace with `api.get("/drives", { params })` when the module lands. */
export const getCampaigns = (role, limit = 3) =>
  (role === "organization" ? ORGANIZATION_CAMPAIGNS : NEARBY_CAMPAIGNS).slice(0, limit);

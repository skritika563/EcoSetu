/**
 * Mock marketplace listings — Home preview only.
 *
 * The full marketplace (browse, cart, checkout, listing management) belongs to
 * the Marketplace module. `image: null` falls back to a category tile in the UI,
 * so real Cloudinary URLs can be dropped in later without touching components.
 */

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600_000).toISOString();

export const MARKETPLACE_PREVIEW = [
  {
    id: "MTL-3312",
    name: "Sorted PET Bottles",
    category: "plastic",
    pricePerKg: 25.65,
    availableKg: 120,
    image: null,
    location: { city: "Mumbai", area: "Andheri" },
    seller: { name: "Ramesh Kumar", verified: true, rating: 4.8 },
    listedAt: hoursAgo(6),
  },
  {
    id: "MTL-3308",
    name: "Aluminium Scrap (Clean)",
    category: "metal",
    pricePerKg: 49.0,
    availableKg: 45,
    image: null,
    location: { city: "Pune", area: "Kothrud" },
    seller: { name: "Sanjay Patil", verified: true, rating: 4.6 },
    listedAt: hoursAgo(19),
  },
  {
    id: "MTL-3301",
    name: "Corrugated Cardboard Sheets",
    category: "cardboard",
    pricePerKg: 13.0,
    availableKg: 200,
    image: null,
    location: { city: "Mumbai", area: "Bandra" },
    seller: { name: "Imran Shaikh", verified: false, rating: 4.2 },
    listedAt: hoursAgo(30),
  },
  {
    id: "MTL-3294",
    name: "Mixed E-Waste Components",
    category: "e-waste",
    pricePerKg: 88.5,
    availableKg: 28,
    image: null,
    location: { city: "Pune", area: "Hinjewadi" },
    seller: { name: "Deepa Rao", verified: true, rating: 4.9 },
    listedAt: hoursAgo(44),
  },
];

/** Replace with `api.get("/materials", { params })` when the module lands. */
export const getMarketplacePreview = (limit = 4) => MARKETPLACE_PREVIEW.slice(0, limit);

/**
 * Seeds the Marketplace with a realistic set of starter listings.
 *
 * WHY SEED AT ALL: a marketplace with zero listings can't demonstrate
 * browse, search, filters or sections — every screen renders its empty
 * state and nothing can be evaluated. These are real Product documents in
 * MongoDB, served through the real API like any user-created listing; they
 * are not a frontend mock array. Nothing in the frontend knows they're seeded.
 *
 * OWNERSHIP: every seeded listing is attributed to a REAL existing user in
 * the database — a COLLECTOR, specifically (round-robin over whoever
 * exists), never a household/organization account. Selling is
 * collector-only in this app (see marketplaceRoutes.js's `sellerOnly`
 * gate) — a household/organization user was never supposed to end up
 * owning a listing, seeded or otherwise, so the seed data doesn't create
 * that state either. No fictitious seller accounts are invented.
 *
 * IDEMPOTENT PER LISTING, not all-or-nothing: each title is checked and
 * inserted independently, so adding new entries to SEED_LISTINGS later and
 * re-running only creates the ones that don't already exist — it won't skip
 * everything just because some of the set is already there. Safe to call on
 * every server boot.
 *
 * IMAGES: the first 5 listings below carry real photos (Unsplash, verified
 * reachable) rather than the "no images" fallback the rest deliberately
 * use — see the per-listing `images` field. Their `publicId` is prefixed
 * `external-seed:` specifically because it is NOT a real Cloudinary asset;
 * deleteProductImage's Cloudinary cleanup call already no-ops safely on an
 * id it doesn't recognise (see services/imageUploadService.js), so a
 * collector removing one of these photos through the app works fine, it
 * just has nothing to actually clean up on Cloudinary's side.
 *
 * Run standalone:  node scripts/seedMarketplace.js
 * Remove seed data: node scripts/seedMarketplace.js --clear
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const User = require("../models/User");

/**
 * The original 12 below deliberately carry no `images` — the UI renders a
 * clean category tile when a listing has none (see ProductCard.jsx), which
 * is honest. The 5 collector-only additions further down DO carry real
 * photos (see the file header for how that's kept honest too).
 */
const SEED_LISTINGS = [
  {
    title: "Reclaimed Teak Coffee Table",
    description:
      "Solid teak table salvaged from a heritage home renovation in Indiranagar. Minor surface scratches consistent with age, structurally sound. Ready to use as-is or refinish.",
    category: "furniture",
    condition: "good",
    material: "Reclaimed teak wood",
    price: 4200,
    quantity: 1,
    unit: "piece",
    weightKg: 18,
    location: { city: "Bengaluru", area: "Indiranagar", state: "Karnataka", pincode: "560038" },
    fulfillment: { pickup: true, delivery: false },
  },
  {
    title: "Sorted PET Bottle Flakes — Food Grade",
    description:
      "Washed and sorted clear PET flakes from post-consumer bottles. Consistent particle size, low contamination. Suitable for fibre or sheet manufacturing. Sold by weight.",
    category: "plastic",
    condition: "good",
    material: "PET (Polyethylene terephthalate)",
    price: 42,
    quantity: 250,
    unit: "kg",
    weightKg: 250,
    location: { city: "Pune", area: "Hadapsar", state: "Maharashtra", pincode: "411028" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Upcycled Denim Tote Bags (Set of 3)",
    description:
      "Handmade totes stitched from discarded denim jeans by a local women's collective. Reinforced handles, roomy main compartment. Each bag is slightly different by nature of the material.",
    category: "upcycled",
    condition: "new",
    material: "Recycled denim",
    price: 890,
    quantity: 12,
    unit: "piece",
    weightKg: 0.6,
    location: { city: "Bengaluru", area: "Jayanagar", state: "Karnataka", pincode: "560041" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Engineering Textbooks Bundle — Mechanical (12 books)",
    description:
      "Second and third year mechanical engineering textbooks. All complete, some highlighting in three of them. Includes thermodynamics, fluid mechanics and machine design titles.",
    category: "books",
    condition: "good",
    material: "Paper",
    price: 1450,
    quantity: 1,
    unit: "piece",
    weightKg: 9,
    location: { city: "Pune", area: "Kothrud", state: "Maharashtra", pincode: "411038" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Aluminium Scrap — Clean Extrusion Offcuts",
    description:
      "Clean aluminium extrusion offcuts from a fabrication workshop. No paint, no plastic thermal breaks, minimal oxidation. Ready for direct remelt.",
    category: "metal",
    condition: "good",
    material: "Aluminium 6063",
    price: 168,
    quantity: 80,
    unit: "kg",
    weightKg: 80,
    location: { city: "Bengaluru", area: "Peenya", state: "Karnataka", pincode: "560058" },
    fulfillment: { pickup: true, delivery: false },
  },
  {
    title: "Refurbished Dell OptiPlex Desktop (i5, 8GB)",
    description:
      "Office desktop refurbished and tested. Intel i5, 8GB RAM, 256GB SSD installed new. Cosmetic marks on the case. No OS licence included, no monitor or peripherals.",
    category: "electronics",
    condition: "like-new",
    material: null,
    price: 8500,
    quantity: 4,
    unit: "piece",
    weightKg: 6.5,
    location: { city: "Mumbai", area: "Andheri East", state: "Maharashtra", pincode: "400069" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Assorted Glass Jars — Cleaned (Lot of 40)",
    description:
      "Cleaned and label-free glass jars in mixed sizes from 200ml to 1L. Lids included for most. Good for preserves, storage, or craft use.",
    category: "glass",
    condition: "good",
    material: "Soda-lime glass",
    price: 480,
    quantity: 3,
    unit: "piece",
    weightKg: 14,
    location: { city: "Bengaluru", area: "Koramangala", state: "Karnataka", pincode: "560034" },
    fulfillment: { pickup: true, delivery: false },
  },
  {
    title: "Pallet Wood Planter Boxes — Handmade",
    description:
      "Planter boxes built from dismantled shipping pallets, sanded and treated with a food-safe oil finish. Drainage holes pre-drilled. Roughly 40cm × 20cm × 20cm.",
    category: "diy",
    condition: "new",
    material: "Reclaimed pine pallet wood",
    price: 650,
    quantity: 8,
    unit: "piece",
    weightKg: 3.2,
    location: { city: "Pune", area: "Baner", state: "Maharashtra", pincode: "411045" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Corrugated Cardboard Sheets — Bulk",
    description:
      "Flattened, dry corrugated sheets from a warehouse clear-out. Mostly 5-ply, consistent sizing. Suitable for recycling or reuse as packaging.",
    category: "paper",
    condition: "good",
    material: "Corrugated cardboard",
    price: 14,
    quantity: 300,
    unit: "kg",
    weightKg: 300,
    location: { city: "Mumbai", area: "Bhiwandi", state: "Maharashtra", pincode: "421302" },
    fulfillment: { pickup: true, delivery: false },
  },
  {
    title: "Bottle-Cap Mosaic Wall Art",
    description:
      "Decorative wall panel assembled from cleaned metal bottle caps on a plywood backing. Roughly 60cm square. Ready to hang, fittings included.",
    category: "home-decor",
    condition: "new",
    material: "Metal caps on plywood",
    price: 2200,
    quantity: 2,
    unit: "piece",
    weightKg: 2.8,
    location: { city: "Bengaluru", area: "Whitefield", state: "Karnataka", pincode: "560066" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Recycled Paper Notebooks (Pack of 10)",
    description:
      "A5 notebooks, 80 pages each, made from 100% post-consumer recycled paper. Unbleached covers, stitched binding. Slight colour variation between batches.",
    category: "stationery",
    condition: "new",
    material: "Recycled paper",
    price: 420,
    quantity: 25,
    unit: "piece",
    weightKg: 1.8,
    location: { city: "Pune", area: "Shivajinagar", state: "Maharashtra", pincode: "411005" },
    fulfillment: { pickup: true, delivery: true },
  },
  {
    title: "Mixed E-Waste — Circuit Boards & Components",
    description:
      "Sorted lot of populated PCBs, connectors and heatsinks recovered from decommissioned office equipment. No batteries, no CRT, no whole appliances. For certified recyclers.",
    category: "e-waste",
    condition: "for-parts",
    material: "Mixed PCB and metals",
    price: 210,
    quantity: 35,
    unit: "kg",
    weightKg: 35,
    location: { city: "Mumbai", area: "Vikhroli", state: "Maharashtra", pincode: "400083" },
    fulfillment: { pickup: true, delivery: false },
  },

  // ── Collector-only additions, with real photos ──────────────────────────
  {
    title: "Upholstered Cream Accent Chair — Barely Used",
    description:
      "Tufted cream accent chair recovered from an office refit, barely marked. Turned wooden legs, sturdy frame, no tears or stains on the upholstery. One piece.",
    category: "furniture",
    condition: "like-new",
    material: "Upholstered fabric on wood frame",
    price: 3200,
    quantity: 1,
    unit: "piece",
    weightKg: 9,
    location: { city: "Bengaluru", area: "HSR Layout", state: "Karnataka", pincode: "560102" },
    fulfillment: { pickup: true, delivery: true },
    images: [
      { url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=75", publicId: "external-seed:cream-accent-chair" },
    ],
  },
  {
    title: "Electronics Bundle — Wireless Keyboard, Mouse & Headphones",
    description:
      "Tested working set recovered from a decommissioned workstation: wireless keyboard, wireless mouse, over-ear headphones. Minor cosmetic wear, no functional issues. Sold as one bundle.",
    category: "electronics",
    condition: "good",
    material: null,
    price: 1650,
    quantity: 1,
    unit: "piece",
    weightKg: 1.4,
    location: { city: "Pune", area: "Viman Nagar", state: "Maharashtra", pincode: "411014" },
    fulfillment: { pickup: true, delivery: true },
    images: [
      { url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&q=75", publicId: "external-seed:electronics-bundle" },
    ],
  },
  {
    title: "Flattened Cardboard — Warehouse Clearance (Bulk Lot)",
    description:
      "Bulk lot of flattened, dry corrugated cardboard from a warehouse clearance. Mixed box sizes, mostly 5-ply, no wax coating or heavy tape residue. Sold by weight.",
    category: "paper",
    condition: "good",
    material: "Corrugated cardboard",
    price: 12,
    quantity: 400,
    unit: "kg",
    weightKg: 400,
    location: { city: "Mumbai", area: "Bhandup", state: "Maharashtra", pincode: "400078" },
    fulfillment: { pickup: true, delivery: false },
    images: [
      { url: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200&q=75", publicId: "external-seed:cardboard-warehouse" },
    ],
  },
  {
    title: "Preloved Paperback Fiction Bundle (15 Books)",
    description:
      "Fifteen paperback fiction titles from a personal collection, mixed genres. Good reading condition throughout, some light spine creasing. Titles vary — photo shows general condition, not the exact set.",
    category: "books",
    condition: "good",
    material: "Paper",
    price: 950,
    quantity: 1,
    unit: "piece",
    weightKg: 4.5,
    location: { city: "Bengaluru", area: "Malleshwaram", state: "Karnataka", pincode: "560003" },
    fulfillment: { pickup: true, delivery: true },
    images: [
      { url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=1200&q=75", publicId: "external-seed:paperback-bundle" },
    ],
  },
  {
    title: "Mild Steel Pipe Offcuts — Bundled",
    description:
      "Bundled mild steel pipe offcuts from a fabrication job, various lengths under 1.5m. Light surface rust, no cuts or paint contamination. Ready for direct remelt or reuse.",
    category: "metal",
    condition: "good",
    material: "Mild steel",
    price: 52,
    quantity: 120,
    unit: "kg",
    weightKg: 120,
    location: { city: "Pune", area: "Chinchwad", state: "Maharashtra", pincode: "411019" },
    fulfillment: { pickup: true, delivery: false },
    images: [
      { url: "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=1200&q=75", publicId: "external-seed:steel-pipe-offcuts" },
    ],
  },
];

const SEED_TITLES = SEED_LISTINGS.map((l) => l.title);

const seedMarketplace = async () => {
  // Per-title, not all-or-nothing: only the titles that don't already exist
  // get inserted, so extending SEED_LISTINGS later and re-running (or
  // restarting the server) fills in just what's missing.
  const existingTitles = new Set(
    (await Product.find({ title: { $in: SEED_TITLES } }).select("title")).map((d) => d.title)
  );
  const missing = SEED_LISTINGS.filter((l) => !existingTitles.has(l.title));

  if (missing.length === 0) {
    console.log(`ℹ️  All ${SEED_LISTINGS.length} seeded listings already exist — skipping seed.`);
    return;
  }

  // Collector-only — selling is collector-only in this app, so seed data
  // never attributes a listing to a household/organization account either.
  const sellers = await User.find({ role: "collector", isActive: true }).select("_id name role");

  if (sellers.length === 0) {
    console.log("⚠️  No collector accounts exist yet — skipping marketplace seed (listings need a real collector seller).");
    return;
  }

  const docs = missing.map((listing, i) => ({
    ...listing,
    sellerId: sellers[i % sellers.length]._id,
    status: "active",
    views: 0,
  }));

  await Product.insertMany(docs);
  console.log(
    `✅ Seeded ${docs.length} new marketplace listing(s) (${existingTitles.size} already existed) across ${sellers.length} collector seller(s).`
  );
};

const clearMarketplaceSeed = async () => {
  const result = await Product.deleteMany({ title: { $in: SEED_TITLES } });
  console.log(`🧹 Removed ${result.deletedCount} seeded marketplace listings.`);
};

if (require.main === module) {
  const shouldClear = process.argv.includes("--clear");
  connectDB()
    .then(shouldClear ? clearMarketplaceSeed : seedMarketplace)
    .then(() => mongoose.disconnect())
    .catch((error) => {
      console.error("❌ Marketplace seeding failed:", error.message);
      process.exit(1);
    });
}

module.exports = seedMarketplace;
module.exports.clearMarketplaceSeed = clearMarketplaceSeed;

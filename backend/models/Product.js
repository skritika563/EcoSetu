const mongoose = require("mongoose");
const { normalizeCity, isValidCityName } = require("../utils/textNormalize");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Product Model — Marketplace listing
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * One listing put up for sale by ANY authenticated user — household,
 * organization or collector. The marketplace is deliberately not
 * collector-only: collectors list recovered materials, everyone else lists
 * reusable/upcycled items, and everyone can buy.
 *
 * MARKETPLACE CATEGORIES vs WASTE CATEGORIES: these are a different, wider
 * vocabulary than models/Pickup.js's CATEGORIES (which describes raw scrap
 * being collected). A pickup deals in "plastic, metal, paper…"; a
 * marketplace listing can also be "Furniture", "Books", "Upcycled
 * Products". They overlap but are not the same list, so they stay separate
 * rather than one being bent to fit the other.
 *
 * PROVENANCE (`sourcePickup`): when a collector lists material that actually
 * came through a completed EcoSetu pickup, the pickup is referenced here.
 * That — and only that — is what earns the "Collected & verified by EcoSetu
 * Collector" badge in the UI. It is set server-side from a real, verified,
 * completed pickup owned by the listing seller; a client can never simply
 * claim it.
 */

const CATEGORIES = [
  "furniture",
  "books",
  "plastic",
  "metal",
  "glass",
  "paper",
  "electronics",
  "e-waste",
  "stationery",
  "home-decor",
  "diy",
  "upcycled",
  "others",
];

const CONDITIONS = ["new", "like-new", "good", "fair", "for-parts"];

/** draft → active → sold, with `inactive` as a seller-controlled pause. */
const STATUSES = ["draft", "active", "sold", "inactive"];

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    // Same shape as Pickup's images — publicId is kept so the exact
    // Cloudinary asset can be deleted later (see services/imageUploadService.js).
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const productLocationSchema = new mongoose.Schema(
  {
    // Canonical lowercase in storage (see utils/textNormalize.js), so
    // "Bengaluru" / "BENGALURU" / "bengalore" always match each other in
    // search, city filters, and the "nearby" listings query — display
    // casing is applied separately by the serializer.
    city: {
      type: String,
      required: true,
      trim: true,
      set: normalizeCity,
      validate: { validator: isValidCityName, message: "Enter a valid city name" },
    },
    area: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true },
    pincode: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // ── Ownership ───────────────────────────────────────────────────────────
    // Always set from req.user._id, never from the request body.
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // ── Listing content ─────────────────────────────────────────────────────
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    condition: { type: String, enum: CONDITIONS, required: true },
    /** Free-text material ("Reclaimed teak", "HDPE") — not the category enum. */
    material: { type: String, default: null, trim: true, maxlength: 80 },

    // ── Commercials ─────────────────────────────────────────────────────────
    // The ONLY authoritative price. Order totals are always computed from
    // this server-side (see services/marketplacePricingService.js) — a
    // client-supplied price or total is never trusted.
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 1 },
    /** "piece" for discrete items, "kg" for bulk material. */
    unit: { type: String, enum: ["piece", "kg"], default: "piece" },

    // ── Where it is ─────────────────────────────────────────────────────────
    location: { type: productLocationSchema, required: true },

    // ── Media ───────────────────────────────────────────────────────────────
    // Empty is valid — the UI falls back to a category tile rather than a
    // broken image (see ProductCard.jsx).
    images: { type: [productImageSchema], default: [] },

    // ── Lifecycle ───────────────────────────────────────────────────────────
    status: { type: String, enum: STATUSES, default: "active", index: true },
    /** Incremented on product-detail reads by someone other than the seller. */
    views: { type: Number, default: 0 },

    // ── Fulfillment the seller is willing to offer ──────────────────────────
    fulfillment: {
      pickup: { type: Boolean, default: true },
      delivery: { type: Boolean, default: false },
    },

    // ── Provenance ──────────────────────────────────────────────────────────
    // Set server-side only, from a real completed pickup belonging to this
    // seller. Drives the "Collected & verified by EcoSetu Collector" badge.
    sourcePickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", default: null },

    /**
     * Approximate weight of material this listing represents, in kg. Used for
     * the marketplace's "materials given a second life" eco impact figure.
     * Optional — a listing without it simply doesn't contribute to that
     * number rather than having one invented for it.
     */
    weightKg: { type: Number, default: null, min: 0 },

    soldAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Browse is always "active listings, newest first", usually narrowed by
// category and/or city — these cover the real query shapes rather than
// indexing every field speculatively.
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, category: 1, createdAt: -1 });
productSchema.index({ status: 1, "location.city": 1 });
productSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
productSchema.index({ status: 1, price: 1 });
// Text search across the fields the search box actually queries.
productSchema.index({ title: "text", description: "text", material: "text" });

productSchema.statics.CATEGORIES = CATEGORIES;
productSchema.statics.CONDITIONS = CONDITIONS;
productSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("Product", productSchema);

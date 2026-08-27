const mongoose = require("mongoose");
const { normalizeCity, isValidCityName } = require("../utils/textNormalize");
const { SCRAP_CATEGORIES } = require("../constants/categories");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Pickup Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The core record for both sides of a pickup transaction: `userId` is who
 * booked it (household/organization), `collectorId` is who it's assigned to.
 * One document serves both the customer's "my pickups" list and the
 * collector's "my jobs" list — see controllers/pickupController.js.
 *
 * Source of truth for fields: DATABASE_SCHEMA.md §3.2, extended to match the
 * already-built frontend contract (frontend/src/data/pickupData.js):
 *   - `estimatedCategories` (plural) instead of the doc's singular
 *     `estimatedCategory`, since the UI lets a user pick several chips.
 *   - `itemCount` — not in the original doc, added for the booking form's
 *     "number of items" field.
 *   - Status enum uses the simplified 5-stage vocabulary the Pickups module
 *     was actually built against (pending → collector_assigned → on_the_way →
 *     in_progress → completed, with cancelled as a terminal branch) rather
 *     than the doc's draft `accepted → collected → delivered` chain, which
 *     predates the frontend implementation.
 */

// The one official EcoSetu scrap/material vocabulary — see
// constants/categories.js. Re-exported as `Pickup.CATEGORIES` (below) so
// existing callers that already read it off the model keep working
// unchanged.
const CATEGORIES = SCRAP_CATEGORIES;
const STATUSES = ["pending", "collector_assigned", "on_the_way", "in_progress", "completed", "cancelled"];

const addressSubSchema = new mongoose.Schema(
  {
    label: { type: String, default: null },
    line: { type: String, required: true },
    // Canonical lowercase in storage (see utils/textNormalize.js) — same
    // treatment as every other city field in the app, so a collector's
    // "nearby" job matching isn't defeated by casing differences.
    city: {
      type: String,
      required: true,
      set: normalizeCity,
      validate: { validator: isValidCityName, message: "Enter a valid city name" },
    },
    state: { type: String, default: null },
    pincode: { type: String, default: null },
    landmark: { type: String, default: null },
    contactPhone: { type: String, default: null },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
);

const pickupImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    // Kept alongside the URL (not just the URL) because it's the only way to
    // delete or replace this exact Cloudinary asset later — discarding it
    // would make any future cleanup impossible without re-deriving it from
    // the URL. See services/imageUploadService.js.
    publicId: { type: String, required: true },
    // Who took this photo: the customer at booking time ("what I think I
    // have"), or the collector during on-site verification ("what's
    // actually there"). Both live in the same array — pickupController
    // tags this at upload time based on the authenticated caller's role,
    // never from anything the client claims.
    uploadedBy: { type: String, enum: ["customer", "collector"], required: true },
  },
  { _id: false }
);

const verifiedCategorySchema = new mongoose.Schema(
  {
    category: { type: String, enum: CATEGORIES, required: true },
    weightKg: { type: Number, required: true, min: 0 },
    ratePerKg: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const pickupSchema = new mongoose.Schema(
  {
    // ── Parties ─────────────────────────────────────────────────────────────
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // Optional: this pickup was booked in service of a specific Campaign
    // (see models/Campaign.js) — a household/organization can tag a booking
    // as "for" a drive they're participating in. Only ever set at creation
    // by the booking user themselves (campaignController never writes this).
    // When such a pickup completes, its verified weight is credited to the
    // campaign's collectedWeightKg (see campaignController.creditPickupToCampaign,
    // called from pickupController.verifyPickup) — the SAME real, verified
    // weight the customer/collector already produced, never a second,
    // parallel figure invented for the campaign.
    relatedCampaign: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", default: null, index: true },

    // ── Type & status ───────────────────────────────────────────────────────
    pickupType: { type: String, enum: ["scheduled", "instant"], default: "scheduled" },
    status: { type: String, enum: STATUSES, default: "pending", index: true },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // ── Scheduling ──────────────────────────────────────────────────────────
    pickupAddress: { type: addressSubSchema, required: true },
    pickupDate: { type: Date, required: true },
    pickupTimeSlot: { type: String, default: null },

    // ── User's estimate — always optional, never binding (see PROJECT rules) ─
    estimatedCategories: { type: [String], enum: CATEGORIES, default: [] },
    itemCount: { type: Number, default: null, min: 0 },
    estimatedWeight: { type: Number, default: null, min: 0 },
    classificationSource: { type: String, enum: ["ai", "manual", "skipped"], default: "skipped" },
    aiPrediction: { type: [{ category: String, confidence: Number }], default: null },
    // `imageCount` predates real uploads and used to be the only trace of
    // "how many photos the customer attached" (a plain number, never the
    // files themselves). Kept for backward compatibility; pickupController
    // keeps it in sync with the count of CUSTOMER images specifically
    // (never the collector's verification photos, so it keeps its original,
    // narrower meaning) once a real upload lands. `images` below is the
    // real, persisted data — nothing should read `imageCount` as more than
    // a count.
    imageCount: { type: Number, default: 0 },
    // The actual uploaded photos — Cloudinary secure URLs. Two sources feed
    // the same array (see `uploadedBy` above): the customer's photos from
    // booking time (POST /api/pickups/:id/images after creation — there's
    // no pickup id to attach to before that), and the collector's on-site
    // verification photos taken while the job is in progress. Empty for
    // pickups with no photos at all, and for every pickup created before
    // this feature existed.
    images: { type: [pickupImageSchema], default: [] },
    notes: { type: String, default: null, maxlength: 500 },
    isDonation: { type: Boolean, default: false },

    // ── Collector's final, authoritative classification ───────────────────
    // NEVER derived from the user's estimate — see pickupController.verifyPickup.
    verifiedCategories: { type: [verifiedCategorySchema], default: [] },
    totalAmount: { type: Number, default: 0, min: 0 },
    serviceCharge: { type: Number, default: 0, min: 0 },
    // `paymentStatus` below covers the SCRAP payout (collector → customer)
    // only. This is the OPPOSITE direction of money — the customer paying
    // the PLATFORM its ₹30 instant-pickup fee via Razorpay — so it gets its
    // own field rather than overloading `paymentStatus`'s existing meaning.
    // Verified server-side (razorpayService.verifyPaymentSignature) BEFORE
    // the pickup is ever created for an instant pickup — see
    // pickupController.createPickup. Null for every scheduled pickup, since
    // no fee applies.
    instantFeePayment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
      amount: { type: Number, default: null },
      paidAt: { type: Date, default: null },
    },
    paymentStatus: { type: String, enum: ["pending", "processing", "paid", "donated"], default: "pending" },

    // Snapshotted at completion by services/ecoScoreService.js — stored rather
    // than recomputed later so a future change to the scoring formula can't
    // silently rewrite history, and so monthly sustainability trends can be
    // aggregated straight from completed pickups without re-deriving anything.
    contributionScore: { type: Number, default: 0 },
    ecoPointsEarned: { type: Number, default: 0 },
    completedAt: { type: Date, default: null, index: true },

    // ── Post-completion ─────────────────────────────────────────────────────
    rating: {
      stars: { type: Number, min: 1, max: 5, default: null },
      review: { type: String, default: null, maxlength: 500 },
      ratedAt: { type: Date, default: null },
    },
    cancellation: {
      reason: { type: String, default: null },
      cancelledBy: { type: String, enum: ["household", "organization", "collector", "admin", null], default: null },
      cancelledAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
pickupSchema.index({ userId: 1, createdAt: -1 });
pickupSchema.index({ collectorId: 1, status: 1 });
pickupSchema.index({ status: 1, pickupDate: 1 });
pickupSchema.index({ userId: 1, status: 1 });
// Sparse (not every pickup has a fee payment — only instant ones) + unique:
// the same successfully-verified Razorpay payment can never back a second
// pickup. Without this, a signature that legitimately verified once for a
// ₹30 charge could otherwise be replayed to mint unlimited free pickups.
pickupSchema.index({ "instantFeePayment.razorpayPaymentId": 1 }, { unique: true, sparse: true });

pickupSchema.statics.CATEGORIES = CATEGORIES;
pickupSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model("Pickup", pickupSchema);

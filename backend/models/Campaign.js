const mongoose = require("mongoose");
const { normalizeCity, isValidCityName } = require("../utils/textNormalize");
const Pickup = require("./Pickup");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Campaign Model — NGO / School / University collection drives
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * OWNERSHIP: `organizerId` always refers to a User with role "organization"
 * (NGO/School/University — see User.organizationType). Creation and
 * management are gated to that role at the route level
 * (campaignRoutes.js's `organizerOnly`); this model itself doesn't repeat
 * that check, the same division of responsibility Product.js and
 * marketplaceRoutes.js already use.
 *
 * STATUS IS NEVER STORED AS A FREE FIELD THE CLIENT CAN SET. `lifecycleState`
 * only ever holds the two states an organizer explicitly controls (draft,
 * cancelled) or the neutral "published" default; the user-facing status
 * (upcoming/active/completed on top of that) is derived from dates at read
 * time by campaignSerializer.deriveStatus — see that file for why.
 *
 * COLLECTED WEIGHT has two real sources, never a typed-in total:
 *   1. `collectionLog` — entries an organizer adds on the Management
 *      dashboard for material collected in person during the drive.
 *   2. Completed Pickup documents that named this campaign
 *      (Pickup.relatedCampaign) — their own verified weight is credited
 *      here by pickupController.verifyPickup, the exact real number the
 *      pickup flow already produced.
 * `collectedWeightKg` is the running sum of both, maintained with atomic
 * $inc updates (never recomputed from the frontend, never trusted from a
 * request body) — same discipline as Product.quantity.
 *
 * CAMPAIGN TYPE vs CATEGORIES — two different vocabularies, not one:
 *   `campaignType` is what KIND of drive this is (waste collection,
 *   cleaning, plantation, awareness, exhibition) — chosen first, and it
 *   decides which further fields actually apply (see
 *   campaignController.validateCampaignFields). `categories` is WHICH
 *   materials it targets (e-waste/plastic/metal/glass/paper/mixed) — only
 *   meaningful for the two types that are actually about collecting scrap
 *   (waste_collection, cleaning_drive); a plantation or awareness drive
 *   isn't sorted by material at all, so it stays an empty array for those.
 * Multiple categories can apply to one drive (e.g. a mixed e-waste +
 * plastic collection), hence an array rather than the single `category`
 * this model started with.
 *
 * "other" IS a real type, not a fallback: when none of the five predefined
 * kinds fit, an organizer picks it and supplies `customTypeLabel` — a short
 * free-text name for what it actually is (e.g. "Bake Sale Fundraiser"),
 * required exactly when campaignType is "other" (see
 * campaignController.validateCampaignFields). Not a COLLECTION_TYPE, same
 * as plantation/awareness/exhibition — categories/weight don't apply to an
 * arbitrary drive by default either.
 */

const CAMPAIGN_TYPES = ["waste_collection", "cleaning_drive", "plantation_drive", "awareness_campaign", "exhibition", "other"];

// Types that are actually about collecting sorted scrap — the only ones
// `categories` and `targetWeightKg` are meaningful for.
const COLLECTION_CAMPAIGN_TYPES = ["waste_collection", "cleaning_drive"];

const CAMPAIGN_CATEGORIES = ["e-waste", "plastic", "metal", "glass", "paper", "mixed"];

const LIFECYCLE_STATES = ["draft", "published", "cancelled"];

const campaignImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    caption: { type: String, default: null, maxlength: 140 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const campaignLocationSchema = new mongoose.Schema(
  {
    line: { type: String, default: null, trim: true },
    area: { type: String, default: null, trim: true },
    city: {
      type: String,
      required: true,
      trim: true,
      set: normalizeCity,
      validate: { validator: isValidCityName, message: "Enter a valid city name" },
    },
    state: { type: String, default: null, trim: true },
    pincode: { type: String, default: null, trim: true },
  },
  { _id: false }
);

/**
 * One collection entry — either logged by the organizer on-site, or
 * credited automatically from a completed linked Pickup. `source`
 * distinguishes the two so the Management dashboard can show where a
 * number came from, but both count identically toward the total.
 */
const collectionLogEntrySchema = new mongoose.Schema(
  {
    category: { type: String, enum: Pickup.CATEGORIES, required: true },
    weightKg: { type: Number, required: true, min: 0 },
    source: { type: String, enum: ["organizer", "pickup"], default: "organizer" },
    relatedPickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", default: null },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const campaignSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    campaignType: { type: String, enum: CAMPAIGN_TYPES, required: true },
    // Only set (and only ever required) when campaignType is "other" — the
    // organizer's own short name for what kind of drive this actually is.
    customTypeLabel: { type: String, default: null, trim: true, maxlength: 80 },
    // Only meaningful (and only ever validated as required) for
    // COLLECTION_CAMPAIGN_TYPES — see campaignController.validateCampaignFields.
    categories: { type: [String], enum: CAMPAIGN_CATEGORIES, default: [] },

    location: { type: campaignLocationSchema, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Weight target — only meaningful for COLLECTION_CAMPAIGN_TYPES; stays
    // 0 for a plantation/awareness/exhibition drive rather than being
    // forced to carry a number that means nothing for that type.
    targetWeightKg: { type: Number, default: 0, min: 0 },
    targetParticipants: { type: Number, default: null, min: 0 },
    // Plantation-only: how many saplings the drive is aiming to plant.
    targetSaplings: { type: Number, default: null, min: 0 },
    // Awareness/exhibition-only: how many stalls/exhibitors are expected.
    expectedStalls: { type: Number, default: null, min: 0 },

    bannerImage: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    gallery: { type: [campaignImageSchema], default: [] },

    // Whether joining requires the organizer's approval before counting as
    // an active participant — checked by campaignController.joinCampaign;
    // never something the joining user can set.
    requiresApproval: { type: Boolean, default: false },

    lifecycleState: { type: String, enum: LIFECYCLE_STATES, default: "published" },
    cancellation: {
      reason: { type: String, default: null },
      cancelledAt: { type: Date, default: null },
    },

    // ── Server-maintained aggregates — never accepted from a request body ──
    participantCount: { type: Number, default: 0, min: 0 },
    volunteerCount: { type: Number, default: 0, min: 0 },
    collectedWeightKg: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0 },

    collectionLog: { type: [collectionLogEntrySchema], default: [] },
  },
  { timestamps: true }
);

campaignSchema.index({ lifecycleState: 1, startDate: 1 });
campaignSchema.index({ "location.city": 1 });
campaignSchema.index({ campaignType: 1 });
campaignSchema.index({ categories: 1 });
campaignSchema.index({ organizerId: 1, createdAt: -1 });
// Supports the search box (name/description) the same way Product does.
campaignSchema.index({ name: "text", description: "text" });

campaignSchema.statics.TYPES = CAMPAIGN_TYPES;
campaignSchema.statics.COLLECTION_TYPES = COLLECTION_CAMPAIGN_TYPES;
campaignSchema.statics.CATEGORIES = CAMPAIGN_CATEGORIES;
campaignSchema.statics.LIFECYCLE_STATES = LIFECYCLE_STATES;

module.exports = mongoose.model("Campaign", campaignSchema);

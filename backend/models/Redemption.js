const mongoose = require("mongoose");

/**
 * Redemption — an append-only record of one user spending Eco Points on
 * one Reward.
 *
 * WHY THE SNAPSHOT FIELDS: `rewardName` and `pointsSpent` are copied onto
 * the redemption rather than always read through the `rewardId` ref. A
 * reward's price or name can change later (or the reward can be
 * deactivated entirely), and a past redemption must keep showing what the
 * user ACTUALLY paid and got at the time — the same reasoning
 * Pickup.verifiedCategories uses for snapshotting rates per pickup.
 *
 * Never updated after creation except for `status` (fulfilment tracking),
 * so this doubles as the user's points-spending ledger.
 */

const REDEMPTION_STATUSES = ["issued", "fulfilled", "cancelled"];

/** Every coupon code is valid for this many days after issue. */
const COUPON_VALIDITY_DAYS = 45;

const redemptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rewardId: { type: mongoose.Schema.Types.ObjectId, ref: "Reward", required: true },

    // Snapshots — see header comment. `effect`/`effectValue` are copied the
    // same way: what this redemption code actually does must stay fixed
    // even if the reward's own effect/effectValue is edited later.
    rewardName: { type: String, required: true },
    pointsSpent: { type: Number, required: true, min: 0 },
    effect: {
      type: String,
      enum: ["none", "marketplace_discount", "pickup_fee_waiver"],
      default: "none",
    },
    effectValue: { type: Number, default: null },
    impactType: {
      type: String,
      enum: ["none", "tree_planted"],
      default: "none",
    },

    /** Short human-readable claim code shown to the user. */
    code: { type: String, required: true, unique: true },

    /**
     * Every coupon is valid for COUPON_VALIDITY_DAYS from issue — set once
     * at creation (see rewardController.redeemReward), never recomputed.
     * Enforced only where a code is actually SPENT programmatically
     * (services/redemptionService.js's findUsableRedemption/
     * consumeRedemption, used by the marketplace-discount and
     * pickup-fee-waiver flows) — a donation redemption carries this field
     * too for consistency, but an admin can still mark it fulfilled after
     * expiry, since "the tree didn't get planted in time" isn't a real
     * failure mode the way "tried to use an old discount code" is.
     */
    expiresAt: { type: Date, required: true },

    /**
     * issued    — redeemed, not yet acted on.
     * fulfilled — the promise was kept: either a "none"-effect reward an
     *             admin manually honored and marked done (see
     *             adminController's redemption endpoints — this is the
     *             answer to "how do we track donations"), or a
     *             marketplace_discount/pickup_fee_waiver code the relevant
     *             controller consumed automatically at the point of use.
     * cancelled — voided, points were not refunded automatically (see the
     *             admin cancel endpoint's own note on that).
     */
    status: { type: String, enum: REDEMPTION_STATUSES, default: "issued", index: true },
  },
  { timestamps: true }
);

// "My redemptions, newest first" is the only read shape.
redemptionSchema.index({ userId: 1, createdAt: -1 });

redemptionSchema.statics.STATUSES = REDEMPTION_STATUSES;
redemptionSchema.statics.COUPON_VALIDITY_DAYS = COUPON_VALIDITY_DAYS;

module.exports = mongoose.model("Redemption", redemptionSchema);
module.exports.REDEMPTION_STATUSES = REDEMPTION_STATUSES;
module.exports.COUPON_VALIDITY_DAYS = COUPON_VALIDITY_DAYS;

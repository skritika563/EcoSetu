const mongoose = require("mongoose");

/**
 * Reward — one item in the Eco Points redemption catalogue.
 *
 * This is the OUTFLOW side of the points economy: pickups and campaign
 * participation credit `User.ecoPoints` (see services/ecoScoreService.js),
 * and this collection is what those points can be spent on.
 *
 * STOCK: `stock: null` means unlimited (a digital voucher, a tree
 * donation), a number means a finite quantity that decrements on
 * redemption. Both are real states — nullable rather than defaulting to 0,
 * so "unlimited" can never be confused with "sold out".
 */

const REWARD_CATEGORIES = ["voucher", "eco-product", "donation", "service"];

const rewardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, enum: REWARD_CATEGORIES, required: true, index: true },

    pointsCost: { type: Number, required: true, min: 1 },

    /** null = unlimited supply; a number = finite remaining quantity. */
    stock: { type: Number, default: null, min: 0 },

    /** Optional partner/brand behind the reward ("EcoSetu", an NGO, a store). */
    partner: { type: String, default: null, trim: true, maxlength: 80 },

    /** Short line shown after redeeming ("Show this code at checkout"). */
    redemptionNote: { type: String, default: null, trim: true, maxlength: 300 },

    isActive: { type: Boolean, default: true, index: true },

    /**
     * What redeeming this reward actually DOES, beyond deducting points and
     * issuing a claim code:
     *   none                 — nothing automated (e.g. a donation — a human
     *                          honors it externally; see Redemption.status
     *                          and the admin redemptions view for tracking).
     *   marketplace_discount — effectValue rupees off one marketplace order,
     *                          applied by marketplaceOrderController when
     *                          the buyer supplies this redemption's code at
     *                          checkout.
     *   pickup_fee_waiver    — waives the instant-pickup platform fee
     *                          entirely, applied by pickupController when
     *                          the code is supplied on an instant booking.
     * effectValue is only meaningful for marketplace_discount (a rupee
     * amount) — a fee waiver is binary, so it stays null there.
     */
    effect: {
      type: String,
      enum: ["none", "marketplace_discount", "pickup_fee_waiver"],
      default: "none",
    },
    effectValue: { type: Number, default: null, min: 0 },

    /**
     * A real-world environmental outcome this reward represents, tracked
     * separately from `effect` above (which is only about automated
     * IN-APP behaviour). `tree_planted` is the first/only one — once an
     * admin marks a redemption of this reward "fulfilled" (see
     * adminController.updateRedemptionStatus), it counts toward that
     * user's "Trees planted" figure on the Sustainability Dashboard (see
     * analyticsController.getSustainabilityTrends). Extensible for future
     * donation rewards that should feed a real dashboard number instead of
     * just sitting in the redemption ledger.
     */
    impactType: {
      type: String,
      enum: ["none", "tree_planted"],
      default: "none",
    },
  },
  { timestamps: true }
);

// The catalogue is always read as "active rewards, cheapest first" —
// this covers that query shape directly.
rewardSchema.index({ isActive: 1, pointsCost: 1 });

rewardSchema.statics.CATEGORIES = REWARD_CATEGORIES;

module.exports = mongoose.model("Reward", rewardSchema);
module.exports.REWARD_CATEGORIES = REWARD_CATEGORIES;

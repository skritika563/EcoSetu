const mongoose = require("mongoose");
const crypto = require("crypto");
const Reward = require("../models/Reward");
const Redemption = require("../models/Redemption");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Reward Controller — Eco Points redemption
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The outflow side of the points economy (pickups and campaigns are the
 * inflow — see services/ecoScoreService.js).
 *
 * THE ONE RULE THAT MATTERS HERE: a points balance is money-like, so it is
 * NEVER read from the client, and never deducted with a read-then-write.
 * `redeemReward` below deducts with a single conditional `findOneAndUpdate`
 * that only matches when the balance is genuinely sufficient — so two
 * simultaneous redemptions can't both pass a check and overdraw the
 * account, and a balance can never go negative.
 */

const serializeReward = (reward) => ({
  id: reward._id.toString(),
  name: reward.name,
  description: reward.description,
  category: reward.category,
  pointsCost: reward.pointsCost,
  stock: reward.stock,
  partner: reward.partner,
  redemptionNote: reward.redemptionNote,
  effect: reward.effect,
  effectValue: reward.effectValue,
  impactType: reward.impactType,
  // Derived so the UI never has to re-implement the "unlimited vs finite"
  // rule (see Reward.js's header comment on nullable stock).
  isSoldOut: reward.stock !== null && reward.stock <= 0,
});

const serializeRedemption = (redemption) => ({
  id: redemption._id.toString(),
  rewardId: redemption.rewardId?.toString(),
  rewardName: redemption.rewardName,
  pointsSpent: redemption.pointsSpent,
  effect: redemption.effect,
  effectValue: redemption.effectValue,
  impactType: redemption.impactType,
  code: redemption.code,
  status: redemption.status,
  expiresAt: redemption.expiresAt,
  createdAt: redemption.createdAt,
});

/** Short, unambiguous claim code — no 0/O/1/I to avoid transcription errors. */
const generateCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) code += alphabet[bytes[i] % alphabet.length];
  return `ECO-${code.slice(0, 4)}-${code.slice(4)}`;
};

/** GET /api/rewards — the catalogue, plus this user's live balance. */
const listRewards = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category && category !== "all") {
      if (!Reward.CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid reward category.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      filter.category = category;
    }

    const [rewards, user] = await Promise.all([
      Reward.find(filter).sort({ pointsCost: 1 }).lean(),
      // Balance is re-read here rather than trusted from req.user, which was
      // attached at the start of the request — a redemption in another tab
      // would otherwise show a stale balance next to a live catalogue.
      User.findById(req.user._id).select("ecoPoints").lean(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Rewards retrieved",
      data: {
        balance: user?.ecoPoints ?? 0,
        rewards: rewards.map(serializeReward),
      },
    });
  } catch (error) {
    console.error("List rewards error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading rewards.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/rewards/my-redemptions — this user's redemption ledger. */
const listMyRedemptions = async (req, res) => {
  try {
    const [redemptions, spentAgg] = await Promise.all([
      Redemption.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      Redemption.aggregate([
        { $match: { userId: req.user._id, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$pointsSpent" } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Redemptions retrieved",
      data: {
        totalPointsSpent: spentAgg[0]?.total ?? 0,
        redemptions: redemptions.map(serializeRedemption),
      },
    });
  } catch (error) {
    console.error("List redemptions error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your redemptions.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** POST /api/rewards/:id/redeem */
const redeemReward = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Reward not found.", error: { code: "NOT_FOUND" } });
    }

    const reward = await Reward.findOne({ _id: id, isActive: true });
    if (!reward) {
      return res.status(404).json({ success: false, message: "Reward not found.", error: { code: "NOT_FOUND" } });
    }
    if (reward.stock !== null && reward.stock <= 0) {
      return res.status(409).json({
        success: false,
        message: "This reward is out of stock.",
        error: { code: "OUT_OF_STOCK" },
      });
    }

    // ── Atomic stock claim ────────────────────────────────────────────────
    // Only for finite-stock rewards. Claimed BEFORE points are taken so a
    // sold-out race never debits someone who won't get the item.
    if (reward.stock !== null) {
      const claimed = await Reward.findOneAndUpdate(
        { _id: reward._id, isActive: true, stock: { $gt: 0 } },
        { $inc: { stock: -1 } },
        { new: true }
      );
      if (!claimed) {
        return res.status(409).json({
          success: false,
          message: "This reward just sold out.",
          error: { code: "OUT_OF_STOCK" },
        });
      }
    }

    // ── Atomic points debit ───────────────────────────────────────────────
    // The $gte guard is the whole safety mechanism: the update only matches
    // if the balance is still sufficient at write time, so concurrent
    // redemptions cannot both succeed against the same points.
    const debited = await User.findOneAndUpdate(
      { _id: req.user._id, ecoPoints: { $gte: reward.pointsCost } },
      { $inc: { ecoPoints: -reward.pointsCost } },
      { new: true }
    ).select("ecoPoints");

    if (!debited) {
      // Give the stock back — it was claimed a moment ago for a redemption
      // that is not going to happen.
      if (reward.stock !== null) {
        await Reward.updateOne({ _id: reward._id }, { $inc: { stock: 1 } });
      }
      return res.status(400).json({
        success: false,
        message: "You don't have enough Eco Points for this reward.",
        error: { code: "INSUFFICIENT_POINTS" },
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Redemption.COUPON_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

    const redemption = await Redemption.create({
      userId: req.user._id,
      rewardId: reward._id,
      rewardName: reward.name,
      pointsSpent: reward.pointsCost,
      effect: reward.effect,
      effectValue: reward.effectValue,
      impactType: reward.impactType,
      code: generateCode(),
      expiresAt,
    });

    // Best-effort: a failed notification must not fail a completed
    // redemption the user has already paid points for.
    //
    // WORDING DEPENDS ON `effect`: a marketplace_discount/pickup_fee_waiver
    // code is genuinely spendable elsewhere in the app, so it's worth
    // surfacing prominently as "Code: X". A "none"-effect reward (a
    // donation, mainly) has no code to redeem anywhere — its `code` field
    // exists purely as a reference number for this specific redemption
    // (what an admin looks up in the Redemptions view), so the copy says
    // "Reference" instead, to not imply there's somewhere to type it in.
    const redemptionMessage =
      reward.effect === "none"
        ? `You redeemed "${reward.name}" for ${reward.pointsCost} Eco Points. Reference: ${redemption.code} — we'll notify you once it's fulfilled.`
        : `You redeemed "${reward.name}" for ${reward.pointsCost} Eco Points. Code: ${redemption.code}`;

    Notification.create({
      userId: req.user._id,
      type: "points",
      title: "Reward redeemed",
      description: redemptionMessage,
    }).catch((err) => console.error("Redemption notification failed:", err.message));

    return res.status(201).json({
      success: true,
      message: "Reward redeemed",
      data: {
        redemption: serializeRedemption(redemption),
        balance: debited.ecoPoints,
      },
    });
  } catch (error) {
    console.error("Redeem reward error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while redeeming this reward.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { listRewards, listMyRedemptions, redeemReward };

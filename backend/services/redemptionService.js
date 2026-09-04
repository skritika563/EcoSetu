const Redemption = require("../models/Redemption");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Redemption Service — applying a reward's effect at its point of use
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Shared by pickupController (pickup_fee_waiver) and
 * marketplaceOrderController (marketplace_discount) — one place that knows
 * how to safely spend a redemption code, so both controllers apply the same
 * ownership/effect/status checks rather than each re-implementing them.
 *
 * ATOMICITY: `consumeRedemption` claims the code with a single conditional
 * `findOneAndUpdate` (status must still be "issued" at write time), the same
 * pattern rewardController uses for the points debit itself — so a code
 * can never be spent twice, even under a race (two tabs, a retried
 * request).
 */

/**
 * Look up a redemption code WITHOUT consuming it — used to preview/validate
 * before an action that might still fail for other reasons (e.g. showing
 * the discount in a checkout order before payment has happened).
 *
 * @param {string} code
 * @param {import("mongoose").Types.ObjectId} userId
 * @param {"marketplace_discount"|"pickup_fee_waiver"} expectedEffect
 */
const findUsableRedemption = (code, userId, expectedEffect) =>
  Redemption.findOne({
    code: code?.trim().toUpperCase(),
    userId,
    status: "issued",
    effect: expectedEffect,
    expiresAt: { $gt: new Date() },
  });

/**
 * Atomically marks a redemption "fulfilled" — the actual spend. Only
 * succeeds if it's still "issued" at this exact moment, so this is safe to
 * call even after `findUsableRedemption` already looked it up; the
 * assumption that it's still spendable is re-checked here, not trusted.
 *
 * @returns the updated Redemption doc, or null if it was already spent/gone.
 */
const consumeRedemption = (code, userId, expectedEffect) =>
  Redemption.findOneAndUpdate(
    {
      code: code?.trim().toUpperCase(),
      userId,
      status: "issued",
      effect: expectedEffect,
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: "fulfilled" } },
    { new: true }
  );

/** Un-consumes a redemption — used to roll back if the action it was paying for ends up failing after the code was claimed (mirrors the stock-refund pattern elsewhere in this codebase). */
const restoreRedemption = (redemptionId) =>
  Redemption.updateOne({ _id: redemptionId, status: "fulfilled" }, { $set: { status: "issued" } });

module.exports = { findUsableRedemption, consumeRedemption, restoreRedemption };

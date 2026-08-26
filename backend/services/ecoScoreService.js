/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Eco Score Service — one formula, two consumers
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The Sustainability Dashboard's flower/tree growth and a user's Eco Points
 * balance must never disagree, so both are derived from this single formula
 * rather than being computed separately in two places.
 *
 * Mirrors the weighting already established in the frontend's mock
 * (src/data/sustainabilityData.js ECO_SCORE_RULES) — Marketplace reuse and
 * campaign contributions are listed there too, but those modules are
 * deferred, so only the pickup-related terms are live for now.
 */

const SCORE_RULES = {
  pickupCompleted: 10, // flat, per completed pickup
  perKgRecycled: 2, // per kg of verified weight
  // These two match ECO_SCORE_RULES.campaign / .contribution from the
  // original frontend mock (frontend/src/data/sustainabilityData.js) —
  // campaigns were anticipated there before this module existed; the
  // numbers are carried over exactly rather than re-invented.
  campaignParticipation: 10, // flat, per campaign joined/approved
  campaignVolunteering: 15, // flat, per volunteer registration approved
};

/** Eco Points awarded per point of Eco Activity Score. */
const POINTS_PER_SCORE = 1.5;

/** kg CO₂ avoided per kg of material diverted from landfill (blended average). */
const CO2_PER_KG = 2.6;

/**
 * Score (and the Eco Points it converts to) for one completed pickup.
 * @param {number} totalWeightKg - sum of the collector's verified weights
 */
const scoreForCompletedPickup = (totalWeightKg = 0) => {
  const contributionScore =
    SCORE_RULES.pickupCompleted + Math.round(Math.max(0, totalWeightKg) * SCORE_RULES.perKgRecycled);
  const ecoPoints = Math.round(contributionScore * POINTS_PER_SCORE);
  return { contributionScore, ecoPoints };
};

/**
 * Score for joining/being approved on a campaign — a flat award,
 * distinguished only by whether it's a plain participation or a
 * volunteer registration (volunteering carries a real commitment beyond
 * showing up, so it's worth more — same weighting the original mock used).
 * @param {"participant"|"volunteer"} participationType
 */
const scoreForCampaignParticipation = (participationType) => {
  const contributionScore =
    participationType === "volunteer" ? SCORE_RULES.campaignVolunteering : SCORE_RULES.campaignParticipation;
  const ecoPoints = Math.round(contributionScore * POINTS_PER_SCORE);
  return { contributionScore, ecoPoints };
};

module.exports = {
  SCORE_RULES,
  POINTS_PER_SCORE,
  CO2_PER_KG,
  scoreForCompletedPickup,
  scoreForCampaignParticipation,
};

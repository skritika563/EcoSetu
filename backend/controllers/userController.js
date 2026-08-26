const mongoose = require("mongoose");
const User = require("../models/User");
const CampaignParticipant = require("../models/CampaignParticipant");
const { deriveStatus } = require("../services/campaignSerializer");
const { toTitleCase } = require("../utils/textNormalize");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * User Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * A single, general "who is this person" profile — deliberately the SAME
 * shape whether it's opened from Marketplace (a buyer checking a seller
 * before ordering) or from Campaigns (an organizer checking a volunteer
 * before approving them). Mirrors marketplaceSerializer.serializeSeller's
 * privacy stance: a stranger gets name, role, city, verification, member
 * since, eco points and a rating (collectors only) — never email or
 * Firebase identifiers. `campaignHistory` is the one addition Marketplace's
 * seller profile never needed: what this person has joined/volunteered for,
 * which only matters once Campaigns exists.
 *
 * Deliberately public to any signed-in role, exactly like GET
 * /marketplace/sellers/:id already is — none of this is more sensitive than
 * what that endpoint already exposes to a total stranger.
 */

const notFound = (res) => res.status(404).json({ success: false, message: "User not found.", error: { code: "NOT_FOUND" } });

const serializeUserProfile = (user) => ({
  id: user._id.toString(),
  name: user.name,
  role: user.role,
  organizationType: user.role === "organization" ? user.organizationType ?? null : null,
  verified: user.isVerified ?? false,
  rating: user.role === "collector" ? (user.collectorProfile?.rating ?? null) : null,
  city: toTitleCase(user.address?.city) ?? null,
  profileImage: user.profileImage ?? null,
  ecoPoints: user.ecoPoints ?? 0,
  memberSince: user.createdAt ?? null,
});

/**
 * GET /api/users/:id/profile
 * One combined payload rather than two round trips — the profile card and
 * the campaign history list always render together on both the seller-
 * profile-style page and the organizer's volunteer/participant lookup.
 */
const getUserProfile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const user = await User.findById(req.params.id).select(
      "name role organizationType isVerified collectorProfile address profileImage createdAt ecoPoints"
    );
    if (!user) return notFound(res);

    const records = await CampaignParticipant.find({ userId: user._id, status: { $ne: "cancelled" } })
      .sort({ registeredAt: -1 })
      .limit(25)
      .populate("campaignId", "name campaignType customTypeLabel lifecycleState startDate endDate");

    const campaignHistory = records
      .filter((r) => r.campaignId) // campaign may have been hard-deleted; skip orphaned rows rather than crash
      .map((r) => ({
        campaignId: r.campaignId._id.toString(),
        name: r.campaignId.name,
        campaignType: r.campaignId.campaignType,
        customTypeLabel: r.campaignId.customTypeLabel ?? null,
        campaignStatus: deriveStatus(r.campaignId),
        participationType: r.participationType,
        participationStatus: r.status,
        joinedAt: r.registeredAt,
      }));

    return res.status(200).json({
      success: true,
      message: "User profile retrieved",
      data: {
        user: serializeUserProfile(user),
        // No bio field exists on User yet — omitted rather than invented,
        // same honesty as marketplace's getSellerProfile.
        bio: null,
        campaignHistory,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this profile.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { getUserProfile };

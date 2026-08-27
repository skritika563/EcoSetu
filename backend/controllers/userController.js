const mongoose = require("mongoose");
const User = require("../models/User");
const CampaignParticipant = require("../models/CampaignParticipant");
const { deriveStatus } = require("../services/campaignSerializer");
const { toTitleCase } = require("../utils/textNormalize");
const { uploadImageBuffer } = require("../services/imageUploadService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * User Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Provides profile viewing, profile details updating, and avatar uploading.
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
  bio: user.bio ?? null,
  ecoPoints: user.ecoPoints ?? 0,
  memberSince: user.createdAt ?? null,
});

/**
 * GET /api/users/:id/profile
 * One combined payload for user profile overview and campaign history.
 */
const getUserProfile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const user = await User.findById(req.params.id).select(
      "name role organizationType isVerified collectorProfile address profileImage bio createdAt ecoPoints"
    );
    if (!user) return notFound(res);

    const records = await CampaignParticipant.find({ userId: user._id, status: { $ne: "cancelled" } })
      .sort({ registeredAt: -1 })
      .limit(25)
      .populate("campaignId", "name campaignType customTypeLabel lifecycleState startDate endDate");

    const campaignHistory = records
      .filter((r) => r.campaignId)
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
        bio: user.bio ?? null,
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

/**
 * PUT /api/users/profile
 * Update current user's profile text fields (name, phone, bio, address).
 * Caller is authenticated via attachUser (req.user).
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, address } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must be at least 2 characters.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      updates.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone !== null && phone !== "" && !/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Phone must be a valid 10-digit Indian mobile number.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      updates.phone = phone || null;
    }

    if (bio !== undefined) {
      if (bio !== null && typeof bio === "string" && bio.trim().length > 300) {
        return res.status(400).json({
          success: false,
          message: "Bio cannot exceed 300 characters.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      updates.bio = bio ? bio.trim() : null;
    }

    if (address !== undefined && typeof address === "object" && address !== null) {
      updates.address = {
        street: address.street ?? req.user.address?.street ?? null,
        city: address.city ?? req.user.address?.city ?? null,
        state: address.state ?? req.user.address?.state ?? null,
        pincode: address.pincode ?? req.user.address?.pincode ?? null,
        coordinates: address.coordinates ?? req.user.address?.coordinates ?? { lat: null, lng: null },
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user: updatedUser.toPublicProfile() },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/users/upload-avatar
 * Stream uploaded avatar image to Cloudinary and update profileImage.
 */
const uploadAvatar = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const publicId = `avatar_${req.user._id}_${Date.now()}`;
    const result = await uploadImageBuffer(file.buffer, {
      folder: `ecosetu/avatars`,
      publicId,
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: result.url },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile avatar updated successfully.",
      data: {
        profileImage: updatedUser.profileImage,
        user: updatedUser.toPublicProfile(),
      },
    });
  } catch (error) {
    console.error("Upload avatar error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to upload avatar.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { getUserProfile, updateProfile, uploadAvatar };


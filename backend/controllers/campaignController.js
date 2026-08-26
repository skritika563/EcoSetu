const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignParticipant = require("../models/CampaignParticipant");
const Pickup = require("../models/Pickup");
const User = require("../models/User");
const {
  deriveStatus,
  serializeCampaign,
  serializeParticipant,
  POPULATE_FIELDS,
} = require("../services/campaignSerializer");
const { serializePickup, POPULATE_FIELDS: PICKUP_POPULATE_FIELDS } = require("../services/pickupSerializer");
const { scoreForCampaignParticipation, CO2_PER_KG } = require("../services/ecoScoreService");
const { notify } = require("../services/notificationService");
const { uploadImageBuffer, deleteImage } = require("../services/imageUploadService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Campaign Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * SECURITY INVARIANTS (all enforced here, none trusted from the client):
 *   - organizerId  = req.user._id, always — never a body field
 *   - ownership of a campaign is re-checked on every mutating request against
 *     req.user._id, so an organization can never touch another's campaign
 *   - status (draft/upcoming/active/completed/cancelled) is DERIVED from
 *     dates + lifecycleState by campaignSerializer.deriveStatus — a client
 *     can never set it directly; only `cancel` is an explicit action
 *   - participantCount/volunteerCount/collectedWeightKg are server-maintained
 *     counters, only ever changed via atomic $inc here, never accepted from
 *     a request body
 *   - eco points / CO2 figures are computed server-side (ecoScoreService),
 *     never trusted from the frontend
 *   - duplicate join/volunteer prevented by CampaignParticipant's own unique
 *     compound index, not just a check-then-insert
 */

const populateCampaign = (query) => query.populate("organizerId", POPULATE_FIELDS.organizer);
const populateParticipant = (query) => query.populate("userId", POPULATE_FIELDS.participantUser);

const isOwner = (campaign, userId) =>
  (campaign.organizerId?._id ?? campaign.organizerId)?.toString() === userId.toString();

const notFound = (res) =>
  res.status(404).json({ success: false, message: "Campaign not found.", error: { code: "NOT_FOUND" } });

const validationError = (res, message, details) =>
  res.status(400).json({
    success: false,
    message,
    error: { code: "VALIDATION_ERROR", ...(details ? { details } : {}) },
  });

const forbidden = (res, message) =>
  res.status(403).json({ success: false, message, error: { code: "FORBIDDEN_ROLE" } });

/**
 * Shared field validation for create + update. Returns an error string or
 * null. `categories`/`targetWeightKg` are only required for the two
 * COLLECTION_TYPES (waste_collection, cleaning_drive) — a plantation,
 * awareness or exhibition drive isn't sorted by scrap material at all, so
 * demanding one there would just force a meaningless answer.
 */
const validateCampaignFields = ({
  name,
  description,
  campaignType,
  customTypeLabel,
  categories,
  location,
  startDate,
  endDate,
  targetWeightKg,
}) => {
  if (!name?.trim() || name.trim().length < 3) return "Campaign name must be at least 3 characters.";
  if (!description?.trim() || description.trim().length < 10) return "Description must be at least 10 characters.";
  if (!Campaign.TYPES.includes(campaignType)) return `Campaign type must be one of: ${Campaign.TYPES.join(", ")}.`;
  if (campaignType === "other" && !customTypeLabel?.trim()) {
    return "Give this custom campaign type a short name.";
  }

  const isCollectionType = Campaign.COLLECTION_TYPES.includes(campaignType);
  if (isCollectionType) {
    if (!Array.isArray(categories) || categories.length === 0) {
      return "Choose at least one material category for a collection drive.";
    }
    if (categories.some((c) => !Campaign.CATEGORIES.includes(c))) {
      return `Categories must be one of: ${Campaign.CATEGORIES.join(", ")}.`;
    }
    if (targetWeightKg == null || Number.isNaN(Number(targetWeightKg)) || Number(targetWeightKg) < 0) {
      return "Target weight must be zero or more.";
    }
  }

  if (!location?.city?.trim()) return "Location city is required.";
  if (!startDate || !endDate) return "Start and end dates are required.";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Invalid start or end date.";
  if (end < start) return "End date must be on or after the start date.";
  return null;
};

/**
 * GET /api/campaigns
 * Every authenticated role may browse. Draft campaigns never appear here —
 * only the organizer sees their own drafts, via listMyCampaigns.
 */
const listCampaigns = async (req, res) => {
  try {
    const { search, campaignType, category, status, city, organizationId, sort = "newest", page = 1, limit = 20 } = req.query;

    const query = { lifecycleState: { $ne: "draft" } };

    if (campaignType && Campaign.TYPES.includes(campaignType)) query.campaignType = campaignType;
    // `category` singular is accepted too — matches one material against
    // the `categories` array field.
    if (category && Campaign.CATEGORIES.includes(category)) query.categories = category;
    if (organizationId && mongoose.isValidObjectId(organizationId)) query.organizerId = organizationId;
    if (city) query["location.city"] = new RegExp(`^${city.trim()}$`, "i");
    if (search?.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ name: rx }, { description: rx }, { "location.city": rx }, { "location.area": rx }];
    }

    // Status is derived, not stored — approximate it with the same date
    // logic deriveStatus uses, so filtering by status matches what the
    // list actually displays.
    const now = new Date();
    if (status === "upcoming") {
      query.lifecycleState = "published";
      query.startDate = { $gt: now };
    } else if (status === "active") {
      query.lifecycleState = "published";
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === "completed") {
      query.lifecycleState = "published";
      query.endDate = { $lt: now };
    } else if (status === "cancelled") {
      query.lifecycleState = "cancelled";
    }

    const SORTS = {
      newest: { createdAt: -1 },
      "starting-soon": { startDate: 1 },
      "most-participants": { participantCount: -1 },
      "target-progress": { collectedWeightKg: -1 },
    };
    const sortSpec = SORTS[sort] ?? SORTS.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const [campaigns, total] = await Promise.all([
      populateCampaign(Campaign.find(query))
        .sort(sortSpec)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Campaign.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Campaigns retrieved",
      data: {
        campaigns: campaigns.map((c) => serializeCampaign(c, { isOwner: isOwner(c, req.user._id) })),
        pagination: { total, page: pageNum, limit: limitNum, hasMore: pageNum * limitNum < total },
      },
    });
  } catch (error) {
    console.error("List campaigns error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading campaigns.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/campaigns/mine — organizer's own campaigns, drafts and cancelled included. */
const listMyCampaigns = async (req, res) => {
  try {
    const query = { organizerId: req.user._id };
    if (req.query.status) {
      const now = new Date();
      if (req.query.status === "draft") query.lifecycleState = "draft";
      else if (req.query.status === "cancelled") query.lifecycleState = "cancelled";
      else if (req.query.status === "upcoming") Object.assign(query, { lifecycleState: "published", startDate: { $gt: now } });
      else if (req.query.status === "active")
        Object.assign(query, { lifecycleState: "published", startDate: { $lte: now }, endDate: { $gte: now } });
      else if (req.query.status === "completed") Object.assign(query, { lifecycleState: "published", endDate: { $lt: now } });
    }

    const campaigns = await populateCampaign(Campaign.find(query).sort({ createdAt: -1 }));
    return res.status(200).json({
      success: true,
      message: "Your campaigns retrieved",
      data: campaigns.map((c) => serializeCampaign(c, { isOwner: true })),
    });
  } catch (error) {
    console.error("List my campaigns error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your campaigns.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/campaigns/mine/participation
 * Campaigns the signed-in user has joined (as participant and/or
 * volunteer) — powers a household/collector's "My Campaigns" list and is
 * where certificate access starts from.
 */
const listMyParticipation = async (req, res) => {
  try {
    const query = { userId: req.user._id };
    if (req.query.type && CampaignParticipant.PARTICIPATION_TYPES.includes(req.query.type)) {
      query.participationType = req.query.type;
    }
    if (req.query.status && CampaignParticipant.STATUSES.includes(req.query.status)) {
      query.status = req.query.status;
    }

    const participations = await CampaignParticipant.find(query).sort({ registeredAt: -1 });
    const campaignIds = participations.map((p) => p.campaignId);
    const campaigns = await populateCampaign(Campaign.find({ _id: { $in: campaignIds } }));
    const campaignMap = new Map(campaigns.map((c) => [c._id.toString(), c]));

    const results = participations
      .map((p) => {
        const campaign = campaignMap.get(p.campaignId.toString());
        if (!campaign) return null;
        return {
          ...serializeCampaign(campaign, { isOwner: false }),
          viewerParticipation: {
            participationType: p.participationType,
            status: p.status,
            cancelledBy: p.cancelledBy ?? null,
            registeredAt: p.registeredAt,
            attendedAt: p.attendedAt,
            certificateIssued: p.certificateIssued,
            participantId: p._id.toString(),
          },
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, message: "Your participation retrieved", data: results });
  } catch (error) {
    console.error("List my participation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your campaigns.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/campaigns/:id */
const getCampaignById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const campaign = await populateCampaign(Campaign.findById(req.params.id));
    if (!campaign) return notFound(res);

    const owner = isOwner(campaign, req.user._id);
    // A draft is only ever visible to its own organizer.
    if (campaign.lifecycleState === "draft" && !owner) return notFound(res);

    if (!owner) {
      // Views count real distinct visits from non-owners, best-effort —
      // never blocks the response if it fails.
      Campaign.updateOne({ _id: campaign._id }, { $inc: { views: 1 } }).catch(() => {});
    }

    const myParticipation = await CampaignParticipant.find({ campaignId: campaign._id, userId: req.user._id });
    const viewerParticipation = {
      participant: myParticipation.find((p) => p.participationType === "participant") ?? null,
      volunteer: myParticipation.find((p) => p.participationType === "volunteer") ?? null,
    };

    // The Impact section (spec §7) is visible to EVERY viewer, not just the
    // owner — unlike the richer owner-only Analytics endpoint, this is just
    // a small honest summary. totalEcoPointsGenerated is the one figure
    // that can't be derived from the public campaign fields alone (it's a
    // sum across individual participation records), so it's computed here,
    // once, server-side — never trusted from anywhere else.
    const ecoPointsAgg = await CampaignParticipant.aggregate([
      { $match: { campaignId: campaign._id, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$ecoPointsEarned" } } },
    ]);
    const collectedWeightKg = campaign.collectedWeightKg ?? 0;
    const impact = {
      collectedWeightKg,
      co2SavedKg: Math.round(collectedWeightKg * CO2_PER_KG * 10) / 10,
      totalEcoPointsGenerated: ecoPointsAgg[0]?.total ?? 0,
      participantCount: campaign.participantCount,
      volunteerCount: campaign.volunteerCount,
      weightProgressPercent:
        campaign.targetWeightKg > 0 ? Math.min(100, Math.round((collectedWeightKg / campaign.targetWeightKg) * 100)) : 0,
      participantProgressPercent:
        campaign.targetParticipants > 0
          ? Math.min(100, Math.round((campaign.participantCount / campaign.targetParticipants) * 100))
          : null,
    };

    return res.status(200).json({
      success: true,
      message: "Campaign retrieved",
      data: {
        ...serializeCampaign(campaign, {
          isOwner: owner,
          viewerParticipation: {
            isParticipant: !!viewerParticipation.participant && viewerParticipation.participant.status !== "cancelled",
            participantStatus: viewerParticipation.participant?.status ?? null,
            isVolunteer: !!viewerParticipation.volunteer && viewerParticipation.volunteer.status !== "cancelled",
            volunteerStatus: viewerParticipation.volunteer?.status ?? null,
          },
        }),
        impact,
      },
    });
  } catch (error) {
    console.error("Get campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/campaigns
 * Role: organization only (route-level `organizerOnly` gate — this
 * controller doesn't re-check the role, matching productController's
 * division of responsibility between routes and controllers).
 */
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      description,
      campaignType,
      customTypeLabel,
      categories,
      location,
      startDate,
      endDate,
      targetWeightKg,
      targetParticipants,
      targetSaplings,
      expectedStalls,
      requiresApproval,
      status,
    } = req.body;

    const invalid = validateCampaignFields({
      name,
      description,
      campaignType,
      customTypeLabel,
      categories,
      location,
      startDate,
      endDate,
      targetWeightKg,
    });
    if (invalid) return validationError(res, invalid);

    const isCollectionType = Campaign.COLLECTION_TYPES.includes(campaignType);

    const campaign = await Campaign.create({
      organizerId: req.user._id,
      name: name.trim(),
      description: description.trim(),
      campaignType,
      customTypeLabel: campaignType === "other" ? customTypeLabel.trim() : null,
      // Only stored for collection types — a plantation/awareness/
      // exhibition drive keeps an empty array regardless of what was sent,
      // so it can never end up carrying a meaningless material tag.
      categories: isCollectionType ? categories : [],
      location: {
        line: location.line?.trim() || null,
        area: location.area?.trim() || null,
        city: location.city.trim(),
        state: location.state?.trim() || null,
        pincode: location.pincode?.trim() || null,
      },
      startDate,
      endDate,
      targetWeightKg: isCollectionType ? Number(targetWeightKg) : 0,
      targetParticipants: targetParticipants != null && targetParticipants !== "" ? Number(targetParticipants) : null,
      targetSaplings:
        campaignType === "plantation_drive" && targetSaplings != null && targetSaplings !== "" ? Number(targetSaplings) : null,
      expectedStalls:
        ["awareness_campaign", "exhibition"].includes(campaignType) && expectedStalls != null && expectedStalls !== ""
          ? Number(expectedStalls)
          : null,
      requiresApproval: !!requiresApproval,
      // Same convention as ListingForm's draft/active — only these two are
      // ever accepted here; "cancelled" is a dedicated action.
      lifecycleState: status === "draft" ? "draft" : "published",
    });

    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);

    return res.status(201).json({
      success: true,
      message: "Campaign created",
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return validationError(res, "Validation failed.", Object.values(error.errors).map((e) => e.message));
    }
    console.error("Create campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating your campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/campaigns/:id — owner only. Ownership re-checked here, server-side. */
const updateCampaign = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);
    if (campaign.lifecycleState === "cancelled") {
      return validationError(res, "A cancelled campaign can no longer be edited.");
    }

    const {
      name,
      description,
      campaignType,
      customTypeLabel,
      categories,
      location,
      startDate,
      endDate,
      targetWeightKg,
      targetParticipants,
      targetSaplings,
      expectedStalls,
      requiresApproval,
      status,
    } = req.body;

    const merged = {
      name: name ?? campaign.name,
      description: description ?? campaign.description,
      campaignType: campaignType ?? campaign.campaignType,
      customTypeLabel: customTypeLabel ?? campaign.customTypeLabel,
      categories: categories ?? campaign.categories,
      location: location ?? campaign.location,
      startDate: startDate ?? campaign.startDate,
      endDate: endDate ?? campaign.endDate,
      targetWeightKg: targetWeightKg ?? campaign.targetWeightKg,
    };
    const invalid = validateCampaignFields(merged);
    if (invalid) return validationError(res, invalid);

    const effectiveType = campaignType ?? campaign.campaignType;
    const isCollectionType = Campaign.COLLECTION_TYPES.includes(effectiveType);

    if (name !== undefined) campaign.name = name.trim();
    if (description !== undefined) campaign.description = description.trim();
    if (campaignType !== undefined) campaign.campaignType = campaignType;
    if (customTypeLabel !== undefined) campaign.customTypeLabel = effectiveType === "other" ? customTypeLabel.trim() : null;
    else if (effectiveType !== "other") campaign.customTypeLabel = null;
    if (categories !== undefined) campaign.categories = isCollectionType ? categories : [];
    if (!isCollectionType) {
      // Switched away from a collection type (or always wasn't one) —
      // these fields stop meaning anything, so they're cleared rather
      // than left stale.
      campaign.categories = [];
      campaign.targetWeightKg = 0;
    }
    if (location !== undefined) {
      campaign.location = {
        line: location.line?.trim() || null,
        area: location.area?.trim() || null,
        city: location.city.trim(),
        state: location.state?.trim() || null,
        pincode: location.pincode?.trim() || null,
      };
    }
    if (startDate !== undefined) campaign.startDate = startDate;
    if (endDate !== undefined) campaign.endDate = endDate;
    if (targetWeightKg !== undefined && isCollectionType) campaign.targetWeightKg = Number(targetWeightKg);
    if (targetParticipants !== undefined) {
      campaign.targetParticipants = targetParticipants === "" || targetParticipants == null ? null : Number(targetParticipants);
    }
    if (targetSaplings !== undefined) {
      campaign.targetSaplings =
        effectiveType === "plantation_drive" && targetSaplings !== "" && targetSaplings != null ? Number(targetSaplings) : null;
    }
    if (expectedStalls !== undefined) {
      campaign.expectedStalls =
        ["awareness_campaign", "exhibition"].includes(effectiveType) && expectedStalls !== "" && expectedStalls != null
          ? Number(expectedStalls)
          : null;
    }
    if (requiresApproval !== undefined) campaign.requiresApproval = !!requiresApproval;
    // A draft can be published this way; an already-published campaign
    // cannot be forced back to draft (it may already have participants).
    if (status === "published" && campaign.lifecycleState === "draft") campaign.lifecycleState = "published";

    await campaign.save();
    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);

    return res.status(200).json({
      success: true,
      message: "Campaign updated",
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return validationError(res, "Validation failed.", Object.values(error.errors).map((e) => e.message));
    }
    console.error("Update campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating your campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/campaigns/:id/cancel — owner only. The one explicit status transition. */
const cancelCampaign = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    if (campaign.lifecycleState === "cancelled") {
      return validationError(res, "This campaign is already cancelled.");
    }

    campaign.lifecycleState = "cancelled";
    campaign.cancellation = { reason: req.body?.reason?.trim() || "Cancelled by organizer", cancelledAt: new Date() };
    await campaign.save();
    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);

    // Tell everyone who joined — a cancelled drive is exactly the kind of
    // change a participant needs to know about.
    const participants = await CampaignParticipant.find({ campaignId: campaign._id, status: { $ne: "cancelled" } });
    await Promise.all(
      participants.map((p) =>
        notify({
          userId: p.userId,
          type: "campaign",
          title: "Campaign cancelled",
          description: `"${campaign.name}" has been cancelled by the organizer.`,
          relatedCampaign: campaign._id,
        })
      )
    );

    return res.status(200).json({
      success: true,
      message: "Campaign cancelled",
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    console.error("Cancel campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while cancelling your campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * DELETE /api/campaigns/:id — owner only. Only allowed with zero
 * participants/volunteers ever registered; otherwise the organizer is
 * pointed at Cancel instead, so a campaign with real history is never
 * silently erased (mirrors productController.deleteProduct's
 * deactivate-instead-of-delete rule for listings with order history).
 */
const deleteCampaign = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const hasParticipants = await CampaignParticipant.exists({ campaignId: campaign._id });
    if (hasParticipants) {
      return res.status(409).json({
        success: false,
        message: "This campaign already has participants — cancel it instead of deleting.",
        error: { code: "CONFLICT" },
      });
    }

    const cloudinaryAssets = [
      ...(campaign.bannerImage?.publicId ? [campaign.bannerImage.publicId] : []),
      ...(campaign.gallery ?? []).map((img) => img.publicId),
    ];
    await Promise.all(cloudinaryAssets.map((id) => deleteImage(id)));
    await campaign.deleteOne();

    return res.status(200).json({ success: true, message: "Campaign deleted", data: { deleted: true } });
  } catch (error) {
    console.error("Delete campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting your campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/campaigns/:id/banner — owner only. Single image; replaces any
 * existing banner (the old Cloudinary asset is cleaned up).
 */
const uploadBanner = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const file = req.files?.[0];
    if (!file) return validationError(res, "No banner image was uploaded.");

    const uploaded = await uploadImageBuffer(file.buffer, {
      folder: `ecosetu/campaigns/${campaign._id}`,
      publicId: "banner",
    });

    const previousPublicId = campaign.bannerImage?.publicId;
    campaign.bannerImage = { url: uploaded.url, publicId: uploaded.publicId };
    await campaign.save();
    if (previousPublicId && previousPublicId !== uploaded.publicId) await deleteImage(previousPublicId);

    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);
    return res.status(200).json({
      success: true,
      message: "Banner uploaded",
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    console.error("Upload campaign banner error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while uploading the banner.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** POST /api/campaigns/:id/gallery — owner only. Multiple images at once. */
const uploadGalleryImages = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const files = req.files ?? [];
    if (files.length === 0) return validationError(res, "No images were uploaded.");

    const uploaded = await Promise.all(
      files.map((file, i) =>
        uploadImageBuffer(file.buffer, {
          folder: `ecosetu/campaigns/${campaign._id}/gallery`,
          publicId: `${Date.now()}-${i}`,
        })
      )
    );

    campaign.gallery.push(...uploaded.map((img) => ({ url: img.url, publicId: img.publicId })));
    await campaign.save();
    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);

    return res.status(200).json({
      success: true,
      message: `${uploaded.length} image(s) added to the gallery`,
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    console.error("Upload campaign gallery error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while uploading gallery images.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** DELETE /api/campaigns/:id/gallery/:imageId — owner only. */
const deleteGalleryImage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const image = campaign.gallery.id(req.params.imageId);
    if (!image) return validationError(res, "That image isn't in this campaign's gallery.");

    const publicId = image.publicId;
    campaign.gallery.pull({ _id: req.params.imageId });
    await campaign.save();
    await deleteImage(publicId);

    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);
    return res.status(200).json({
      success: true,
      message: "Image removed",
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    console.error("Delete campaign gallery image error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while removing the image.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * Shared join logic for both participants and volunteers.
 * `req.user` may never join their own campaign.
 */
const registerForCampaign = async (req, res, participationType) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || campaign.lifecycleState === "draft") return notFound(res);

    if (isOwner(campaign, req.user._id)) {
      return forbidden(res, "You organize this campaign, so you can't join it as a participant.");
    }

    const status = deriveStatus(campaign);
    if (status === "completed" || status === "cancelled") {
      return validationError(res, `This campaign is ${status} and no longer accepting registrations.`);
    }

    // Volunteering always needs an explicit organizer nod; plain
    // participation is auto-approved unless the campaign says otherwise.
    const initialStatus = participationType === "volunteer" || campaign.requiresApproval ? "registered" : "approved";

    // Leaving never deletes the row (it soft-cancels — see
    // unregisterFromCampaign), and the compound unique index means a plain
    // insert on rejoin would always collide with that cancelled row. So
    // rejoin first tries to REVIVE an existing cancelled row for this exact
    // (campaign, user, participationType); only when there isn't one does it
    // fall through to a real insert, which is what actually catches a
    // genuine duplicate (already active) registration via the unique index.
    let participant = await CampaignParticipant.findOneAndUpdate(
      { campaignId: campaign._id, userId: req.user._id, participationType, status: "cancelled" },
      {
        $set: {
          status: initialStatus,
          registeredAt: new Date(),
          respondedAt: initialStatus === "approved" ? new Date() : null,
          cancelledAt: null,
          cancelledBy: null,
          cancelReason: null,
          contributionScore: 0,
          ecoPointsEarned: 0,
          certificateIssued: false,
        },
      },
      { new: true }
    );

    if (!participant) {
      try {
        participant = await CampaignParticipant.create({
          campaignId: campaign._id,
          userId: req.user._id,
          participationType,
          status: initialStatus,
          respondedAt: initialStatus === "approved" ? new Date() : null,
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message: `You've already ${participationType === "volunteer" ? "volunteered for" : "joined"} this campaign.`,
            error: { code: "CONFLICT" },
          });
        }
        throw error;
      }
    }

    if (initialStatus === "approved") {
      const { contributionScore, ecoPoints } = scoreForCampaignParticipation(participationType);
      participant.contributionScore = contributionScore;
      participant.ecoPointsEarned = ecoPoints;
      await participant.save();

      await User.findByIdAndUpdate(req.user._id, { $inc: { ecoPoints } });
      const counterField = participationType === "volunteer" ? "volunteerCount" : "participantCount";
      await Campaign.updateOne({ _id: campaign._id }, { $inc: { [counterField]: 1 } });

      await notify({
        userId: req.user._id,
        type: "campaign",
        title: `You joined "${campaign.name}"`,
        description: `You earned ${ecoPoints} Eco Points for joining as a ${participationType}.`,
        relatedCampaign: campaign._id,
      });
    } else {
      await notify({
        userId: req.user._id,
        type: "campaign",
        title: `Registered for "${campaign.name}"`,
        description:
          participationType === "volunteer"
            ? "Your volunteer registration is pending the organizer's approval."
            : "Your registration is pending the organizer's approval.",
        relatedCampaign: campaign._id,
      });
    }

    await notify({
      userId: campaign.organizerId,
      type: "campaign",
      title: `New ${participationType}`,
      description: `${req.user.name} ${participationType === "volunteer" ? "volunteered for" : "joined"} "${campaign.name}".`,
      relatedCampaign: campaign._id,
    });

    return res.status(201).json({
      success: true,
      message: initialStatus === "approved" ? "You're participating" : "Registration submitted",
      data: serializeParticipant(participant),
    });
  } catch (error) {
    console.error("Register for campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while registering for this campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** Shared leave logic — soft-cancels the caller's own row, never someone else's. */
const unregisterFromCampaign = async (req, res, participationType) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const participant = await CampaignParticipant.findOne({
      campaignId: req.params.id,
      userId: req.user._id,
      participationType,
    });
    if (!participant || participant.status === "cancelled") {
      return res.status(404).json({
        success: false,
        message: `You haven't ${participationType === "volunteer" ? "volunteered for" : "joined"} this campaign.`,
        error: { code: "NOT_FOUND" },
      });
    }

    const wasCounted = participant.status === "approved" || participant.status === "attended";
    participant.status = "cancelled";
    participant.cancelledAt = new Date();
    participant.cancelledBy = "self";
    await participant.save();

    if (wasCounted) {
      const counterField = participationType === "volunteer" ? "volunteerCount" : "participantCount";
      await Campaign.updateOne({ _id: participant.campaignId }, { $inc: { [counterField]: -1 } });
    }

    return res.status(200).json({ success: true, message: "Registration cancelled", data: serializeParticipant(participant) });
  } catch (error) {
    console.error("Unregister from campaign error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while cancelling your registration.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

const joinCampaign = (req, res) => registerForCampaign(req, res, "participant");
const leaveCampaign = (req, res) => unregisterFromCampaign(req, res, "participant");
const volunteerForCampaign = (req, res) => registerForCampaign(req, res, "volunteer");
const leaveVolunteering = (req, res) => unregisterFromCampaign(req, res, "volunteer");

/** Shared list logic for GET .../participants and GET .../volunteers — owner only. */
const listCampaignPeople = async (req, res, participationType) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const query = { campaignId: campaign._id, participationType };
    if (req.query.status && CampaignParticipant.STATUSES.includes(req.query.status)) query.status = req.query.status;

    const people = await populateParticipant(CampaignParticipant.find(query).sort({ registeredAt: -1 }));
    return res.status(200).json({
      success: true,
      message: `${participationType === "volunteer" ? "Volunteers" : "Participants"} retrieved`,
      data: people.map(serializeParticipant),
    });
  } catch (error) {
    console.error("List campaign people error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this list.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

const listParticipants = (req, res) => listCampaignPeople(req, res, "participant");
const listVolunteers = (req, res) => listCampaignPeople(req, res, "volunteer");

/**
 * PATCH /api/campaigns/:id/participants/:participantId — owner only.
 * Body: { status: "approved" | "cancelled" }. Awards points on the
 * transition INTO "approved", exactly once (checked via contributionScore
 * still being 0, so re-approving is a safe no-op rather than a double
 * award).
 */
const updateParticipantStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.participantId)) {
      return notFound(res);
    }
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const participant = await CampaignParticipant.findOne({ _id: req.params.participantId, campaignId: campaign._id });
    if (!participant) return notFound(res);

    const { status } = req.body;
    if (!["approved", "cancelled"].includes(status)) {
      return validationError(res, "Status must be either 'approved' or 'cancelled'.");
    }
    if (participant.status === "attended") {
      return validationError(res, "This person has already attended — status can no longer be changed here.");
    }

    const wasApproved = participant.status === "approved";
    participant.status = status;
    participant.respondedAt = new Date();
    if (status === "cancelled") {
      participant.cancelledAt = new Date();
      participant.cancelledBy = "organizer";
    }

    let pointsAwarded = 0;
    if (status === "approved" && !wasApproved && participant.contributionScore === 0) {
      const { contributionScore, ecoPoints } = scoreForCampaignParticipation(participant.participationType);
      participant.contributionScore = contributionScore;
      participant.ecoPointsEarned = ecoPoints;
      pointsAwarded = ecoPoints;
    }
    await participant.save();

    // Keep the counters honest against the transition that just happened.
    const counterField = participant.participationType === "volunteer" ? "volunteerCount" : "participantCount";
    if (status === "approved" && !wasApproved) {
      await Campaign.updateOne({ _id: campaign._id }, { $inc: { [counterField]: 1 } });
    } else if (status === "cancelled" && wasApproved) {
      await Campaign.updateOne({ _id: campaign._id }, { $inc: { [counterField]: -1 } });
    }
    if (pointsAwarded > 0) await User.findByIdAndUpdate(participant.userId, { $inc: { ecoPoints: pointsAwarded } });

    await notify({
      userId: participant.userId,
      type: "campaign",
      title: status === "approved" ? "Registration approved" : "Registration declined",
      description: `Your ${participant.participationType} registration for "${campaign.name}" was ${status === "approved" ? "approved" : "declined"}.`,
      relatedCampaign: campaign._id,
    });

    return res.status(200).json({ success: true, message: "Status updated", data: serializeParticipant(participant) });
  } catch (error) {
    console.error("Update participant status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating this registration.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PATCH /api/campaigns/:id/participants/:participantId/attendance — owner only.
 * Body: { attended: boolean }. This is the ONLY thing certificate
 * eligibility for a volunteer is gated on.
 */
const markAttendance = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.participantId)) {
      return notFound(res);
    }
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const participant = await CampaignParticipant.findOne({ _id: req.params.participantId, campaignId: campaign._id });
    if (!participant) return notFound(res);
    if (participant.status === "cancelled") {
      return validationError(res, "This registration was cancelled and can't be marked attended.");
    }
    if (participant.status === "registered") {
      return validationError(res, "Approve this registration before marking attendance.");
    }

    const { attended } = req.body;
    participant.status = attended ? "attended" : "approved";
    participant.attendedAt = attended ? new Date() : null;
    await participant.save();

    return res.status(200).json({ success: true, message: "Attendance updated", data: serializeParticipant(participant) });
  } catch (error) {
    console.error("Mark attendance error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while recording attendance.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/campaigns/:id/collection — owner only.
 * Body: { category, weightKg }. On-the-spot material logged during the
 * drive — the organizer sends category + weight, the server does the
 * summing; nothing about the running total is ever accepted directly.
 */
const recordCollection = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const { category, weightKg } = req.body;
    if (!Pickup.CATEGORIES.includes(category)) {
      return validationError(res, `Category must be one of: ${Pickup.CATEGORIES.join(", ")}.`);
    }
    const weight = Number(weightKg);
    if (Number.isNaN(weight) || weight <= 0) return validationError(res, "Weight must be greater than zero.");

    campaign.collectionLog.push({ category, weightKg: weight, source: "organizer", recordedBy: req.user._id });
    campaign.collectedWeightKg = (campaign.collectedWeightKg ?? 0) + weight;
    await campaign.save();
    await campaign.populate("organizerId", POPULATE_FIELDS.organizer);

    return res.status(201).json({
      success: true,
      message: "Collection recorded",
      data: serializeCampaign(campaign, { isOwner: true }),
    });
  } catch (error) {
    console.error("Record collection error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while recording this collection.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/campaigns/:id/pickups — owner only. Reuses real Pickup data, no duplicate records. */
const listCampaignPickups = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const pickups = await Pickup.find({ relatedCampaign: campaign._id })
      .populate("userId", PICKUP_POPULATE_FIELDS.user)
      .populate("collectorId", PICKUP_POPULATE_FIELDS.collector)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Campaign pickups retrieved",
      data: pickups.map(serializePickup),
    });
  } catch (error) {
    console.error("List campaign pickups error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading pickups for this campaign.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/campaigns/:id/analytics — owner only.
 * Every number here is a real aggregate over CampaignParticipant /
 * Campaign.collectionLog — nothing is invented, nothing is accepted from
 * the request.
 */
const getCampaignAnalytics = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !isOwner(campaign, req.user._id)) return notFound(res);

    const [participantGrowth, ecoPointsAgg] = await Promise.all([
      // Cumulative-friendly: one row per day a registration happened, per type.
      CampaignParticipant.aggregate([
        { $match: { campaignId: campaign._id, status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$registeredAt" } }, type: "$participationType" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]),
      CampaignParticipant.aggregate([
        { $match: { campaignId: campaign._id, status: { $ne: "cancelled" } } },
        { $group: { _id: null, totalEcoPoints: { $sum: "$ecoPointsEarned" } } },
      ]),
    ]);

    // Collection over time + category breakdown, both from the same log —
    // one real source, two views of it.
    const categoryBreakdown = {};
    const collectionByDay = {};
    for (const entry of campaign.collectionLog) {
      categoryBreakdown[entry.category] = (categoryBreakdown[entry.category] ?? 0) + entry.weightKg;
      const day = new Date(entry.recordedAt).toISOString().slice(0, 10);
      collectionByDay[day] = (collectionByDay[day] ?? 0) + entry.weightKg;
    }

    const totalEcoPoints = ecoPointsAgg[0]?.totalEcoPoints ?? 0;
    const collectedWeightKg = campaign.collectedWeightKg ?? 0;

    return res.status(200).json({
      success: true,
      message: "Analytics retrieved",
      data: {
        overview: {
          participantCount: campaign.participantCount,
          volunteerCount: campaign.volunteerCount,
          collectedWeightKg,
          targetWeightKg: campaign.targetWeightKg,
          weightProgressPercent: campaign.targetWeightKg > 0 ? Math.min(100, Math.round((collectedWeightKg / campaign.targetWeightKg) * 100)) : 0,
          targetParticipants: campaign.targetParticipants,
          participantProgressPercent:
            campaign.targetParticipants > 0
              ? Math.min(100, Math.round((campaign.participantCount / campaign.targetParticipants) * 100))
              : null,
          co2SavedKg: Math.round(collectedWeightKg * CO2_PER_KG * 10) / 10,
          totalEcoPointsGenerated: totalEcoPoints,
        },
        participantGrowth: participantGrowth.map((row) => ({ day: row._id.day, type: row._id.type, count: row.count })),
        collectionOverTime: Object.entries(collectionByDay)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([day, weightKg]) => ({ day, weightKg: Math.round(weightKg * 10) / 10 })),
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, weightKg]) => ({
          category,
          weightKg: Math.round(weightKg * 10) / 10,
        })),
      },
    });
  } catch (error) {
    console.error("Campaign analytics error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading analytics.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  listCampaigns,
  listMyCampaigns,
  listMyParticipation,
  getCampaignById,
  createCampaign,
  updateCampaign,
  cancelCampaign,
  deleteCampaign,
  uploadBanner,
  uploadGalleryImages,
  deleteGalleryImage,
  joinCampaign,
  leaveCampaign,
  volunteerForCampaign,
  leaveVolunteering,
  listParticipants,
  listVolunteers,
  updateParticipantStatus,
  markAttendance,
  recordCollection,
  listCampaignPickups,
  getCampaignAnalytics,
};

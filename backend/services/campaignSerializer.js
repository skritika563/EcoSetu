/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Campaign Serializer
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Shapes Campaign / CampaignParticipant / Certificate documents into exactly
 * what the frontend consumes — mirrors services/marketplaceSerializer.js's
 * approach (denormalized `organization` object instead of a raw ref, `id`
 * not `_id`, nothing sensitive by default).
 *
 * STATUS IS COMPUTED HERE, NEVER STORED. deriveStatus() is the single place
 * that turns a Campaign's stored `lifecycleState` + dates into the
 * user-facing status (draft/upcoming/active/completed/cancelled) — see
 * models/Campaign.js's header comment for why. Every response that includes
 * a campaign runs it through this, so the frontend never has to (and never
 * gets the chance to disagree with the backend about what "active" means).
 */

const { toTitleCase } = require("../utils/textNormalize");

/** @param {object} campaign - needs lifecycleState, startDate, endDate */
const deriveStatus = (campaign) => {
  if (campaign.lifecycleState === "draft") return "draft";
  if (campaign.lifecycleState === "cancelled") return "cancelled";

  const now = Date.now();
  const start = new Date(campaign.startDate).getTime();
  const end = new Date(campaign.endDate).getTime();

  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
};

/**
 * @param {object} organizer - a User doc, ideally with POPULATE_FIELDS.organizer selected
 */
const serializeOrganizer = (organizer) => {
  if (!organizer || !organizer._id) return null;
  return {
    id: organizer._id.toString(),
    name: organizer.name,
    organizationType: organizer.organizationType ?? null,
    verified: organizer.isVerified ?? false,
    profileImage: organizer.profileImage ?? null,
    city: toTitleCase(organizer.address?.city) ?? null,
  };
};

/** Title-cases just the `city` key of a location object, leaving everything else untouched. */
const withDisplayCity = (locationLike) => {
  if (!locationLike) return locationLike;
  return { ...locationLike, city: toTitleCase(locationLike.city) };
};

/**
 * @param {object} campaignDoc
 * @param {object} [options]
 * @param {boolean} [options.isOwner] - viewer owns this campaign (computed
 *   by the controller from req.user, never trusted from the client)
 * @param {object} [options.viewerParticipation] - the viewer's own
 *   participant/volunteer state, looked up separately by the controller
 */
const serializeCampaign = (campaignDoc, { isOwner = false, viewerParticipation = null } = {}) => {
  const c = typeof campaignDoc.toObject === "function" ? campaignDoc.toObject() : campaignDoc;

  return {
    id: c._id.toString(),
    name: c.name,
    description: c.description,
    campaignType: c.campaignType,
    customTypeLabel: c.customTypeLabel ?? null,
    categories: c.categories ?? [],
    status: deriveStatus(c),
    organization: serializeOrganizer(c.organizerId),
    organizerId: c.organizerId?._id ? c.organizerId._id.toString() : c.organizerId?.toString?.() ?? null,
    location: withDisplayCity(c.location),
    startDate: c.startDate,
    endDate: c.endDate,
    targetWeightKg: c.targetWeightKg,
    targetParticipants: c.targetParticipants ?? null,
    targetSaplings: c.targetSaplings ?? null,
    expectedStalls: c.expectedStalls ?? null,
    collectedWeightKg: c.collectedWeightKg ?? 0,
    participantCount: c.participantCount ?? 0,
    volunteerCount: c.volunteerCount ?? 0,
    requiresApproval: !!c.requiresApproval,
    bannerImage: c.bannerImage?.url ? { url: c.bannerImage.url, publicId: c.bannerImage.publicId } : null,
    gallery: (c.gallery ?? []).map((img) => ({
      id: img._id.toString(),
      url: img.url,
      caption: img.caption ?? null,
      uploadedAt: img.uploadedAt,
    })),
    views: c.views ?? 0,
    isOwner,
    // Operational detail — only the organizer needs the individual log
    // entries; everyone else already sees the running total above.
    ...(isOwner
      ? {
          collectionLog: (c.collectionLog ?? [])
            .slice()
            .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
            .map((entry) => ({
              id: entry._id.toString(),
              category: entry.category,
              weightKg: entry.weightKg,
              source: entry.source,
              recordedAt: entry.recordedAt,
            })),
        }
      : {}),
    ...(viewerParticipation ? { viewerParticipation } : {}),
    cancellation: c.cancellation?.cancelledAt
      ? { reason: c.cancellation.reason, cancelledAt: c.cancellation.cancelledAt }
      : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

const serializeParticipant = (participantDoc) => {
  const p = typeof participantDoc.toObject === "function" ? participantDoc.toObject() : participantDoc;
  const user = p.userId;

  return {
    id: p._id.toString(),
    campaignId: p.campaignId?.toString?.() ?? p.campaignId,
    user: user?._id
      ? {
          id: user._id.toString(),
          name: user.name,
          role: user.role,
          organizationType: user.organizationType ?? null,
          phone: user.phone ?? null,
        }
      : null,
    participationType: p.participationType,
    status: p.status,
    registeredAt: p.registeredAt,
    respondedAt: p.respondedAt ?? null,
    attendedAt: p.attendedAt ?? null,
    cancelledAt: p.cancelledAt ?? null,
    // Who initiated the cancellation ("self" | "organizer") — the frontend
    // uses this to distinguish a volunteer being "Declined" by the
    // organizer from a volunteer "Cancelled"-ing themselves, without a
    // separate status value (see CampaignParticipant.js's header comment).
    cancelledBy: p.cancelledBy ?? null,
    cancelReason: p.cancelReason ?? null,
    ecoPointsEarned: p.ecoPointsEarned ?? 0,
    certificateIssued: !!p.certificateIssued,
  };
};

const serializeCertificate = (certificateDoc) => {
  const cert = typeof certificateDoc.toObject === "function" ? certificateDoc.toObject() : certificateDoc;
  return {
    id: cert._id.toString(),
    certificateNumber: cert.certificateNumber,
    campaign: cert.campaignSnapshot,
    participant: cert.participantSnapshot,
    issuedAt: cert.issuedAt,
  };
};

/** Kept in one place so every campaign query populates identically. */
const POPULATE_FIELDS = {
  organizer: "name role organizationType isVerified profileImage address",
  participantUser: "name role organizationType phone",
};

module.exports = {
  deriveStatus,
  serializeCampaign,
  serializeParticipant,
  serializeCertificate,
  POPULATE_FIELDS,
};

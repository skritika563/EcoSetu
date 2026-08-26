const mongoose = require("mongoose");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * CampaignParticipant Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * ONE model for both participants and volunteers — `participationType` is
 * the only thing that tells them apart. They are the same real-world thing
 * (a user's relationship to a campaign) with the same lifecycle
 * (registered → approved → attended, or cancelled at any point), so a
 * second near-identical schema would just be the same fields twice. The
 * Management dashboard filters this one collection by `participationType`
 * to show "Participants" and "Volunteers" as separate lists.
 *
 * A user CAN be both a participant and a volunteer on the same campaign
 * (two different relationships), but never registered twice in the SAME
 * role — enforced by the compound unique index below, which is what
 * actually prevents a duplicate join, not just a check-then-insert in the
 * controller.
 *
 * STATUS:
 *   registered — joined; if the campaign doesn't require approval, a
 *                participant is auto-approved on join (see
 *                campaignController.joinCampaign); a volunteer always
 *                starts here regardless, since volunteering is closer
 *                real-world commitment worth an explicit organizer nod.
 *   approved   — organizer has accepted (or auto-accepted) them.
 *   attended   — organizer marked them present at the drive. This is what
 *                certificate eligibility for volunteers is gated on.
 *   cancelled  — the user left, or the organizer rejected them. Terminal.
 *                `cancelledBy` says which ("self" | "organizer") — the
 *                frontend uses that to show a volunteer "Declined" (an
 *                organizer said no) rather than "Cancelled" (they withdrew
 *                themselves); see config/campaigns.js's
 *                getParticipationStatusMeta. Same underlying status either
 *                way — this is purely who initiated it, not a fifth state.
 *
 * Eco Points are awarded once, at the moment of approval (see
 * campaignController), and snapshotted here (contributionScore/
 * ecoPointsEarned) rather than recomputed later — same reasoning as
 * Pickup.contributionScore.
 */

const STATUSES = ["registered", "approved", "attended", "cancelled"];
const PARTICIPATION_TYPES = ["participant", "volunteer"];
const CANCELLED_BY_VALUES = ["self", "organizer"];

const campaignParticipantSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participationType: { type: String, enum: PARTICIPATION_TYPES, required: true },
    status: { type: String, enum: STATUSES, default: "registered" },

    registeredAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
    attendedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: CANCELLED_BY_VALUES, default: null },
    cancelReason: { type: String, default: null, maxlength: 300 },

    contributionScore: { type: Number, default: 0 },
    ecoPointsEarned: { type: Number, default: 0 },

    // Quick flag so the frontend can show "Certificate available" without a
    // second round trip — the Certificate document itself (models/Certificate.js)
    // remains the actual record of what was issued.
    certificateIssued: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The real duplicate-registration guard — a race between two requests from
// the same user can never create two rows, unlike a check-then-insert.
campaignParticipantSchema.index(
  { campaignId: 1, userId: 1, participationType: 1 },
  { unique: true }
);
campaignParticipantSchema.index({ campaignId: 1, status: 1 });
campaignParticipantSchema.index({ userId: 1, status: 1 });

campaignParticipantSchema.statics.STATUSES = STATUSES;
campaignParticipantSchema.statics.PARTICIPATION_TYPES = PARTICIPATION_TYPES;

module.exports = mongoose.model("CampaignParticipant", campaignParticipantSchema);

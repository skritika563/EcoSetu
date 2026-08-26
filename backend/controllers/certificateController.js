const mongoose = require("mongoose");
const Campaign = require("../models/Campaign");
const CampaignParticipant = require("../models/CampaignParticipant");
const Certificate = require("../models/Certificate");
const { deriveStatus, serializeCertificate } = require("../services/campaignSerializer");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Certificate Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * THREE DELIBERATELY SEPARATE CONCERNS (per the module spec):
 *   1. ELIGIBILITY — checkEligibility() is a pure function of real state
 *      (the campaign's derived status + the caller's own participation
 *      record). Computed fresh on every request, never stored, so it can
 *      never go stale relative to the campaign actually finishing or a
 *      participant actually being marked attended.
 *   2. GENERATION — a real Certificate document, created the first time an
 *      eligible participant asks (idempotent: participantId is unique on
 *      the model, so asking twice returns the same certificate, never
 *      issues two).
 *   3. DOWNLOAD — a frontend concern. No PDF-generation library exists in
 *      this backend yet (no pdfkit/puppeteer in package.json), so rather
 *      than fabricate a fake "download" that doesn't actually generate
 *      anything, this API returns the real, structured certificate DATA
 *      (name, campaign, organization, date, certificate number) and the
 *      frontend renders an actual on-screen certificate the browser's own
 *      print-to-PDF can save — a real generated artifact, not a pretend
 *      file. Swapping in server-side PDF rendering later only touches this
 *      one function's response, not the eligibility/generation logic above.
 */

const notFound = (res, message = "Campaign not found.") =>
  res.status(404).json({ success: false, message, error: { code: "NOT_FOUND" } });

/**
 * @returns {{ eligible: boolean, reason?: string, participant?: object }}
 */
const checkEligibility = (campaign, participant) => {
  const status = deriveStatus(campaign);
  if (status !== "completed") {
    return { eligible: false, reason: "This campaign hasn't finished yet." };
  }
  if (!participant || participant.status === "cancelled") {
    return { eligible: false, reason: "You didn't participate in this campaign." };
  }
  if (participant.participationType === "volunteer" && participant.status !== "attended") {
    return { eligible: false, reason: "Attendance wasn't recorded for your volunteer registration." };
  }
  return { eligible: true, participant };
};

/**
 * GET /api/campaigns/:id/certificate
 * Optional ?type=participant|volunteer when the caller has both kinds of
 * registration on this campaign; defaults to whichever is eligible.
 */
const getCertificate = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);

    const campaign = await Campaign.findById(req.params.id).populate("organizerId", "name organizationType");
    if (!campaign) return notFound(res);

    const records = await CampaignParticipant.find({ campaignId: campaign._id, userId: req.user._id });
    if (records.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You didn't participate in this campaign.",
        error: { code: "FORBIDDEN_ROLE" },
      });
    }

    const preferredType = ["participant", "volunteer"].includes(req.query.type) ? req.query.type : null;
    const candidates = preferredType ? records.filter((r) => r.participationType === preferredType) : records;

    // Prefer whichever record is actually eligible; fall back to the first
    // so the error message is meaningful either way.
    let chosen = candidates.find((r) => checkEligibility(campaign, r).eligible) ?? candidates[0];
    const eligibility = checkEligibility(campaign, chosen);

    if (!eligibility.eligible) {
      return res.status(403).json({ success: false, message: eligibility.reason, error: { code: "FORBIDDEN_ROLE" } });
    }

    let certificate = await Certificate.findOne({ participantId: chosen._id });
    if (!certificate) {
      certificate = await Certificate.create({
        participantId: chosen._id,
        campaignId: campaign._id,
        userId: req.user._id,
        campaignSnapshot: {
          name: campaign.name,
          organizationName: campaign.organizerId?.name ?? "EcoSetu Organizer",
          campaignType: campaign.campaignType,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
        },
        participantSnapshot: { name: req.user.name, participationType: chosen.participationType },
      });
      chosen.certificateIssued = true;
      await chosen.save();
    }

    return res.status(200).json({ success: true, message: "Certificate retrieved", data: serializeCertificate(certificate) });
  } catch (error) {
    if (error.code === 11000) {
      // A race issued it between our findOne and create — fetch the real one.
      const existing = await Certificate.findOne({ participantId: req.params.participantId });
      if (existing) {
        return res.status(200).json({ success: true, message: "Certificate retrieved", data: serializeCertificate(existing) });
      }
    }
    console.error("Get certificate error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving your certificate.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/campaigns/certificates/mine */
const listMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ userId: req.user._id }).sort({ issuedAt: -1 });
    return res.status(200).json({
      success: true,
      message: "Your certificates retrieved",
      data: certificates.map(serializeCertificate),
    });
  } catch (error) {
    console.error("List my certificates error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading your certificates.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { getCertificate, listMyCertificates };

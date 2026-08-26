const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Certificate Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * ELIGIBILITY, GENERATION and DOWNLOAD are three separate concerns, kept
 * separate on purpose (see controllers/certificateController.js):
 *   - Eligibility is a pure check (campaign completed + the participant's
 *     own status), computed on every request — never stored, so it can
 *     never go stale.
 *   - Generation is what THIS model represents: a real, persisted record
 *     created the first time an eligible participant asks for it, with a
 *     unique certificateNumber. Idempotent — asking twice returns the same
 *     record, never issues two.
 *   - Download is a frontend concern (CertificatePage renders this data;
 *     "Download" uses the browser's own print-to-PDF, since no PDF-
 *     generation library exists yet in this backend — see the controller's
 *     header comment for exactly why that's the honest choice here rather
 *     than faking a file).
 *
 * SNAPSHOTTED, not joined at read time: campaign/organizer names are
 * copied in at issue time, so a certificate still reads correctly even if
 * the campaign is later edited or the organizer renames their account —
 * the same "snapshot, don't recompute" reasoning as
 * MarketplaceOrder.productSnapshot.
 */

const generateCertificateNumber = () =>
  `ECOSETU-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

const certificateSchema = new mongoose.Schema(
  {
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CampaignParticipant",
      required: true,
      unique: true, // one certificate per participation record, ever
    },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    certificateNumber: { type: String, required: true, unique: true, default: generateCertificateNumber },

    campaignSnapshot: {
      name: { type: String, required: true },
      organizationName: { type: String, required: true },
      campaignType: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    participantSnapshot: {
      name: { type: String, required: true },
      participationType: { type: String, required: true },
    },

    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);

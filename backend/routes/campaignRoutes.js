const express = require("express");
const router = express.Router();

const campaignController = require("../controllers/campaignController");
const certificateController = require("../controllers/certificateController");
const { verifyFirebaseToken, attachUser, authorizeRoles } = require("../middleware/authMiddleware");
const { uploadImages } = require("../middleware/uploadMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Campaign Routes — /api/campaigns
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Same shape as marketplaceRoutes.js: one role gate (`organizerOnly`) applied
 * per-route to everything that creates/manages a campaign, everything else
 * open to any authenticated role. Browsing and joining are NOT
 * collector/household-only or organization-only — every signed-in role can
 * browse and join; only organization accounts (NGO/School/University — see
 * User.organizationType) can create or manage.
 *
 * Static paths (/mine, /mine/participation, /certificates/mine) are
 * registered BEFORE the dynamic /:id routes — Express matches routes in
 * order, and /:id would otherwise swallow "mine" as an id value.
 */

const organizerOnly = authorizeRoles("organization");

router.use(verifyFirebaseToken, attachUser);

router.get("/mine", organizerOnly, campaignController.listMyCampaigns);
router.get("/mine/participation", campaignController.listMyParticipation);
router.get("/certificates/mine", certificateController.listMyCertificates);

router.get("/", campaignController.listCampaigns);
router.post("/", organizerOnly, campaignController.createCampaign);

router.get("/:id", campaignController.getCampaignById);
router.patch("/:id", organizerOnly, campaignController.updateCampaign);
router.patch("/:id/cancel", organizerOnly, campaignController.cancelCampaign);
router.delete("/:id", organizerOnly, campaignController.deleteCampaign);

router.post("/:id/banner", organizerOnly, uploadImages("banner"), campaignController.uploadBanner);
router.post("/:id/gallery", organizerOnly, uploadImages("images"), campaignController.uploadGalleryImages);
router.delete("/:id/gallery/:imageId", organizerOnly, campaignController.deleteGalleryImage);

router.post("/:id/join", campaignController.joinCampaign);
router.delete("/:id/join", campaignController.leaveCampaign);
router.post("/:id/volunteer", campaignController.volunteerForCampaign);
router.delete("/:id/volunteer", campaignController.leaveVolunteering);

router.get("/:id/participants", organizerOnly, campaignController.listParticipants);
router.get("/:id/volunteers", organizerOnly, campaignController.listVolunteers);
router.patch("/:id/participants/:participantId", organizerOnly, campaignController.updateParticipantStatus);
router.patch("/:id/participants/:participantId/attendance", organizerOnly, campaignController.markAttendance);

router.post("/:id/collection", organizerOnly, campaignController.recordCollection);
router.get("/:id/pickups", organizerOnly, campaignController.listCampaignPickups);
router.get("/:id/analytics", organizerOnly, campaignController.getCampaignAnalytics);

router.get("/:id/certificate", certificateController.getCertificate);

module.exports = router;

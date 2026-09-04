const express = require("express");
const router = express.Router();

const pickupController = require("../controllers/pickupController");
const { verifyFirebaseToken, attachUser, authorizeRoles } = require("../middleware/authMiddleware");
const { uploadImages } = require("../middleware/uploadMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Pickup Routes — /api/pickups
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every route requires a verified Firebase token AND a MongoDB profile
 * (attachUser). Role checks narrow who may even ATTEMPT an action;
 * pickupController then re-checks OWNERSHIP of the specific record (a
 * household user with role "household" still can't touch another
 * household's pickup just because the role check passed).
 */

router.use(verifyFirebaseToken, attachUser);

// POST /api/pickups — book a pickup
router.post("/", authorizeRoles("household", "organization"), pickupController.createPickup);

// POST /api/pickups/:id/images — attach photos to an already-created pickup.
// Owner (booking photos) or the assigned collector (verification photos) —
// pickupController re-checks which one applies and tags each upload
// accordingly; the role check here only narrows who may even attempt it.
router.post(
  "/:id/images",
  authorizeRoles("household", "organization", "collector"),
  uploadImages("images"),
  pickupController.uploadPickupImages
);

// GET /api/pickups — "my pickups" (household/organization) or "my jobs + open requests" (collector)
router.get("/", authorizeRoles("household", "organization", "collector", "admin"), pickupController.listPickups);

// GET /api/pickups/:id
router.get("/:id", authorizeRoles("household", "organization", "collector", "admin"), pickupController.getPickupById);

// PUT /api/pickups/:id/cancel — owner or assigned collector
router.put(
  "/:id/cancel",
  authorizeRoles("household", "organization", "collector", "admin"),
  pickupController.cancelPickup
);

// PUT /api/pickups/:id/accept — collector claims an unassigned request
router.put("/:id/accept", authorizeRoles("collector"), pickupController.acceptJob);

// PUT /api/pickups/:id/status — collector moves their job forward
router.put("/:id/status", authorizeRoles("collector"), pickupController.updateJobStatus);

// PATCH /api/pickups/:id/location — collector broadcasts their live position while en route
router.patch("/:id/location", authorizeRoles("collector"), pickupController.updateCollectorLocation);

// PUT /api/pickups/:id/verify — collector's final classification + completion
router.put("/:id/verify", authorizeRoles("collector"), pickupController.verifyPickup);

// POST /api/pickups/:id/rate — customer rates the collector post-completion
router.post("/:id/rate", authorizeRoles("household", "organization"), pickupController.ratePickup);

module.exports = router;

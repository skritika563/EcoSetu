const express = require("express");
const router = express.Router();

const addressController = require("../controllers/addressController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Address Routes — /api/addresses
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * No role restriction beyond being signed in — every role may keep saved
 * pickup addresses. Every handler operates on req.user's own subdocument
 * array (see addressController.js), so there is no :userId to spoof.
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/", addressController.listAddresses);
router.post("/", addressController.createAddress);
router.patch("/:addressId", addressController.updateAddress);
router.delete("/:addressId", addressController.deleteAddress);

module.exports = router;

const express = require("express");
const router = express.Router();

const locationController = require("../controllers/locationController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Location Routes — /api/location
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every route requires a verified Firebase token — these proxy a
 * rate-limited, paid third-party API (LocationIQ), so an anonymous caller
 * must never be able to hit them directly.
 */

router.use(verifyFirebaseToken, attachUser);

// GET /api/location/geocode?q=<pincode or address text>
router.get("/geocode", locationController.geocode);

// GET /api/location/reverse-geocode?lat=&lng=
router.get("/reverse-geocode", locationController.reverseGeocode);

// GET /api/location/directions?fromLat=&fromLng=&toLat=&toLng=
router.get("/directions", locationController.directions);

module.exports = router;

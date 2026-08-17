const express = require("express");
const router = express.Router();

const scrapRateController = require("../controllers/scrapRateController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ScrapRate Routes — /api/scrap-rates
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Read-only for every signed-in role. Admin rate management (POST/PATCH) is
 * deferred with the rest of the Admin module.
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/", scrapRateController.listRates);

module.exports = router;

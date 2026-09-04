const express = require("express");
const router = express.Router();

const rewardController = require("../controllers/rewardController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Reward Routes — /api/rewards
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every authenticated non-admin role can browse and redeem — points are
 * earned by households, organizations and collectors alike. Balance and
 * ownership are always resolved server-side from req.user._id; nothing here
 * accepts a userId or a points amount from the client.
 */

router.use(verifyFirebaseToken, attachUser);

router.get("/", rewardController.listRewards);
router.get("/my-redemptions", rewardController.listMyRedemptions);
router.post("/:id/redeem", rewardController.redeemReward);

module.exports = router;

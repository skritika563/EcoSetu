const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");
const { uploadSingleImage } = require("../middleware/uploadMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * User Routes — /api/users
 * ──────────────────────────────────────────────────────────────────────────────
 */

router.use(verifyFirebaseToken, attachUser);

// GET /api/users/:id/profile — View target user profile
router.get("/:id/profile", userController.getUserProfile);

// PUT /api/users/profile — Update current authenticated user profile details
router.put("/profile", userController.updateProfile);

// POST /api/users/upload-avatar — Stream single avatar file to Cloudinary
router.post("/upload-avatar", uploadSingleImage("file"), userController.uploadAvatar);

module.exports = router;


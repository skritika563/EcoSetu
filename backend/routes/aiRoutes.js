const express = require("express");
const router = express.Router();

const { classifyWaste } = require("../controllers/aiController");
const { verifyFirebaseToken, attachUser } = require("../middleware/authMiddleware");
const { uploadImages } = require("../middleware/uploadMiddleware");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * AI Routes — /api/ai
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Same auth gate as every other route file (verifyFirebaseToken + attachUser
 * before anything else) — the previous version of this route had none,
 * meaning anyone could call it and spend the project's Gemini quota.
 * uploadImages reuses the SAME validated multer instance (5MB/file limit,
 * up to MAX_IMAGES_PER_REQUEST files, JPEG/PNG/WEBP/GIF whitelist) as
 * everywhere else that accepts multiple images, instead of a second,
 * looser, ad-hoc multer config. Was uploadSingleImage — classification only
 * ever looked at the FIRST uploaded photo, silently ignoring any others,
 * until this was made a real multi-image endpoint (see geminiService.js's
 * classifyWasteImage).
 */

router.use(verifyFirebaseToken, attachUser);

router.post("/classify", uploadImages("images"), classifyWaste);

module.exports = router;

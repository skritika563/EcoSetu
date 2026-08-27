const { classifyWasteImage } = require("../services/geminiService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * AI Controller — Gemini-backed waste/item classification
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Same response envelope as every other controller in the app
 * ({success, message, data} / {success, message, error:{code}}) — the
 * previous version of this file used a different, one-off shape
 * ({success, result} / {success, error: "string"}).
 */

/**
 * POST /api/ai/classify
 * Auth required (see routes/aiRoutes.js — verifyFirebaseToken + attachUser).
 * Body: multipart/form-data, field "images" — one or more (up to
 * MAX_IMAGES_PER_REQUEST, see middleware/uploadMiddleware.js), all
 * classified together in one Gemini call — see geminiService.js's
 * classifyWasteImage for why that's one request, not N.
 */
const classifyWaste = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image to classify.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const images = req.files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype }));
    const result = await classifyWasteImage(images);

    return res.status(200).json({
      success: true,
      message: result.classification_possible ? "Classification complete" : "Classification unavailable",
      data: result,
    });
  } catch (error) {
    // AI_UNAVAILABLE is the service's own signal that Gemini isn't
    // configured or couldn't be reached — surfaced honestly as a 503,
    // matching marketplaceAiController's identical handling of the same
    // error code from marketplaceAiService.
    if (error.code === "AI_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        message: error.message,
        error: { code: "AI_UNAVAILABLE" },
      });
    }
    console.error("Waste classification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while classifying this image.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { classifyWaste };

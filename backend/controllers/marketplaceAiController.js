const { generateListingContent } = require("../services/marketplaceAiService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Marketplace AI Controller — listing assist
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Wraps the real Gemini call (services/marketplaceAiService.js). Authenticated
 * like every other marketplace route; the seller's own notes are the only
 * input, and the result is a SUGGESTION returned to an editable form — never
 * written to a listing directly.
 */

/**
 * POST /api/marketplace/ai/listing
 * Body: { notes, category?, condition?, material?, city? }
 */
const generateListing = async (req, res) => {
  try {
    const { notes, category, condition, material, city } = req.body;

    if (!notes?.trim() || notes.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Describe the item in a few words first (at least 10 characters), then AI can help polish it.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const result = await generateListingContent({
      // Bounded so a huge paste can't run up an unbounded prompt.
      notes: notes.trim().slice(0, 1200),
      category,
      condition,
      material,
      city,
    });

    return res.status(200).json({
      success: true,
      message: "Listing suggestions generated",
      data: result,
    });
  } catch (error) {
    // AI_UNAVAILABLE is the service's own signal that Gemini couldn't be
    // reached or returned something unusable. It is surfaced honestly as a
    // 503 rather than being papered over with invented text.
    if (error.code === "AI_UNAVAILABLE") {
      return res.status(503).json({
        success: false,
        message: error.message,
        error: { code: "AI_UNAVAILABLE" },
      });
    }
    console.error("AI listing generation error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while generating suggestions.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { generateListing };

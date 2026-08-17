const ScrapRate = require("../models/ScrapRate");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ScrapRate Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Read-only for now — every authenticated role can see current rates (the
 * booking flow's "Estimated value" range and the collector's live pricing
 * table both need them). Admin rate editing is deferred with the rest of the
 * Admin module; the collection is seeded once via scripts/seedScrapRates.js.
 */

const listRates = async (req, res) => {
  try {
    const rates = await ScrapRate.find({ isActive: true }).sort({ category: 1 });
    return res.status(200).json({
      success: true,
      message: "Scrap rates retrieved",
      data: rates.map((r) => ({
        category: r.category,
        displayName: r.displayName,
        unit: r.unit,
        pricePerKg: r.pricePerKg,
      })),
    });
  } catch (error) {
    console.error("List scrap rates error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading scrap rates.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { listRates };

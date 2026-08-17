const mongoose = require("mongoose");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * ScrapRate Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Server-side source of truth for ₹/kg pricing. The collector's verification
 * form and the frontend's booking estimate both read from this collection —
 * never from a client-supplied number — so a pickup's final amount can never
 * be manipulated from the browser.
 *
 * Source: DATABASE_SCHEMA.md §3.3. Default seed values match what the
 * frontend's mock pricingData.js already used (itself sourced from this same
 * doc's "Default Seed Data" table), so migrating off the mock changes nothing
 * about what a household/collector sees.
 */

const scrapRateSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      enum: ["plastic", "metal", "paper", "cardboard", "glass", "e-waste", "mixed"],
    },
    displayName: { type: String, required: true },
    unit: { type: String, default: "kg" },
    pricePerKg: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

scrapRateSchema.index({ isActive: 1 });

/** Default rates — used by scripts/seedScrapRates.js on first boot. */
scrapRateSchema.statics.DEFAULT_RATES = [
  { category: "plastic", displayName: "Plastic", pricePerKg: 18 },
  { category: "metal", displayName: "Metal", pricePerKg: 35 },
  { category: "paper", displayName: "Paper", pricePerKg: 12 },
  { category: "cardboard", displayName: "Cardboard", pricePerKg: 10 },
  { category: "glass", displayName: "Glass", pricePerKg: 4 },
  { category: "e-waste", displayName: "E-Waste", pricePerKg: 25 },
  { category: "mixed", displayName: "Mixed Waste", pricePerKg: 5 },
];

module.exports = mongoose.model("ScrapRate", scrapRateSchema);

const mongoose = require("mongoose");
const { SCRAP_CATEGORIES } = require("../constants/categories");

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
 * `category` enum comes from constants/categories.js — the one official
 * EcoSetu scrap/material vocabulary, shared with Pickup and the Gemini
 * classification endpoint. Originally 7 categories (matching
 * DATABASE_SCHEMA.md §3.3's "Default Seed Data" table, itself mirrored by
 * the frontend's mock pricingData.js); extended to 13 to also cover
 * reusable-goods categories like furniture/books that a household pickup can
 * genuinely contain, with the old "mixed" catch-all retired in favour of
 * "others" (see constants/categories.js's header for why these 13 aren't
 * the same list as Marketplace's Product.CATEGORIES).
 */

const scrapRateSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      unique: true,
      enum: SCRAP_CATEGORIES,
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

/**
 * Default rates — used by scripts/seedScrapRates.js. The original 7 keep
 * their researched real-world kabadiwala rates; the 6 added for the 13-
 * category expansion are deliberately conservative placeholders (these are
 * reusable-goods categories with far more variable per-kg value than raw
 * scrap — furniture and home-decor items are usually priced per PIECE on
 * Marketplace, not per kg) — an admin is expected to tune these once real
 * pickup volume exists, same as any of the original 7.
 */
scrapRateSchema.statics.DEFAULT_RATES = [
  { category: "plastic", displayName: "Plastic", pricePerKg: 18 },
  { category: "metal", displayName: "Metal", pricePerKg: 35 },
  { category: "paper", displayName: "Paper", pricePerKg: 12 },
  { category: "cardboard", displayName: "Cardboard", pricePerKg: 10 },
  { category: "glass", displayName: "Glass", pricePerKg: 4 },
  { category: "e-waste", displayName: "E-Waste", pricePerKg: 25 },
  { category: "wooden", displayName: "Wooden Scraps", pricePerKg: 8 },
  { category: "decorations", displayName: "Decorations", pricePerKg: 6 },
  { category: "furniture", displayName: "Furniture", pricePerKg: 15 },
  { category: "books", displayName: "Books", pricePerKg: 10 },
  { category: "stationery", displayName: "Stationery", pricePerKg: 8 },
  { category: "home-decor", displayName: "Home Decor", pricePerKg: 10 },
  { category: "others", displayName: "Others", pricePerKg: 5 },
];

module.exports = mongoose.model("ScrapRate", scrapRateSchema);

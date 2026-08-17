/**
 * Seeds the ScrapRate collection with default rates if it's empty.
 * Safe to run repeatedly — does nothing once rates already exist, so it can
 * be called on every server boot without duplicating or overwriting data an
 * admin may have already adjusted.
 *
 * Run standalone: node scripts/seedScrapRates.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const ScrapRate = require("../models/ScrapRate");

const seedScrapRates = async () => {
  const existing = await ScrapRate.countDocuments();
  if (existing > 0) {
    console.log(`ℹ️  ScrapRate already has ${existing} categories — skipping seed.`);
    return;
  }

  await ScrapRate.insertMany(ScrapRate.DEFAULT_RATES);
  console.log(`✅ Seeded ${ScrapRate.DEFAULT_RATES.length} scrap rate categories.`);
};

// Only auto-connect when run directly (`node scripts/seedScrapRates.js`),
// not when imported by server.js during normal boot.
if (require.main === module) {
  connectDB()
    .then(seedScrapRates)
    .then(() => mongoose.disconnect())
    .catch((error) => {
      console.error("❌ Seeding failed:", error.message);
      process.exit(1);
    });
}

module.exports = seedScrapRates;

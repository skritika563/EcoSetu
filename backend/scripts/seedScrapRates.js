/**
 * Ensures the ScrapRate collection has an active rate for every official
 * category (constants/categories.js) — safe to run repeatedly, and safe to
 * run against a database that already has some (but not all) categories
 * seeded, which is exactly the situation the 7→13 category expansion
 * created: existing deployments already had the original 7.
 *
 * UPSERT, NOT "skip if collection isn't empty": the previous version of
 * this script bailed out entirely the moment ANY document existed, which
 * meant the 6 categories added by the 13-category expansion would NEVER get
 * seeded on an existing database — only a brand-new one. Each category is
 * now upserted independently with `$setOnInsert`, so:
 *   - a category that already exists is left completely untouched (an
 *     admin's manually-adjusted pricePerKg is never overwritten), and
 *   - a category that's missing gets created with its default rate,
 * regardless of what else is already in the collection.
 *
 * Also retires the old "mixed" category (replaced by "others" — see
 * constants/categories.js) — if a stale "mixed" ScrapRate document exists
 * from before the expansion, it's deactivated rather than hard-deleted, so
 * a pickup completed under the old system that still references "mixed" in
 * its history keeps reading a coherent record, while `isActive: false`
 * keeps it out of every current rate lookup (pricingService.js only queries
 * `isActive: true`) and off the frontend's rate list.
 *
 * Run standalone: node scripts/seedScrapRates.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const ScrapRate = require("../models/ScrapRate");

const seedScrapRates = async () => {
  let created = 0;
  for (const defaultRate of ScrapRate.DEFAULT_RATES) {
    const result = await ScrapRate.updateOne(
      { category: defaultRate.category },
      { $setOnInsert: defaultRate },
      { upsert: true }
    );
    if (result.upsertedCount > 0) created += 1;
  }

  const deactivated = await ScrapRate.updateMany(
    { category: "mixed", isActive: true },
    { $set: { isActive: false } }
  );

  if (created > 0) {
    console.log(`✅ Seeded ${created} new scrap rate categor${created === 1 ? "y" : "ies"} (${ScrapRate.DEFAULT_RATES.length} official categories total).`);
  } else {
    console.log(`ℹ️  ScrapRate already has all ${ScrapRate.DEFAULT_RATES.length} official categories — nothing new to seed.`);
  }
  if (deactivated.modifiedCount > 0) {
    console.log(`ℹ️  Deactivated ${deactivated.modifiedCount} stale "mixed" rate (retired in favour of "others").`);
  }
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

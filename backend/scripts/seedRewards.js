/**
 * Seeds the Eco Points redemption catalogue.
 *
 * UPSERT BY NAME, same reasoning as seedScrapRates.js: safe to run
 * repeatedly, and safe against a database that already holds some of these.
 * Each reward is created with `$setOnInsert` only, so an admin who later
 * adjusts a reward's cost or stock never has that edit overwritten by the
 * next server start.
 *
 * RETIRING PHYSICAL ITEMS: the jute bag / bamboo cutlery / steel bottle
 * rewards were seeded before there was any real fulfilment path for a
 * physical item (their "delivered with your next pickup" promise was never
 * backed by anything) — same "retire, don't hard-delete" pattern
 * seedScrapRates.js uses for its old "mixed" category: `isActive: false`
 * takes them out of the catalogue (rewardController only ever queries
 * `isActive: true`) while leaving any already-issued Redemption pointing at
 * one fully intact, since Redemption snapshots its own rewardName/
 * pointsSpent rather than re-reading the Reward doc.
 *
 * Run standalone: node scripts/seedRewards.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const Reward = require("../models/Reward");

/**
 * Point costs are anchored to what pickups actually award (see
 * services/ecoScoreService.js) so the catalogue is reachable rather than
 * decorative — a few completed pickups should put the entry-level rewards
 * genuinely within reach.
 *
 * `effect`/`effectValue` are what redeeming a reward actually DOES beyond
 * deducting points — see Reward.js's own header comment. Only two reward
 * types are wired to something automated right now (marketplace_discount,
 * pickup_fee_waiver); everything else is `effect: "none"`, meaning a human
 * (an admin, via the redemptions view) is the one who honors it.
 */
const REWARDS = [
  {
    name: "Plant a Tree in Your Name",
    description:
      "We fund a sapling planted through a partner NGO drive, tagged with your name. You get a photo once it's in the ground.",
    category: "donation",
    pointsCost: 200,
    stock: null,
    partner: "EcoSetu Green Fund",
    redemptionNote:
      "This is tracked, not automatic — an EcoSetu admin arranges the planting and marks your redemption fulfilled once it's done. Once they do, it adds to your Trees Planted count on the Sustainability Dashboard.",
    effect: "none",
    effectValue: null,
    impactType: "tree_planted",
  },
  {
    name: "₹100 Marketplace Credit",
    description: "₹100 off your next purchase from the EcoSetu marketplace. Applies to any listing.",
    category: "voucher",
    pointsCost: 500,
    stock: null,
    partner: "EcoSetu",
    redemptionNote: "Enter this code at checkout — the discount is applied automatically before you pay.",
    effect: "marketplace_discount",
    effectValue: 100,
  },
  {
    name: "Free Priority Pickup",
    description:
      "Skip the queue — one instant pickup with the platform fee waived entirely, no payment required.",
    category: "service",
    pointsCost: 250,
    stock: null,
    partner: "EcoSetu",
    redemptionNote: "Enter this code when booking an instant pickup — the fee is waived automatically, no payment step needed.",
    effect: "pickup_fee_waiver",
    effectValue: null,
  },
  {
    name: "Sponsor a School Clean-Up Kit",
    description:
      "Funds gloves, bags and sorting bins for one school collection drive. Your name goes on the drive's sponsor list.",
    category: "donation",
    pointsCost: 750,
    stock: null,
    partner: "EcoSetu Green Fund",
    redemptionNote:
      "This is tracked, not automatic — an EcoSetu admin confirms which drive it supported and marks your redemption fulfilled.",
    effect: "none",
    effectValue: null,
  },
  {
    name: "₹250 Marketplace Credit",
    description: "₹250 off your next marketplace purchase — best value on a larger order.",
    category: "voucher",
    pointsCost: 1200,
    stock: null,
    partner: "EcoSetu",
    redemptionNote: "Enter this code at checkout — the discount is applied automatically before you pay.",
    effect: "marketplace_discount",
    effectValue: 250,
  },
];

/** Reward names that used to be seeded but no longer are — see header comment. */
const RETIRED_REWARD_NAMES = ["Reusable Jute Shopping Bag", "Bamboo Cutlery Set", "Steel Water Bottle"];

const seedRewards = async () => {
  const [upsertResults, retireResult] = await Promise.all([
    Promise.all(
      REWARDS.map((reward) =>
        Reward.updateOne({ name: reward.name }, { $setOnInsert: reward }, { upsert: true })
      )
    ),
    Reward.updateMany(
      { name: { $in: RETIRED_REWARD_NAMES }, isActive: true },
      { $set: { isActive: false } }
    ),
  ]);

  const created = upsertResults.filter((r) => r.upsertedCount > 0).length;
  if (created > 0) {
    console.log(`✅ Seeded ${created} new reward(s) into the catalogue.`);
  } else {
    console.log(`ℹ️  Reward catalogue already has all ${REWARDS.length} seeded rewards — nothing new to seed.`);
  }
  if (retireResult.modifiedCount > 0) {
    console.log(`ℹ️  Retired ${retireResult.modifiedCount} discontinued reward(s) (physical items, no fulfilment path).`);
  }
};

module.exports = seedRewards;

// Standalone execution
if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("Connected to MongoDB");
      await seedRewards();
      await mongoose.disconnect();
      process.exit(0);
    } catch (error) {
      console.error("❌ Reward seed failed:", error.message);
      process.exit(1);
    }
  })();
}

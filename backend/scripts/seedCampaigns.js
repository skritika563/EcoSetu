/**
 * Seeds the Campaigns module with a realistic set of starter drives.
 *
 * WHY SEED AT ALL: same reasoning as scripts/seedMarketplace.js — an empty
 * Campaigns module can't demonstrate browse, filters, joining, the
 * management dashboard, analytics or certificates. These are real Campaign
 * / CampaignParticipant documents in MongoDB, served through the real API;
 * nothing here is a frontend mock.
 *
 * OWNERSHIP: every seeded campaign is attributed to a REAL existing
 * organization account (role "organization" — NGO/School/University),
 * round-robin over whoever exists. No fictitious organizer is invented; if
 * no organization account exists yet, campaign seeding is skipped entirely
 * (same "skip rather than fabricate" rule seedMarketplace.js follows for
 * sellers).
 *
 * ONE completed campaign is seeded WITH real participation (a household
 * participant, a collector volunteer marked attended, and collection-log
 * entries) so the certificate flow — eligibility → generation → download —
 * has something real to exercise immediately, not just an empty list.
 *
 * IDEMPOTENT PER TITLE, like seedMarketplace.js — safe to call on every
 * server boot; only titles that don't already exist get inserted, and the
 * one-time participation seeding for the completed campaign only runs the
 * first time that campaign itself is created.
 *
 * Run standalone:  node scripts/seedCampaigns.js
 * Remove seed data: node scripts/seedCampaigns.js --clear
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Campaign = require("../models/Campaign");
const CampaignParticipant = require("../models/CampaignParticipant");
const User = require("../models/User");
const { scoreForCampaignParticipation } = require("../services/ecoScoreService");

const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000);

const SEED_CAMPAIGNS = [
  {
    name: "Campus E-Waste Collection Drive",
    description:
      "A month-long collection point for old phones, chargers, cables and small electronics across campus. Every item is routed to a certified e-waste recycler — nothing goes to landfill.",
    campaignType: "waste_collection",
    categories: ["e-waste"],
    location: { line: "Main Gate Collection Point", area: "Central Campus", city: "Bengaluru", state: "Karnataka", pincode: "560029" },
    startDaysOffset: -20,
    endDaysOffset: -5,
    targetWeightKg: 300,
    targetParticipants: 150,
    bannerImage: { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=75", publicId: "external-seed:campaign-e-waste" },
    // This one gets real seeded participation — see seedCompletedCampaignParticipation below.
    seedParticipation: true,
  },
  {
    name: "Neighbourhood Beach & Riverside Cleanup",
    description:
      "A hands-on cleanup covering the riverside stretch and nearby beach access points. Gloves, bags and sorting bins are provided on-site — just bring yourself and closed-toe shoes.",
    campaignType: "cleaning_drive",
    categories: ["plastic", "mixed"],
    location: { line: "Riverside Promenade", area: "Versova", city: "Mumbai", state: "Maharashtra", pincode: "400061" },
    startDaysOffset: -3,
    endDaysOffset: 4,
    targetWeightKg: 500,
    targetParticipants: 200,
    bannerImage: { url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=1200&q=75", publicId: "external-seed:campaign-cleanup" },
  },
  {
    name: "Green Campus Plantation Drive",
    description:
      "Planting native saplings across the campus green belt as part of our long-term canopy cover goal. Volunteers get a short orientation on planting technique before starting.",
    campaignType: "plantation_drive",
    categories: [],
    location: { line: "Green Belt, East Lawn", area: "Viman Nagar", city: "Pune", state: "Maharashtra", pincode: "411014" },
    startDaysOffset: -1,
    endDaysOffset: 6,
    targetWeightKg: 0,
    targetParticipants: 100,
    targetSaplings: 500,
    bannerImage: { url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=75", publicId: "external-seed:campaign-plantation" },
  },
  {
    name: "Paper & Cardboard Recycling Month",
    description:
      "A month-long push to collect waste paper, cardboard and old notebooks from classrooms and offices, weighed and logged weekly against our collection target.",
    campaignType: "waste_collection",
    categories: ["paper"],
    location: { line: "Admin Block Loading Bay", area: "Malleshwaram", city: "Bengaluru", state: "Karnataka", pincode: "560003" },
    startDaysOffset: 5,
    endDaysOffset: 25,
    targetWeightKg: 400,
    targetParticipants: 120,
    bannerImage: { url: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200&q=75", publicId: "external-seed:campaign-paper" },
  },
  {
    name: "Sustainable Living Awareness Walk",
    description:
      "A community walk and pop-up exhibit on everyday sustainable choices — composting, renewable energy basics, and reducing single-use plastic. Open to the whole neighbourhood.",
    campaignType: "awareness_campaign",
    categories: [],
    location: { line: "Community Park", area: "Sector 21", city: "Pune", state: "Maharashtra", pincode: "411021" },
    startDaysOffset: 12,
    endDaysOffset: 13,
    targetWeightKg: 0,
    targetParticipants: 80,
    expectedStalls: 15,
    bannerImage: { url: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&q=75", publicId: "external-seed:campaign-awareness" },
  },
];

const SEED_TITLES = SEED_CAMPAIGNS.map((c) => c.name);

/**
 * Real participation for the one completed campaign — a household
 * participant, a collector volunteer marked attended, and organizer-logged
 * collection entries. Uses whichever household/collector accounts exist;
 * skips silently if none do (same "skip, don't fabricate" rule as the rest
 * of this file).
 */
const seedCompletedCampaignParticipation = async (campaign) => {
  const [household, collector] = await Promise.all([
    User.findOne({ role: "household" }).select("_id name"),
    User.findOne({ role: "collector" }).select("_id name"),
  ]);

  const registeredAt = daysFromNow(-18);
  let participantCount = 0;
  let volunteerCount = 0;

  if (household) {
    const { contributionScore, ecoPoints } = scoreForCampaignParticipation("participant");
    await CampaignParticipant.create({
      campaignId: campaign._id,
      userId: household._id,
      participationType: "participant",
      status: "approved",
      registeredAt,
      respondedAt: registeredAt,
      contributionScore,
      ecoPointsEarned: ecoPoints,
    });
    await User.updateOne({ _id: household._id }, { $inc: { ecoPoints } });
    participantCount += 1;
  }

  if (collector) {
    const { contributionScore, ecoPoints } = scoreForCampaignParticipation("volunteer");
    await CampaignParticipant.create({
      campaignId: campaign._id,
      userId: collector._id,
      participationType: "volunteer",
      status: "attended",
      registeredAt,
      respondedAt: registeredAt,
      attendedAt: daysFromNow(-6),
      contributionScore,
      ecoPointsEarned: ecoPoints,
    });
    await User.updateOne({ _id: collector._id }, { $inc: { ecoPoints } });
    volunteerCount += 1;
  }

  const collectionLog = [
    { category: "e-waste", weightKg: 140, source: "organizer", recordedBy: campaign.organizerId, recordedAt: daysFromNow(-14) },
    { category: "e-waste", weightKg: 96, source: "organizer", recordedBy: campaign.organizerId, recordedAt: daysFromNow(-7) },
  ];
  const collectedWeightKg = collectionLog.reduce((sum, e) => sum + e.weightKg, 0);

  await Campaign.updateOne(
    { _id: campaign._id },
    { $set: { participantCount, volunteerCount, collectedWeightKg }, $push: { collectionLog: { $each: collectionLog } } }
  );
};

const seedCampaigns = async () => {
  const existingTitles = new Set(
    (await Campaign.find({ name: { $in: SEED_TITLES } }).select("name")).map((d) => d.name)
  );
  const missing = SEED_CAMPAIGNS.filter((c) => !existingTitles.has(c.name));

  if (missing.length === 0) {
    console.log(`ℹ️  All ${SEED_CAMPAIGNS.length} seeded campaigns already exist — skipping seed.`);
    return;
  }

  const organizers = await User.find({ role: "organization", isActive: true }).select("_id name");
  if (organizers.length === 0) {
    console.log("⚠️  No organization accounts exist yet — skipping campaign seed (campaigns need a real organizer).");
    return;
  }

  for (let i = 0; i < missing.length; i++) {
    const seed = missing[i];
    const organizerId = organizers[i % organizers.length]._id;

    const campaign = await Campaign.create({
      organizerId,
      name: seed.name,
      description: seed.description,
      campaignType: seed.campaignType,
      categories: seed.categories ?? [],
      location: seed.location,
      startDate: daysFromNow(seed.startDaysOffset),
      endDate: daysFromNow(seed.endDaysOffset),
      targetWeightKg: seed.targetWeightKg,
      targetParticipants: seed.targetParticipants,
      targetSaplings: seed.targetSaplings ?? null,
      expectedStalls: seed.expectedStalls ?? null,
      bannerImage: seed.bannerImage,
      lifecycleState: "published",
    });

    if (seed.seedParticipation) {
      await seedCompletedCampaignParticipation(campaign);
    }
  }

  console.log(`✅ Seeded ${missing.length} new campaign(s) (${existingTitles.size} already existed) across ${organizers.length} organizer(s).`);
};

const clearCampaignSeed = async () => {
  const campaigns = await Campaign.find({ name: { $in: SEED_TITLES } }).select("_id");
  const ids = campaigns.map((c) => c._id);
  const participantResult = await CampaignParticipant.deleteMany({ campaignId: { $in: ids } });
  const campaignResult = await Campaign.deleteMany({ _id: { $in: ids } });
  console.log(`🧹 Removed ${campaignResult.deletedCount} seeded campaign(s) and ${participantResult.deletedCount} participation record(s).`);
};

if (require.main === module) {
  const shouldClear = process.argv.includes("--clear");
  connectDB()
    .then(shouldClear ? clearCampaignSeed : seedCampaigns)
    .then(() => mongoose.disconnect())
    .catch((error) => {
      console.error("❌ Campaign seeding failed:", error.message);
      process.exit(1);
    });
}

module.exports = seedCampaigns;
module.exports.clearCampaignSeed = clearCampaignSeed;

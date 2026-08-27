const mongoose = require("mongoose");
const User = require("../models/User");
const Pickup = require("../models/Pickup");
const Product = require("../models/Product");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const Campaign = require("../models/Campaign");
const CampaignParticipant = require("../models/CampaignParticipant");
const ScrapRate = require("../models/ScrapRate");
const Notification = require("../models/Notification");
const AdminAuditLog = require("../models/AdminAuditLog");
const { CO2_PER_KG } = require("../services/ecoScoreService");
const { toTitleCase } = require("../utils/textNormalize");
const { notify } = require("../services/notificationService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Admin Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Every handler here is gated by the middleware chain:
 *   verifyFirebaseToken → attachUser → authorizeRoles("admin")
 * so req.user is always a verified admin — never a role from a request body.
 *
 * Security invariants:
 *   - No endpoint accepts a role, status, or pricing value from the client
 *     without server-side validation.
 *   - Destructive actions (delete, suspend) use soft-delete (isActive: false).
 *   - Every mutation logs to AdminAuditLog for accountability.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

const logAudit = async ({ adminId, action, targetType, targetId = null, metadata = null }) => {
  try {
    await AdminAuditLog.create({ adminId, action, targetType, targetId, metadata });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

/** Date helpers for period-based analytics. */
const getPeriodStart = (period) => {
  const now = new Date();
  switch (period) {
    case "7d":  return new Date(now.getTime() - 7 * 86_400_000);
    case "30d": return new Date(now.getTime() - 30 * 86_400_000);
    case "3m":  return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":  return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:    return new Date(now.getTime() - 30 * 86_400_000);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/dashboard/stats */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

    const [
      totalUsers,
      activeUsers,
      totalPickups,
      completedPickups,
      scrapAgg,
      ecoPointsAgg,
      totalListings,
      totalOrders,
      activeCampaigns,
      userTypeAgg,
      weeklyPickupsAgg,
      categoryDistAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, updatedAt: { $gte: thirtyDaysAgo } }),
      Pickup.countDocuments(),
      Pickup.countDocuments({ status: "completed" }),
      Pickup.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: { $sum: "$verifiedCategories.weightKg" } } } },
      ]),
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$ecoPoints" } } },
      ]),
      Product.countDocuments({ status: { $ne: "draft" } }),
      MarketplaceOrder.countDocuments(),
      Campaign.countDocuments({
        lifecycleState: "published",
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      // Breakdown by specific user type/category
      User.aggregate([
        {
          $group: {
            _id: {
              role: "$role",
              orgType: "$organizationType",
            },
            count: { $sum: 1 },
            activeCount: { $sum: { $cond: ["$isActive", 1, 0] } },
            totalEcoPoints: { $sum: "$ecoPoints" },
            totalWeightRecycled: { $sum: "$totalWeightRecycled" },
          },
        },
      ]),
      // 7-day pickup trend
      Pickup.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Top scrap categories distribution
      Pickup.aggregate([
        { $match: { status: "completed" } },
        { $unwind: "$verifiedCategories" },
        {
          $group: {
            _id: "$verifiedCategories.category",
            weightKg: { $sum: "$verifiedCategories.weightKg" },
            count: { $sum: 1 },
          },
        },
        { $sort: { weightKg: -1 } },
        { $limit: 6 },
      ]),
    ]);

    // Format user type breakdown
    const userTypes = [
      { key: "household", label: "Households", role: "household", count: 0, activeCount: 0, ecoPoints: 0, weightKg: 0, color: "#10B981" },
      { key: "ngo", label: "NGOs", role: "organization", orgType: "ngo", count: 0, activeCount: 0, ecoPoints: 0, weightKg: 0, color: "#3B82F6" },
      { key: "school", label: "Schools", role: "organization", orgType: "school", count: 0, activeCount: 0, ecoPoints: 0, weightKg: 0, color: "#8B5CF6" },
      { key: "university", label: "Universities", role: "organization", orgType: "university", count: 0, activeCount: 0, ecoPoints: 0, weightKg: 0, color: "#EC4899" },
      { key: "collector", label: "Scrap Collectors", role: "collector", count: 0, activeCount: 0, ecoPoints: 0, weightKg: 0, color: "#F59E0B" },
      { key: "admin", label: "Administrators", role: "admin", count: 0, activeCount: 0, ecoPoints: 0, weightKg: 0, color: "#EF4444" },
    ];

    userTypeAgg.forEach((item) => {
      const match = userTypes.find((ut) => {
        if (ut.orgType) {
          return ut.role === item._id.role && ut.orgType === item._id.orgType;
        }
        return ut.role === item._id.role && (!item._id.orgType || item._id.role !== "organization");
      });
      if (match) {
        match.count += item.count;
        match.activeCount += item.activeCount;
        match.ecoPoints += item.totalEcoPoints || 0;
        match.weightKg += Math.round((item.totalWeightRecycled || 0) * 10) / 10;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Admin dashboard stats retrieved",
      data: {
        totalUsers,
        activeUsers,
        totalPickups,
        completedPickups,
        totalScrapCollectedKg: Math.round((scrapAgg[0]?.total ?? 0) * 10) / 10,
        totalEcoPoints: ecoPointsAgg[0]?.total ?? 0,
        marketplaceListings: totalListings,
        marketplaceOrders: totalOrders,
        activeCampaigns,
        userTypeBreakdown: userTypes,
        weeklyPickupTrend: weeklyPickupsAgg.map((r) => ({
          date: r._id,
          total: r.total,
          completed: r.completed,
        })),
        categoryDistribution: categoryDistAgg.map((r) => ({
          category: r._id?.replace(/_/g, " "),
          rawCategory: r._id,
          weightKg: Math.round(r.weightKg * 10) / 10,
          count: r.count,
        })),
      },
    });

  } catch (error) {
    console.error("Admin dashboard stats error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading dashboard stats.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/admin/dashboard/activity */
const getPlatformActivity = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Gather recent events from multiple collections
    const [recentUsers, recentPickups, recentProducts, recentOrders, recentCampaigns] =
      await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .select("name role createdAt profileImage")
          .lean(),
        Pickup.find()
          .sort({ updatedAt: -1 })
          .limit(limit)
          .populate("userId", "name")
          .populate("collectorId", "name")
          .select("status updatedAt userId collectorId statusHistory")
          .lean(),
        Product.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("sellerId", "name")
          .select("title status createdAt sellerId")
          .lean(),
        MarketplaceOrder.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("buyerId", "name")
          .select("orderStatus createdAt buyerId productSnapshot")
          .lean(),
        Campaign.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("organizerId", "name")
          .select("name lifecycleState createdAt organizerId startDate endDate")
          .lean(),
      ]);

    // Merge into a unified activity feed
    const activities = [];

    for (const u of recentUsers) {
      activities.push({
        type: "user_registered",
        icon: "user-plus",
        description: `${u.name} registered as ${u.role}`,
        timestamp: u.createdAt,
        entity: { type: "user", id: u._id, name: u.name },
      });
    }

    for (const p of recentPickups) {
      const customerName = p.userId?.name ?? "Unknown";
      const collectorName = p.collectorId?.name ?? null;
      let desc = "";
      if (p.status === "pending") desc = `${customerName} requested a pickup`;
      else if (p.status === "collector_assigned") desc = `${collectorName ?? "A collector"} accepted pickup from ${customerName}`;
      else if (p.status === "completed") desc = `Pickup from ${customerName} completed`;
      else if (p.status === "cancelled") desc = `Pickup from ${customerName} was cancelled`;
      else if (p.status === "on_the_way") desc = `${collectorName ?? "Collector"} is on the way to ${customerName}`;
      else if (p.status === "in_progress") desc = `Pickup from ${customerName} is in progress`;
      else desc = `Pickup from ${customerName} status: ${p.status}`;

      activities.push({
        type: `pickup_${p.status}`,
        icon: "truck",
        description: desc,
        timestamp: p.updatedAt,
        entity: { type: "pickup", id: p._id },
      });
    }

    for (const pr of recentProducts) {
      const sellerName = pr.sellerId?.name ?? "Unknown";
      activities.push({
        type: "listing_created",
        icon: "package",
        description: `${sellerName} listed "${pr.title}" on marketplace`,
        timestamp: pr.createdAt,
        entity: { type: "product", id: pr._id, name: pr.title },
      });
    }

    for (const o of recentOrders) {
      const buyerName = o.buyerId?.name ?? "Unknown";
      const productTitle = o.productSnapshot?.title ?? "a product";
      if (o.orderStatus === "completed") {
        activities.push({
          type: "purchase_completed",
          icon: "shopping-bag",
          description: `${buyerName} completed purchase of "${productTitle}"`,
          timestamp: o.createdAt,
          entity: { type: "order", id: o._id },
        });
      }
    }

    for (const c of recentCampaigns) {
      const orgName = c.organizerId?.name ?? "Unknown";
      activities.push({
        type: "campaign_created",
        icon: "megaphone",
        description: `${orgName} created campaign "${c.name}"`,
        timestamp: c.createdAt,
        entity: { type: "campaign", id: c._id, name: c.name },
      });
    }

    // Sort by timestamp descending and take the top entries
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const trimmed = activities.slice(0, limit);

    return res.status(200).json({
      success: true,
      message: "Platform activity retrieved",
      data: trimmed,
    });
  } catch (error) {
    console.error("Platform activity error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading platform activity.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/analytics?period=30d */
const getAnalytics = async (req, res) => {
  try {
    const period = req.query.period || "30d";
    const periodStart = getPeriodStart(period);

    const [
      userGrowth,
      usersByRole,
      pickupVolume,
      scrapOverTime,
      scrapByCategory,
      revenueOverTime,
      marketplaceActivity,
      campaignParticipation,
      co2OverTime,
      ecoPointsOverTime,
    ] = await Promise.all([
      // User growth over time
      User.aggregate([
        { $match: { createdAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Users by role
      User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]),

      // Pickup volume over time
      Pickup.aggregate([
        { $match: { createdAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Scrap collected over time
      Pickup.aggregate([
        { $match: { status: "completed", completedAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            weightKg: { $sum: { $sum: "$verifiedCategories.weightKg" } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Scrap by category (all time)
      Pickup.aggregate([
        { $match: { status: "completed" } },
        { $unwind: "$verifiedCategories" },
        {
          $group: {
            _id: "$verifiedCategories.category",
            weightKg: { $sum: "$verifiedCategories.weightKg" },
            count: { $sum: 1 },
          },
        },
        { $sort: { weightKg: -1 } },
      ]),

      // Revenue / payout trends
      Pickup.aggregate([
        { $match: { status: "completed", completedAt: { $gte: periodStart }, isDonation: false } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            totalAmount: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Marketplace activity
      MarketplaceOrder.aggregate([
        { $match: { createdAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Campaign participation
      CampaignParticipant.aggregate([
        { $match: { createdAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            participants: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // CO2 saved over time
      Pickup.aggregate([
        { $match: { status: "completed", completedAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            weightKg: { $sum: { $sum: "$verifiedCategories.weightKg" } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Eco points generated over time
      Pickup.aggregate([
        { $match: { status: "completed", completedAt: { $gte: periodStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            points: { $sum: "$ecoPointsEarned" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: "Analytics retrieved",
      data: {
        period,
        userGrowth: userGrowth.map((r) => ({ date: r._id, count: r.count })),
        usersByRole: usersByRole.map((r) => ({ role: r._id, count: r.count })),
        pickupVolume: pickupVolume.map((r) => ({ date: r._id, total: r.total, completed: r.completed })),
        scrapOverTime: scrapOverTime.map((r) => ({
          date: r._id,
          weightKg: Math.round(r.weightKg * 10) / 10,
        })),
        scrapByCategory: scrapByCategory.map((r) => ({
          category: r._id,
          weightKg: Math.round(r.weightKg * 10) / 10,
          count: r.count,
        })),
        revenueOverTime: revenueOverTime.map((r) => ({
          date: r._id,
          amount: Math.round(r.totalAmount * 100) / 100,
        })),
        marketplaceActivity: marketplaceActivity.map((r) => ({
          date: r._id,
          orders: r.orders,
          revenue: Math.round(r.revenue * 100) / 100,
        })),
        campaignParticipation: campaignParticipation.map((r) => ({
          date: r._id,
          participants: r.participants,
        })),
        co2OverTime: co2OverTime.map((r) => ({
          date: r._id,
          co2SavedKg: Math.round(r.weightKg * CO2_PER_KG * 10) / 10,
        })),
        ecoPointsOverTime: ecoPointsOverTime.map((r) => ({
          date: r._id,
          points: r.points,
        })),
      },
    });
  } catch (error) {
    console.error("Admin analytics error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading analytics.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/admin/analytics/environmental-impact */
const getEnvironmentalImpact = async (req, res) => {
  try {
    const [scrapAgg, ecoPointsAgg, completedPickups, activeCollectors, participatingOrgs] =
      await Promise.all([
        Pickup.aggregate([
          { $match: { status: "completed" } },
          { $group: { _id: null, total: { $sum: { $sum: "$verifiedCategories.weightKg" } } } },
        ]),
        User.aggregate([{ $group: { _id: null, total: { $sum: "$ecoPoints" } } }]),
        Pickup.countDocuments({ status: "completed" }),
        User.countDocuments({ role: "collector", isActive: true }),
        User.countDocuments({ role: "organization", isActive: true }),
      ]);

    const totalScrapKg = scrapAgg[0]?.total ?? 0;

    return res.status(200).json({
      success: true,
      message: "Environmental impact retrieved",
      data: {
        totalScrapRecycledKg: Math.round(totalScrapKg * 10) / 10,
        totalCo2SavedKg: Math.round(totalScrapKg * CO2_PER_KG * 10) / 10,
        totalEcoPoints: ecoPointsAgg[0]?.total ?? 0,
        totalCompletedPickups: completedPickups,
        activeCollectors,
        participatingOrganizations: participatingOrgs,
      },
    });
  } catch (error) {
    console.error("Environmental impact error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading environmental impact.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/users?search=&role=&status=&page=&limit=&sortBy=&order= */
const listUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      status,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const skip = (pageNum - 1) * limitNum;
    const sortDir = order === "asc" ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(limitNum)
        .select("name email role organizationType address isActive isVerified createdAt profileImage totalPickups totalWeightRecycled ecoPoints")
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Users retrieved",
      data: {
        users: users.map((u) => ({
          ...u,
          id: u._id.toString(),
          location: u.address?.city ? toTitleCase(u.address.city) : null,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("List users error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading users.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/admin/users/:id */
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-__v -firebaseUid -razorpayContactId")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    // Role-specific stats
    let roleStats = {};

    if (user.role === "household" || user.role === "organization") {
      const [pickupCount, pickupAgg, campaignCount] = await Promise.all([
        Pickup.countDocuments({ userId: user._id }),
        Pickup.aggregate([
          { $match: { userId: user._id, status: "completed", isDonation: false } },
          { $group: { _id: null, totalAmount: { $sum: "$totalAmount" }, totalWeight: { $sum: { $sum: "$verifiedCategories.weightKg" } } } },
        ]),
        CampaignParticipant.countDocuments({ userId: user._id, status: { $in: ["approved", "attended"] } }),
      ]);
      roleStats = {
        totalPickups: pickupCount,
        scrapRecycledKg: Math.round((pickupAgg[0]?.totalWeight ?? 0) * 10) / 10,
        moneyEarned: Math.round((pickupAgg[0]?.totalAmount ?? 0) * 100) / 100,
        ecoPoints: user.ecoPoints ?? 0,
        campaignsParticipated: campaignCount,
      };
    } else if (user.role === "collector") {
      const [completedPickups, collectorAgg] = await Promise.all([
        Pickup.countDocuments({ collectorId: user._id, status: "completed" }),
        Pickup.aggregate([
          { $match: { collectorId: user._id, status: "completed" } },
          { $group: { _id: null, totalWeight: { $sum: { $sum: "$verifiedCategories.weightKg" } }, totalEarnings: { $sum: "$totalAmount" } } },
        ]),
      ]);
      roleStats = {
        completedPickups,
        totalCollectedWeightKg: Math.round((collectorAgg[0]?.totalWeight ?? 0) * 10) / 10,
        totalEarnings: Math.round((collectorAgg[0]?.totalEarnings ?? 0) * 100) / 100,
        rating: user.collectorProfile?.rating ?? 4.5,
      };
    } else if (user.role === "organization") {
      const [campaignsCreated, campaignAgg] = await Promise.all([
        Campaign.countDocuments({ organizerId: user._id }),
        Campaign.aggregate([
          { $match: { organizerId: user._id } },
          { $group: { _id: null, totalParticipants: { $sum: "$participantCount" }, totalWeight: { $sum: "$collectedWeightKg" } } },
        ]),
      ]);
      roleStats.campaignsCreated = campaignsCreated;
      roleStats.totalParticipants = campaignAgg[0]?.totalParticipants ?? 0;
      roleStats.totalWeightCollectedKg = Math.round((campaignAgg[0]?.totalWeight ?? 0) * 10) / 10;
    }

    // Recent activity for this user
    const recentPickups = await Pickup.find({
      $or: [{ userId: user._id }, { collectorId: user._id }],
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("status updatedAt totalAmount pickupDate")
      .lean();

    return res.status(200).json({
      success: true,
      message: "User details retrieved",
      data: {
        user: {
          ...user,
          id: user._id.toString(),
          location: user.address?.city ? toTitleCase(user.address.city) : null,
        },
        roleStats,
        recentActivity: recentPickups.map((p) => ({
          id: p._id.toString(),
          type: "pickup",
          status: p.status,
          date: p.updatedAt,
          amount: p.totalAmount,
        })),
      },
    });
  } catch (error) {
    console.error("User details error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading user details.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/admin/users/:id/status  body: { isActive: boolean } */
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    // Don't let admin deactivate themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    await logAudit({
      adminId: req.user._id,
      action: isActive ? "user_activated" : "user_deactivated",
      targetType: "user",
      targetId: user._id,
      metadata: { previousStatus, newStatus: isActive },
    });

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
      data: { id: user._id.toString(), isActive: user.isActive },
    });
  } catch (error) {
    console.error("Update user status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating user status.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/admin/users/:id/role  body: { role, organizationType? } */
const updateUserRole = async (req, res) => {
  try {
    const { role, organizationType } = req.body;
    const validRoles = ["household", "organization", "collector", "admin"];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(", ")}`,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    if (role === "organization" && !["ngo", "school", "university"].includes(organizationType)) {
      return res.status(400).json({
        success: false,
        message: "organizationType is required for organization role (ngo, school, university).",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    const previousRole = user.role;
    const previousOrgType = user.organizationType;
    user.role = role;
    user.organizationType = role === "organization" ? organizationType : null;
    await user.save();

    await logAudit({
      adminId: req.user._id,
      action: "user_role_changed",
      targetType: "user",
      targetId: user._id,
      metadata: { previousRole, newRole: role, previousOrgType, newOrgType: user.organizationType },
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: { id: user._id.toString(), role: user.role, organizationType: user.organizationType },
    });
  } catch (error) {
    console.error("Update user role error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating user role.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** DELETE /api/admin/users/:id — soft delete only */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    user.isActive = false;
    await user.save();

    await logAudit({
      adminId: req.user._id,
      action: "user_deleted",
      targetType: "user",
      targetId: user._id,
      metadata: { userName: user.name, userEmail: user.email, userRole: user.role },
    });

    return res.status(200).json({
      success: true,
      message: "User account deactivated (soft-deleted).",
      data: { id: user._id.toString() },
    });
  } catch (error) {
    console.error("Delete user error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting user.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PICKUP MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/pickups?status=&search=&page=&limit= */
const listAllPickups = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const skip = (pageNum - 1) * limitNum;

    // If search is provided, we need to find matching users first
    let userIds = null;
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();
      userIds = matchingUsers.map((u) => u._id);
      filter.$or = [{ userId: { $in: userIds } }, { collectorId: { $in: userIds } }];
    }

    const [pickups, total] = await Promise.all([
      Pickup.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email role")
        .populate("collectorId", "name email")
        .select("status pickupDate estimatedCategories totalAmount createdAt verifiedCategories paymentStatus pickupType pickupAddress")
        .lean(),
      Pickup.countDocuments(filter),
    ]);

    // Count by status for tab badges
    const statusCounts = await Pickup.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = {};
    for (const s of statusCounts) counts[s._id] = s.count;

    return res.status(200).json({
      success: true,
      message: "Pickups retrieved",
      data: {
        pickups: pickups.map((p) => ({
          id: p._id.toString(),
          customer: p.userId ? { name: p.userId.name, email: p.userId.email, role: p.userId.role } : null,
          collector: p.collectorId ? { name: p.collectorId.name, email: p.collectorId.email } : null,
          status: p.status,
          pickupDate: p.pickupDate,
          pickupType: p.pickupType,
          categories: p.estimatedCategories,
          totalWeight: p.verifiedCategories?.reduce((sum, c) => sum + (c.weightKg || 0), 0) ?? 0,
          totalAmount: p.totalAmount,
          paymentStatus: p.paymentStatus,
          city: p.pickupAddress?.city ? toTitleCase(p.pickupAddress.city) : null,
          createdAt: p.createdAt,
        })),
        statusCounts: counts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("List pickups error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading pickups.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/admin/pickups/:id */
const getPickupDetails = async (req, res) => {
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate("userId", "name email phone role address profileImage")
      .populate("collectorId", "name email phone collectorProfile profileImage")
      .populate("relatedCampaign", "name")
      .lean();

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pickup details retrieved",
      data: {
        id: pickup._id.toString(),
        customer: pickup.userId ? {
          id: pickup.userId._id.toString(),
          name: pickup.userId.name,
          email: pickup.userId.email,
          phone: pickup.userId.phone,
          role: pickup.userId.role,
        } : null,
        collector: pickup.collectorId ? {
          id: pickup.collectorId._id.toString(),
          name: pickup.collectorId.name,
          email: pickup.collectorId.email,
          phone: pickup.collectorId.phone,
          rating: pickup.collectorId.collectorProfile?.rating,
        } : null,
        status: pickup.status,
        pickupType: pickup.pickupType,
        pickupDate: pickup.pickupDate,
        pickupTimeSlot: pickup.pickupTimeSlot,
        address: pickup.pickupAddress ? {
          ...pickup.pickupAddress,
          city: pickup.pickupAddress.city ? toTitleCase(pickup.pickupAddress.city) : null,
        } : null,
        estimatedCategories: pickup.estimatedCategories,
        estimatedWeight: pickup.estimatedWeight,
        verifiedCategories: pickup.verifiedCategories,
        totalAmount: pickup.totalAmount,
        serviceCharge: pickup.serviceCharge,
        paymentStatus: pickup.paymentStatus,
        isDonation: pickup.isDonation,
        statusHistory: pickup.statusHistory,
        images: pickup.images,
        notes: pickup.notes,
        rating: pickup.rating,
        cancellation: pickup.cancellation,
        ecoPointsEarned: pickup.ecoPointsEarned,
        contributionScore: pickup.contributionScore,
        completedAt: pickup.completedAt,
        createdAt: pickup.createdAt,
        relatedCampaign: pickup.relatedCampaign ? {
          id: pickup.relatedCampaign._id.toString(),
          name: pickup.relatedCampaign.name,
        } : null,
      },
    });
  } catch (error) {
    console.error("Pickup details error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading pickup details.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MARKETPLACE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/marketplace/overview */
const getMarketplaceOverview = async (req, res) => {
  try {
    const [statusCounts, orderCount, orderRevenueAgg] = await Promise.all([
      Product.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      MarketplaceOrder.countDocuments(),
      MarketplaceOrder.aggregate([
        { $match: { orderStatus: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    const byStat = {};
    for (const s of statusCounts) byStat[s._id] = s.count;

    return res.status(200).json({
      success: true,
      message: "Marketplace overview retrieved",
      data: {
        totalListings: Object.values(byStat).reduce((a, b) => a + b, 0),
        activeListings: byStat.active ?? 0,
        soldListings: byStat.sold ?? 0,
        inactiveListings: byStat.inactive ?? 0,
        draftListings: byStat.draft ?? 0,
        totalOrders: orderCount,
        totalRevenue: Math.round((orderRevenueAgg[0]?.total ?? 0) * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Marketplace overview error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading marketplace overview.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/admin/marketplace/products?status=&search=&page=&limit= */
const listAllProducts = async (req, res) => {
  try {
    const { status, category, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("sellerId", "name email")
        .select("title category price status location images createdAt sellerId condition quantity")
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Products retrieved",
      data: {
        products: products.map((p) => ({
          id: p._id.toString(),
          title: p.title,
          category: p.category,
          price: p.price,
          status: p.status,
          condition: p.condition,
          quantity: p.quantity,
          location: p.location?.city ? toTitleCase(p.location.city) : null,
          imageUrl: p.images?.[0]?.url ?? null,
          seller: p.sellerId ? { name: p.sellerId.name, email: p.sellerId.email, id: p.sellerId._id.toString() } : null,
          createdAt: p.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("List products error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading products.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/admin/marketplace/products/:id/status  body: { status: "active"|"inactive" } */
const updateProductStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active' or 'inactive'.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    const previousStatus = product.status;
    product.status = status;
    await product.save();

    await logAudit({
      adminId: req.user._id,
      action: status === "inactive" ? "product_deactivated" : "product_restored",
      targetType: "product",
      targetId: product._id,
      metadata: { previousStatus, newStatus: status, title: product.title },
    });

    return res.status(200).json({
      success: true,
      message: `Product ${status === "inactive" ? "deactivated" : "restored"} successfully.`,
      data: { id: product._id.toString(), status: product.status },
    });
  } catch (error) {
    console.error("Update product status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating product status.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/campaigns?status=&search=&page=&limit= */
const listAllCampaigns = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    const now = new Date();

    // Status filtering maps to lifecycle + date logic
    if (status === "active") {
      filter.lifecycleState = "published";
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    } else if (status === "upcoming") {
      filter.lifecycleState = "published";
      filter.startDate = { $gt: now };
    } else if (status === "completed") {
      filter.lifecycleState = "published";
      filter.endDate = { $lt: now };
    } else if (status === "cancelled") {
      filter.lifecycleState = "cancelled";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("organizerId", "name email organizationType")
        .select("name campaignType startDate endDate location participantCount volunteerCount targetWeightKg collectedWeightKg lifecycleState bannerImage organizerId")
        .lean(),
      Campaign.countDocuments(filter),
    ]);

    // Status counts for tab badges
    const allCampaigns = await Campaign.find().select("lifecycleState startDate endDate").lean();
    const statusCounts = { active: 0, upcoming: 0, completed: 0, cancelled: 0 };
    for (const c of allCampaigns) {
      if (c.lifecycleState === "cancelled") statusCounts.cancelled++;
      else if (c.startDate > now) statusCounts.upcoming++;
      else if (c.endDate < now) statusCounts.completed++;
      else statusCounts.active++;
    }

    return res.status(200).json({
      success: true,
      message: "Campaigns retrieved",
      data: {
        campaigns: campaigns.map((c) => {
          let derivedStatus = "upcoming";
          if (c.lifecycleState === "cancelled") derivedStatus = "cancelled";
          else if (c.startDate <= now && c.endDate >= now) derivedStatus = "active";
          else if (c.endDate < now) derivedStatus = "completed";

          return {
            id: c._id.toString(),
            name: c.name,
            type: c.campaignType,
            organizer: c.organizerId ? { name: c.organizerId.name, id: c.organizerId._id.toString() } : null,
            startDate: c.startDate,
            endDate: c.endDate,
            location: c.location?.city ? toTitleCase(c.location.city) : null,
            participantCount: c.participantCount,
            volunteerCount: c.volunteerCount,
            targetWeightKg: c.targetWeightKg,
            collectedWeightKg: Math.round((c.collectedWeightKg ?? 0) * 10) / 10,
            status: derivedStatus,
            bannerUrl: c.bannerImage?.url ?? null,
          };
        }),
        statusCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("List campaigns error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading campaigns.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/admin/campaigns/:id/status  body: { action: "cancel", reason? } */
const updateCampaignStatus = async (req, res) => {
  try {
    const { action, reason } = req.body;

    if (action !== "cancel") {
      return res.status(400).json({
        success: false,
        message: "Only 'cancel' action is supported.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    if (campaign.lifecycleState === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Campaign is already cancelled.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    campaign.lifecycleState = "cancelled";
    campaign.cancellation = {
      reason: reason || "Cancelled by admin",
      cancelledAt: new Date(),
    };
    await campaign.save();

    await logAudit({
      adminId: req.user._id,
      action: "campaign_cancelled",
      targetType: "campaign",
      targetId: campaign._id,
      metadata: { campaignName: campaign.name, reason: reason || "Cancelled by admin" },
    });

    return res.status(200).json({
      success: true,
      message: "Campaign cancelled successfully.",
      data: { id: campaign._id.toString(), lifecycleState: campaign.lifecycleState },
    });
  } catch (error) {
    console.error("Update campaign status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating campaign status.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCRAP RATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/scrap-rates */
const listRatesAdmin = async (req, res) => {
  try {
    const rates = await ScrapRate.find()
      .sort({ category: 1 })
      .populate("updatedBy", "name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Scrap rates retrieved",
      data: rates.map((r) => ({
        id: r._id.toString(),
        category: r.category,
        displayName: r.displayName,
        unit: r.unit,
        pricePerKg: r.pricePerKg,
        isActive: r.isActive,
        lastUpdated: r.lastUpdated,
        updatedBy: r.updatedBy ? r.updatedBy.name : null,
      })),
    });
  } catch (error) {
    console.error("List admin rates error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading scrap rates.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/admin/scrap-rates/:id  body: { pricePerKg } */
const updateRate = async (req, res) => {
  try {
    const { pricePerKg } = req.body;

    if (typeof pricePerKg !== "number" || pricePerKg < 0) {
      return res.status(400).json({
        success: false,
        message: "pricePerKg must be a non-negative number.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const rate = await ScrapRate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({
        success: false,
        message: "Scrap rate not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    const previousRate = rate.pricePerKg;
    rate.pricePerKg = pricePerKg;
    rate.lastUpdated = new Date();
    rate.updatedBy = req.user._id;
    await rate.save();

    await logAudit({
      adminId: req.user._id,
      action: "scrap_rate_updated",
      targetType: "scrap_rate",
      targetId: rate._id,
      metadata: { category: rate.category, previousRate, newRate: pricePerKg },
    });

    return res.status(200).json({
      success: true,
      message: `Rate for ${rate.displayName} updated to ₹${pricePerKg}/kg.`,
      data: {
        id: rate._id.toString(),
        category: rate.category,
        displayName: rate.displayName,
        pricePerKg: rate.pricePerKg,
        lastUpdated: rate.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Update rate error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating scrap rate.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/admin/notifications/send  body: { target, targetRole?, targetUserId?, title, description, type } */
const sendNotification = async (req, res) => {
  try {
    const { target, targetRole, targetUserId, title, description, type = "campaign" } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "title and description are required.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    if (!["all", "role", "user"].includes(target)) {
      return res.status(400).json({
        success: false,
        message: "target must be 'all', 'role', or 'user'.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const validTypes = ["pickup", "points", "marketplace", "campaign"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type must be one of: ${validTypes.join(", ")}`,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    let recipients = [];

    if (target === "all") {
      recipients = await User.find({ isActive: true }).select("_id").lean();
    } else if (target === "role") {
      if (!targetRole) {
        return res.status(400).json({
          success: false,
          message: "targetRole is required when target is 'role'.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      recipients = await User.find({ role: targetRole, isActive: true }).select("_id").lean();
    } else if (target === "user") {
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: "targetUserId is required when target is 'user'.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      const user = await User.findById(targetUserId).select("_id").lean();
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Target user not found.",
          error: { code: "NOT_FOUND" },
        });
      }
      recipients = [user];
    }

    // Batch create notifications — fire and forget for each one
    let sentCount = 0;
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const docs = batch.map((r) => ({
        userId: r._id,
        type,
        title,
        description,
      }));
      await Notification.insertMany(docs, { ordered: false });
      sentCount += docs.length;
    }

    await logAudit({
      adminId: req.user._id,
      action: "notification_sent",
      targetType: "notification",
      metadata: { target, targetRole, targetUserId, title, recipientCount: sentCount },
    });

    return res.status(200).json({
      success: true,
      message: `Notification sent to ${sentCount} user(s).`,
      data: { sentCount },
    });
  } catch (error) {
    console.error("Send notification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while sending notifications.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** GET /api/admin/notifications?page=&limit= */
const listPlatformNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const skip = (pageNum - 1) * limitNum;

    // Show unique recent notifications (admin-sent ones typically share the same title/timestamp)
    const [notifications, total] = await Promise.all([
      Notification.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("userId", "name email")
        .lean(),
      Notification.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved",
      data: {
        notifications: notifications.map((n) => ({
          id: n._id.toString(),
          type: n.type,
          title: n.title,
          description: n.description,
          read: n.read,
          user: n.userId ? { name: n.userId.name, email: n.userId.email } : null,
          createdAt: n.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("List notifications error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading notifications.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/admin/audit-logs?action=&page=&limit= */
const getAuditLogs = async (req, res) => {
  try {
    const { action, page = 1, limit = 30 } = req.query;

    const filter = {};
    if (action) filter.action = action;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 100);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("adminId", "name email")
        .lean(),
      AdminAuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved",
      data: {
        logs: logs.map((l) => ({
          id: l._id.toString(),
          admin: l.adminId ? { name: l.adminId.name, email: l.adminId.email } : null,
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId?.toString() ?? null,
          metadata: l.metadata,
          createdAt: l.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Audit logs error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading audit logs.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  getDashboardStats,
  getPlatformActivity,
  getAnalytics,
  getEnvironmentalImpact,
  listUsers,
  getUserDetails,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  listAllPickups,
  getPickupDetails,
  getMarketplaceOverview,
  listAllProducts,
  updateProductStatus,
  listAllCampaigns,
  updateCampaignStatus,
  listRatesAdmin,
  updateRate,
  sendNotification,
  listPlatformNotifications,
  getAuditLogs,
};

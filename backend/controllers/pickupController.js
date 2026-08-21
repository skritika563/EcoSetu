const Pickup = require("../models/Pickup");
const User = require("../models/User");
const { serializePickup, POPULATE_FIELDS } = require("../services/pickupSerializer");
const { calculatePickupTotal, getServiceCharge } = require("../services/pricingService");
const { scoreForCompletedPickup } = require("../services/ecoScoreService");
const { notify } = require("../services/notificationService");
const { uploadImageBuffer, deleteImage } = require("../services/imageUploadService");
const { MAX_IMAGES_PER_PICKUP } = require("../middleware/uploadMiddleware");
const { INSTANT_FEE_RUPEES, verifyPaymentSignature } = require("../services/razorpayService");
const { isValidCityName } = require("../utils/textNormalize");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Pickup Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Backs the already-built Pickups module (frontend/src/pages/pickups/*).
 * Every mutating action re-checks ownership server-side — a household user
 * can never act on another user's pickup, a collector can never act on a job
 * that isn't (or isn't yet) theirs, no matter what ID appears in the URL.
 *
 * Pricing is NEVER accepted from the client: verifyPickup takes only
 * {category, weight} pairs and looks up the current rate itself
 * (services/pricingService.js).
 */

const populate = (query) =>
  query.populate("userId", POPULATE_FIELDS.user).populate("collectorId", POPULATE_FIELDS.collector);

const VALID_CATEGORIES = Pickup.CATEGORIES;
const isOwner = (pickup, userId) => pickup.userId?._id?.toString() === userId.toString() || pickup.userId?.toString() === userId.toString();
const isAssignedCollector = (pickup, userId) =>
  pickup.collectorId && (pickup.collectorId._id?.toString() === userId.toString() || pickup.collectorId.toString() === userId.toString());
// Same "available to accept" definition listPickups uses for a collector's
// Requests tab (status pending, nobody assigned yet). getPickupById must
// grant the same visibility, or a job that legitimately appears in the list
// 404s the moment the collector taps into it.
const isOpenRequest = (pickup) => pickup.status === "pending" && !pickup.collectorId;

/**
 * POST /api/pickups
 * Role: household, organization
 * Category/weight are always optional — the booking form never forces
 * classification (see ScrapInfoStep.jsx).
 *
 * Instant pickups require a REAL, already-verified Razorpay payment for the
 * fixed platform fee before the pickup is created at all — never the other
 * way around. The frontend creates a payment order (POST
 * /api/payments/instant-fee/order), completes checkout, and only then calls
 * this endpoint with the resulting order/payment/signature. Nothing about
 * the payment amount is ever trusted from the client — only the order and
 * payment ids, which get cryptographically re-verified here.
 */
const createPickup = async (req, res) => {
  try {
    const {
      pickupType = "scheduled",
      pickupAddress,
      pickupDate,
      pickupTimeSlot,
      estimatedCategories = [],
      itemCount,
      estimatedWeight,
      classificationSource = "skipped",
      aiPrediction,
      imageCount = 0,
      notes,
      isDonation = false,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!pickupAddress?.line || !pickupAddress?.city) {
      return res.status(400).json({
        success: false,
        message: "Pickup address must include at least a line and a city.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    // Checked up front, before any payment is touched — an instant pickup
    // charges a real fee a few lines below this, and a malformed city name
    // should never get that far only to fail at Pickup.create() after the
    // card's already been charged.
    if (!isValidCityName(pickupAddress.city)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid city name.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    if (!pickupDate) {
      return res.status(400).json({
        success: false,
        message: "Pickup date is required.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    const invalidCategories = (estimatedCategories || []).filter((c) => !VALID_CATEGORIES.includes(c));
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Unknown categories: ${invalidCategories.join(", ")}`,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    let instantFeePayment = null;
    if (pickupType === "instant") {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(402).json({
          success: false,
          message: "Payment is required to confirm an instant pickup.",
          error: { code: "PAYMENT_REQUIRED" },
        });
      }
      const verified = verifyPaymentSignature({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      });
      if (!verified) {
        return res.status(402).json({
          success: false,
          message: "We couldn't verify your payment. Please try again.",
          error: { code: "PAYMENT_VERIFICATION_FAILED" },
        });
      }
      // A quick pre-check for a clear error message on the common case — the
      // unique sparse index on instantFeePayment.razorpayPaymentId (see
      // models/Pickup.js) is what actually closes the race condition if two
      // requests with the same payment somehow land at the same instant.
      const alreadyUsed = await Pickup.exists({ "instantFeePayment.razorpayPaymentId": razorpayPaymentId });
      if (alreadyUsed) {
        return res.status(409).json({
          success: false,
          message: "This payment has already been used for another pickup.",
          error: { code: "CONFLICT" },
        });
      }
      instantFeePayment = {
        razorpayOrderId,
        razorpayPaymentId,
        amount: INSTANT_FEE_RUPEES,
        paidAt: new Date(),
      };
    }

    const pickup = await Pickup.create({
      userId: req.user._id,
      pickupType,
      status: "pending",
      pickupAddress,
      pickupDate,
      pickupTimeSlot: pickupTimeSlot || null,
      estimatedCategories,
      itemCount: itemCount ?? null,
      estimatedWeight: estimatedWeight ?? null,
      classificationSource,
      aiPrediction: aiPrediction ?? null,
      imageCount,
      notes: notes || null,
      isDonation,
      serviceCharge: getServiceCharge(pickupType),
      instantFeePayment,
      statusHistory: [
        {
          status: "pending",
          at: new Date(),
          note: pickupType === "instant" ? "Instant pickup requested" : "Pickup requested",
          changedBy: req.user._id,
        },
      ],
    });

    await pickup.populate("userId", POPULATE_FIELDS.user);

    return res.status(201).json({
      success: true,
      message: "Pickup scheduled successfully",
      data: serializePickup(pickup),
    });
  } catch (error) {
    // The unique index is the real guard against a payment being reused
    // across a race; this turns that into the same clean 409 the pre-check
    // above returns for the non-racing case, instead of a raw 500.
    if (error.code === 11000 && error.keyPattern?.["instantFeePayment.razorpayPaymentId"]) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been used for another pickup.",
        error: { code: "CONFLICT" },
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        error: { code: "VALIDATION_ERROR", details: Object.values(error.errors).map((e) => e.message) },
      });
    }
    console.error("Create pickup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating pickup.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/pickups/:id/images
 * Role: household, organization (the pickup's OWNER — booking-time photos),
 * or collector (the ASSIGNED collector only, and only while the job is
 * still active — on-site verification photos). Nobody else, and neither
 * role can touch a pickup that isn't theirs — ownership/assignment is
 * re-checked here exactly like every other pickup endpoint, never loosened
 * just because a second caller type is now allowed to hit this route.
 *
 * Must run AFTER the pickup already exists (see BookPickupPage.jsx and
 * ScrapVerificationForm.jsx) — a pickup id is required to know which
 * Cloudinary folder these belong to.
 */
const uploadPickupImages = async (req, res) => {
  try {
    const pickup = await populate(Pickup.findById(req.params.id));
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }

    // 404, not 403 — same "don't confirm another user's pickup even exists"
    // rule every other pickup endpoint follows.
    const isCustomer = req.user.role === "household" || req.user.role === "organization";
    let uploadedBy = null;
    if (isCustomer && isOwner(pickup, req.user._id)) {
      uploadedBy = "customer";
    } else if (req.user.role === "collector" && isAssignedCollector(pickup, req.user._id)) {
      // Verification photos only make sense while the job is still active —
      // once it's completed or cancelled there's nothing left to verify.
      if (pickup.status === "completed" || pickup.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: "This job is already finished — photos can't be added to it anymore.",
          error: { code: "VALIDATION_ERROR" },
        });
      }
      uploadedBy = "collector";
    }
    if (!uploadedBy) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attach at least one image.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const existingCount = pickup.images?.length ?? 0;
    if (existingCount + files.length > MAX_IMAGES_PER_PICKUP) {
      return res.status(400).json({
        success: false,
        message: `A pickup can have at most ${MAX_IMAGES_PER_PICKUP} images total (${existingCount} already saved).`,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const folder = `ecosetu/pickups/${pickup._id}`;
    const uploaded = [];
    try {
      // Sequential, not Promise.all — if an upload partway through the batch
      // fails, we know exactly which ones already landed on Cloudinary and
      // can roll just those back below, rather than guessing from a
      // rejected-batch error with no record of any partial progress.
      for (let i = 0; i < files.length; i++) {
        const publicId = `img_${Date.now()}_${i}`;
        const result = await uploadImageBuffer(files[i].buffer, { folder, publicId });
        uploaded.push({ ...result, uploadedBy });
      }
    } catch (uploadError) {
      await Promise.all(uploaded.map((img) => deleteImage(img.publicId)));
      throw uploadError;
    }

    pickup.images = [...(pickup.images ?? []), ...uploaded];
    // Keep this in sync with reality now that real files exist — but only
    // for the customer's own photos, so it keeps its original, narrower
    // meaning rather than conflating it with the collector's verification
    // shots. See the field comment in models/Pickup.js.
    if (uploadedBy === "customer") {
      pickup.imageCount = pickup.images.filter((img) => img.uploadedBy === "customer").length;
    }

    try {
      await pickup.save();
    } catch (saveError) {
      // Cloudinary succeeded but MongoDB didn't — roll back the upload so
      // the two systems don't end up disagreeing about what this pickup has.
      await Promise.all(uploaded.map((img) => deleteImage(img.publicId)));
      throw saveError;
    }

    return res.status(201).json({
      success: true,
      message: "Images uploaded",
      data: {
        imageUrls: pickup.images.map((img) => img.url),
        pickup: serializePickup(pickup),
      },
    });
  } catch (error) {
    console.error("Upload pickup images error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while uploading images.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * GET /api/pickups
 * Role: any. Filtered by role context — this single endpoint serves both the
 * household/organization's "my pickups" list and the collector's "my jobs"
 * list (API_SPEC.md §3.3: "filtered by user/collector context").
 */
const listPickups = async (req, res) => {
  try {
    let query;
    let sort;

    if (req.user.role === "collector") {
      // Available to accept, or already assigned to this collector.
      query = { $or: [{ status: "pending", collectorId: null }, { collectorId: req.user._id }] };
      sort = { pickupDate: 1 };
    } else if (req.user.role === "household" || req.user.role === "organization") {
      query = { userId: req.user._id };
      sort = { createdAt: -1 };
    } else {
      // Admin pickup management is a separate, not-yet-built module — return
      // an empty list rather than every user's data.
      return res.status(200).json({ success: true, message: "Pickups retrieved", data: [] });
    }

    const pickups = await populate(Pickup.find(query).sort(sort));

    return res.status(200).json({
      success: true,
      message: "Pickups retrieved",
      data: pickups.map(serializePickup),
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

/**
 * GET /api/pickups/:id
 * Role: any, but only the owner, the assigned collector, or an admin may
 * view it. Everyone else gets a 404 — indistinguishable from a pickup that
 * doesn't exist, so an ID alone can never confirm another user's pickup exists.
 */
const getPickupById = async (req, res) => {
  try {
    const pickup = await populate(Pickup.findById(req.params.id));

    if (!pickup) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    const allowed =
      req.user.role === "admin" ||
      isOwner(pickup, req.user._id) ||
      isAssignedCollector(pickup, req.user._id) ||
      (req.user.role === "collector" && isOpenRequest(pickup));

    if (!allowed) {
      return res.status(404).json({
        success: false,
        message: "Pickup not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pickup retrieved",
      data: serializePickup(pickup),
    });
  } catch (error) {
    console.error("Get pickup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while loading this pickup.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PUT /api/pickups/:id/cancel
 * Role: household, organization, collector — but only the owner or the
 * assigned collector, checked server-side.
 */
const cancelPickup = async (req, res) => {
  try {
    const pickup = await populate(Pickup.findById(req.params.id));
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }

    const owner = isOwner(pickup, req.user._id);
    const collector = isAssignedCollector(pickup, req.user._id);
    if (req.user.role !== "admin" && !owner && !collector) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }

    if (pickup.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "A completed pickup can no longer be cancelled.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    if (pickup.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "This pickup is already cancelled.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const reason = (req.body.reason || "").trim() || "Cancelled by user";
    const cancelledBy = req.user.role;

    pickup.cancellation = { reason, cancelledBy, cancelledAt: new Date() };
    pickup.status = "cancelled";
    pickup.statusHistory.push({ status: "cancelled", at: new Date(), note: reason, changedBy: req.user._id });
    await pickup.save();

    // Notify whichever party didn't trigger the cancellation.
    if (collector && pickup.userId) {
      await notify({
        userId: pickup.userId._id,
        type: "pickup",
        title: "Pickup cancelled",
        description: `Your collector cancelled: ${reason}`,
        relatedPickup: pickup._id,
      });
    } else if (owner && pickup.collectorId) {
      await notify({
        userId: pickup.collectorId._id,
        type: "pickup",
        title: "Job cancelled",
        description: `The customer cancelled this pickup: ${reason}`,
        relatedPickup: pickup._id,
      });
    }

    return res.status(200).json({ success: true, message: "Pickup cancelled", data: serializePickup(pickup) });
  } catch (error) {
    console.error("Cancel pickup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while cancelling this pickup.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PUT /api/pickups/:id/accept
 * Role: collector. Fails if another collector already accepted it —
 * `status: "pending"` in the filter makes this an atomic "first collector
 * wins" guard rather than a read-then-write race.
 */
const acceptJob = async (req, res) => {
  try {
    const pickup = await Pickup.findOneAndUpdate(
      { _id: req.params.id, status: "pending", collectorId: null },
      {
        $set: { collectorId: req.user._id, status: "collector_assigned" },
        $push: {
          statusHistory: {
            status: "collector_assigned",
            at: new Date(),
            note: `${req.user.name} accepted the job`,
            changedBy: req.user._id,
          },
        },
      },
      { new: true }
    );

    if (!pickup) {
      const exists = await Pickup.exists({ _id: req.params.id });
      return res.status(exists ? 409 : 404).json({
        success: false,
        message: exists
          ? "This job has already been accepted by another collector."
          : "Pickup not found.",
        error: { code: exists ? "CONFLICT" : "NOT_FOUND" },
      });
    }

    await pickup.populate([
      { path: "userId", select: POPULATE_FIELDS.user },
      { path: "collectorId", select: POPULATE_FIELDS.collector },
    ]);

    await notify({
      userId: pickup.userId._id,
      type: "pickup",
      title: "Collector assigned",
      description: `${req.user.name} will handle your pickup.`,
      relatedPickup: pickup._id,
    });

    return res.status(200).json({ success: true, message: "Job accepted", data: serializePickup(pickup) });
  } catch (error) {
    console.error("Accept job error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while accepting this job.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** Legal forward transitions a collector can make via updateJobStatus. */
const STATUS_TRANSITIONS = {
  collector_assigned: "on_the_way",
  on_the_way: "in_progress",
};

/**
 * PUT /api/pickups/:id/status
 * Role: collector, and only the assigned one. Body: { status }.
 */
const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["on_the_way", "in_progress"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'on_the_way' or 'in_progress'.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const pickup = await populate(Pickup.findById(req.params.id));
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }
    if (!isAssignedCollector(pickup, req.user._id)) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }
    if (STATUS_TRANSITIONS[pickup.status] !== status) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from '${pickup.status}' to '${status}'.`,
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const note = status === "on_the_way" ? "Collector started navigation" : "Verifying scrap on site";
    pickup.status = status;
    pickup.statusHistory.push({ status, at: new Date(), note, changedBy: req.user._id });
    await pickup.save();

    if (status === "on_the_way") {
      await notify({
        userId: pickup.userId._id,
        type: "pickup",
        title: "Collector on the way",
        description: `${req.user.name} is heading to your address.`,
        relatedPickup: pickup._id,
      });
    }

    return res.status(200).json({ success: true, message: "Status updated", data: serializePickup(pickup) });
  } catch (error) {
    console.error("Update job status error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating this job.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * PUT /api/pickups/:id/verify
 * Role: collector, and only the assigned one.
 *
 * BUSINESS RULE: the collector's submitted categories are the entire source
 * of truth for the amount. calculatePickupTotal looks up CURRENT rates from
 * the database — a client-supplied rate/amount is never read from req.body.
 */
const verifyPickup = async (req, res) => {
  try {
    const { verifiedCategories } = req.body;
    if (!Array.isArray(verifiedCategories) || verifiedCategories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Record at least one category with a weight greater than zero.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const pickup = await populate(Pickup.findById(req.params.id));
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }
    if (!isAssignedCollector(pickup, req.user._id)) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }
    if (pickup.status !== "in_progress" && pickup.status !== "on_the_way") {
      return res.status(400).json({
        success: false,
        message: "This pickup must be started before it can be completed.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const { lines, totalAmount } = await calculatePickupTotal(verifiedCategories);
    if (lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Record at least one category with a weight greater than zero.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const totalWeightKg = lines.reduce((sum, l) => sum + l.weightKg, 0);
    const { contributionScore, ecoPoints } = scoreForCompletedPickup(totalWeightKg);

    pickup.verifiedCategories = lines;
    pickup.totalAmount = totalAmount;
    pickup.paymentStatus = pickup.isDonation ? "donated" : "paid";
    pickup.status = "completed";
    pickup.completedAt = new Date();
    pickup.contributionScore = contributionScore;
    pickup.ecoPointsEarned = ecoPoints;
    pickup.statusHistory.push({
      status: "completed",
      at: new Date(),
      note: "Scrap verified and payment settled",
      changedBy: req.user._id,
    });
    await pickup.save();

    // Customer's cumulative stats + Eco Points.
    await User.findByIdAndUpdate(pickup.userId._id, {
      $inc: { totalPickups: 1, totalWeightRecycled: totalWeightKg, ecoPoints },
    });
    // Collector's cumulative stats + payout.
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalPickups: 1, totalWeightRecycled: totalWeightKg, totalEarnings: totalAmount },
    });

    await notify({
      userId: pickup.userId._id,
      type: "pickup",
      title: "Pickup completed",
      description: `${totalWeightKg.toFixed(1)} kg collected. ₹${totalAmount.toFixed(0)} ${pickup.isDonation ? "donated" : "paid"}.`,
      relatedPickup: pickup._id,
    });
    await notify({
      userId: pickup.userId._id,
      type: "points",
      title: `You earned ${ecoPoints} Eco Points`,
      description: "Points credited for your completed pickup.",
      relatedPickup: pickup._id,
    });

    return res.status(200).json({
      success: true,
      message: "Pickup completed successfully",
      data: serializePickup(pickup),
    });
  } catch (error) {
    if (error.code === "VALIDATION_ERROR") {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        error: { code: error.code },
      });
    }
    console.error("Verify pickup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while completing this pickup.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/**
 * POST /api/pickups/:id/rate
 * Role: household, organization — only the owner, only after completion.
 */
const ratePickup = async (req, res) => {
  try {
    const { stars, review } = req.body;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        message: "stars must be an integer from 1 to 5.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    const pickup = await populate(Pickup.findById(req.params.id));
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }
    if (!isOwner(pickup, req.user._id)) {
      return res.status(404).json({ success: false, message: "Pickup not found.", error: { code: "NOT_FOUND" } });
    }
    if (pickup.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Only a completed pickup can be rated.",
        error: { code: "VALIDATION_ERROR" },
      });
    }

    pickup.rating = { stars, review: review?.trim() || null, ratedAt: new Date() };
    await pickup.save();

    return res.status(200).json({ success: true, message: "Rating submitted", data: serializePickup(pickup) });
  } catch (error) {
    console.error("Rate pickup error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while submitting your rating.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = {
  createPickup,
  uploadPickupImages,
  listPickups,
  getPickupById,
  cancelPickup,
  acceptJob,
  updateJobStatus,
  verifyPickup,
  ratePickup,
};

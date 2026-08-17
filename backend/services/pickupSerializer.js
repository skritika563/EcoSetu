/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Pickup Serializer
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Shapes a populated Pickup document into EXACTLY the object shape the
 * already-built frontend expects (frontend/src/data/pickupData.js's record
 * shape) — `id` not `_id`, denormalized `customer`/`collector` objects,
 * `estimatedWeightKg` not `estimatedWeight`, empty sub-objects collapsed to
 * `null`. Keeping this translation in one place means the DB schema can stay
 * normalized (refs, not embedded copies) while the frontend needs zero
 * component changes — only its service layer swaps from mock to this API.
 *
 * Callers MUST populate `userId` and `collectorId` before serializing (see
 * pickupController's POPULATE_FIELDS), or `customer`/`collector` come back
 * null even when a party is set.
 */

const serializeCollector = (collector) => {
  if (!collector || !collector._id) return null;
  return {
    id: collector._id.toString(),
    name: collector.name,
    rating: collector.collectorProfile?.rating ?? 4.5,
    totalPickups: collector.totalPickups ?? 0,
    verified: collector.isVerified ?? false,
    vehicle: collector.collectorProfile?.vehicle ?? null,
  };
};

const serializeCustomer = (user) => {
  if (!user || !user._id) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone ?? null,
    type: user.role,
  };
};

const serializePickup = (pickupDoc) => {
  const p = typeof pickupDoc.toObject === "function" ? pickupDoc.toObject() : pickupDoc;

  const hasRating = p.rating && p.rating.stars != null;
  const hasCancellation = p.cancellation && p.cancellation.reason != null;

  return {
    id: p._id.toString(),
    ownerRole: p.userId?.role ?? null,
    pickupType: p.pickupType,
    status: p.status,
    pickupDate: p.pickupDate,
    pickupTimeSlot: p.pickupTimeSlot,
    estimatedCategories: p.estimatedCategories ?? [],
    itemCount: p.itemCount ?? null,
    estimatedWeightKg: p.estimatedWeight ?? null,
    classificationSource: p.classificationSource,
    aiPrediction: p.aiPrediction ?? null,
    imageCount: p.imageCount ?? 0,
    images: (p.images ?? []).map((img) => ({ url: img.url, publicId: img.publicId, uploadedBy: img.uploadedBy })),
    notes: p.notes ?? null,
    isDonation: !!p.isDonation,
    pickupAddress: p.pickupAddress,
    customer: serializeCustomer(p.userId),
    collector: serializeCollector(p.collectorId),
    distanceKm: null, // no geolocation yet — frontend already renders this as optional
    verifiedCategories: p.verifiedCategories ?? [],
    totalAmount: p.totalAmount ?? 0,
    paymentStatus: p.paymentStatus,
    serviceCharge: p.serviceCharge ?? 0,
    // Whether — and how — the ₹30 instant-pickup fee was actually paid.
    // Only ids/amount/timestamp; nothing Razorpay-credential-shaped ever
    // reaches here.
    instantFeePayment: p.instantFeePayment?.razorpayPaymentId
      ? {
          razorpayOrderId: p.instantFeePayment.razorpayOrderId,
          razorpayPaymentId: p.instantFeePayment.razorpayPaymentId,
          amount: p.instantFeePayment.amount,
          paidAt: p.instantFeePayment.paidAt,
        }
      : null,
    statusHistory: (p.statusHistory ?? []).map((h) => ({ status: h.status, at: h.at, note: h.note })),
    rating: hasRating ? { stars: p.rating.stars, review: p.rating.review, ratedAt: p.rating.ratedAt } : null,
    cancellation: hasCancellation
      ? { reason: p.cancellation.reason, cancelledBy: p.cancellation.cancelledBy, cancelledAt: p.cancellation.cancelledAt }
      : null,
    createdAt: p.createdAt,
  };
};

/** Fields populated on userId/collectorId — kept in one place so every query stays consistent. */
const POPULATE_FIELDS = {
  user: "name phone role",
  collector: "name totalPickups isVerified collectorProfile",
};

module.exports = { serializePickup, POPULATE_FIELDS };

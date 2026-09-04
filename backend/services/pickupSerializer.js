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
 *
 * `pickupAddress.city` is stored lowercase (utils/textNormalize.js's
 * normalizeCity, wired into the schema) — title-cased here for display,
 * same as marketplaceSerializer does for Product/MarketplaceOrder.
 */

const { toTitleCase } = require("../utils/textNormalize");

/**
 * Great-circle distance in km between two {lat, lng} points (haversine).
 * Used only for the customer-facing "X km away" figure — never for pricing
 * or anything money touches.
 */
const EARTH_RADIUS_KM = 6371;
const haversineKm = (a, b) => {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

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

  // Real distance once both ends have coordinates — the destination's come
  // from pickupAddress.coordinates (set via geocoding, see
  // locationService.js), the collector's from their last location push
  // (see pickupController.updateCollectorLocation). Falls back to null
  // exactly like before this existed, so CollectorInfoPanel's ETA math
  // (which already tolerates a null distanceKm) needs no changes.
  const destination = p.pickupAddress?.coordinates;
  const collectorPoint = p.collectorLocation;
  const distanceKm =
    destination?.lat != null && destination?.lng != null && collectorPoint?.lat != null && collectorPoint?.lng != null
      ? Math.round(haversineKm(destination, collectorPoint) * 10) / 10
      : null;

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
    // `coordinates` is a nested (not sub-schema) path — Mongoose fills its
    // lat/lng in from their own field defaults independently, so an address
    // that never had a pin set comes back as {lat: null, lng: null}, NOT a
    // clean `null`. Collapsed here the same way collectorLocation is below:
    // every consumer (MapView, CollectorNavigationPanel, the directions
    // proxy) checks `pickupAddress.coordinates` with a plain truthy test,
    // and a `{lat: null, lng: null}` object passes that test — which is
    // exactly what fed literal nulls into Leaflet and the LocationIQ
    // directions call.
    pickupAddress: p.pickupAddress
      ? {
          ...p.pickupAddress,
          city: toTitleCase(p.pickupAddress.city),
          coordinates: destination?.lat != null && destination?.lng != null ? destination : null,
        }
      : p.pickupAddress,
    customer: serializeCustomer(p.userId),
    collector: serializeCollector(p.collectorId),
    distanceKm,
    // The collector's last-reported position while "on_the_way" — null once
    // the job moves past that (see updateJobStatus's reset) or before any
    // update has ever been pushed. Read by the customer's Pickup Details
    // page to render a live marker on MapView.
    collectorLocation:
      p.collectorLocation?.lat != null && p.collectorLocation?.lng != null
        ? { lat: p.collectorLocation.lat, lng: p.collectorLocation.lng, updatedAt: p.collectorLocation.updatedAt }
        : null,
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

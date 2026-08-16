/**
 * Pickup service — the seam between the Pickups module and its data.
 *
 * Holds an in-memory mutable store seeded from data/pickupData.js, so accept
 * → start → verify → complete reads as a real state machine within a session
 * (mirrors how useNotifications' local read/unread state works — it resets on
 * reload, which is expected for a mock).
 *
 * When the backend lands, every function below becomes an Axios call against
 * the routes already documented in API_SPEC.md §3.3 (noted per function) and
 * no component changes — callers only see { data, loading, error }.
 */

import { PICKUPS, SAVED_ADDRESSES } from "@/data/pickupData";
import { calculatePickupTotal, getServiceCharge } from "@/services/pricingService";

const LATENCY_MS = 450;
const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deep clone so the seed data in data/pickupData.js is never mutated directly. */
let store = JSON.parse(JSON.stringify(PICKUPS));

const nextId = (prefix) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

const pushHistory = (record, status, note) => {
  record.status = status;
  record.statusHistory.push({ status, at: new Date().toISOString(), note });
};

const findOrThrow = (id) => {
  const record = store.find((p) => p.id === id);
  if (!record) throw new Error(`Pickup ${id} was not found.`);
  return record;
};

/* ─── Reads ──────────────────────────────────────────────────────────────── */

/**
 * Pickups owned by a household/organization user.
 * → GET /api/pickups (filtered by user context)
 */
export const getPickupsForRole = async (role, { empty = false } = {}) => {
  await delay();
  if (empty) return [];
  return store.filter((p) => p.ownerRole === role).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Jobs visible to a collector: unassigned pending requests (available to
 * accept) plus anything already assigned to "you" in this mock session.
 * → GET /api/pickups/nearby (available) + GET /api/pickups (assigned)
 */
export const getJobsForCollector = async ({ empty = false } = {}) => {
  await delay();
  if (empty) return [];
  return store
    .filter((p) => p.status === "pending" || p.collector)
    .sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate));
};

/** → GET /api/pickups/:id */
export const getPickupById = async (id) => {
  await delay(300);
  const record = store.find((p) => p.id === id);
  if (!record) throw new Error(`Pickup ${id} was not found.`);
  return structuredClone(record);
};

export const getAddressesForRole = (role) => SAVED_ADDRESSES[role] ?? SAVED_ADDRESSES.household;

/* ─── Household / organization actions ──────────────────────────────────── */

/**
 * Book a new pickup. `categories` and `estimatedWeightKg` are optional —
 * the household/organization is never forced to classify their scrap.
 * → POST /api/pickups
 */
export const createPickup = async ({
  ownerRole,
  customer,
  pickupType = "scheduled",
  pickupAddress,
  pickupDate,
  pickupTimeSlot,
  estimatedCategories = [],
  itemCount = null,
  estimatedWeightKg = null,
  classificationSource = "skipped",
  aiPrediction = null,
  imageCount = 0,
  notes = null,
  isDonation = false,
}) => {
  await delay(600);

  const record = {
    id: nextId("PKP"),
    ownerRole,
    pickupType,
    status: "pending",
    pickupDate,
    pickupTimeSlot,
    estimatedCategories,
    itemCount,
    estimatedWeightKg,
    classificationSource,
    aiPrediction,
    imageCount,
    notes,
    isDonation,
    pickupAddress,
    customer,
    collector: null,
    distanceKm: null,
    verifiedCategories: [],
    totalAmount: 0,
    paymentStatus: "pending",
    serviceCharge: getServiceCharge(pickupType),
    statusHistory: [
      {
        status: "pending",
        at: new Date().toISOString(),
        note: pickupType === "instant" ? "Instant pickup requested" : "Pickup requested",
      },
    ],
    rating: null,
    cancellation: null,
    createdAt: new Date().toISOString(),
  };

  store = [record, ...store];
  return structuredClone(record);
};

/** → PUT /api/pickups/:id/cancel */
export const cancelPickup = async (id, { reason, cancelledBy }) => {
  await delay();
  const record = findOrThrow(id);

  if (record.status === "completed") {
    throw new Error("A completed pickup can no longer be cancelled.");
  }

  record.cancellation = { reason, cancelledBy, cancelledAt: new Date().toISOString() };
  pushHistory(record, "cancelled", reason || "Pickup cancelled");
  return structuredClone(record);
};

/** → POST /api/reviews (pickup-scoped) */
export const rateCollector = async (id, { stars, review }) => {
  await delay();
  const record = findOrThrow(id);
  record.rating = { stars, review: review || null, ratedAt: new Date().toISOString() };
  return structuredClone(record);
};

/* ─── Collector actions ──────────────────────────────────────────────────── */

/** → PUT /api/pickups/:id/accept */
export const acceptJob = async (id, collectorInfo) => {
  await delay();
  const record = findOrThrow(id);

  if (record.status !== "pending") {
    throw new Error("This job has already been accepted by another collector.");
  }

  record.collector = collectorInfo;
  pushHistory(record, "collector_assigned", `${collectorInfo?.name ?? "You"} accepted the job`);
  return structuredClone(record);
};

/**
 * Move a job forward: collector_assigned → on_the_way → in_progress.
 * → PUT /api/pickups/:id/status
 */
export const updateJobStatus = async (id, status, note) => {
  await delay(300);
  const record = findOrThrow(id);
  pushHistory(record, status, note);
  return structuredClone(record);
};

/** → PUT /api/pickups/:id/cancel (collector-initiated) */
export const reportJobIssue = async (id, reason) => cancelPickup(id, { reason, cancelledBy: "collector" });

/**
 * Collector's final, authoritative classification. The collector must record
 * EVERY category actually present — never just confirm the customer's
 * estimate — and the amount is always Σ(actual category × actual weight ×
 * current rate), never the customer's estimated weight.
 * → PUT /api/pickups/:id/verify
 */
export const verifyAndCompletePickup = async (id, verifiedCategories) => {
  await delay(600);
  const record = findOrThrow(id);

  const { lines, totalAmount } = calculatePickupTotal(verifiedCategories);
  if (lines.length === 0) {
    throw new Error("Record at least one category with a weight greater than zero.");
  }

  record.verifiedCategories = lines;
  record.totalAmount = totalAmount;
  record.paymentStatus = record.isDonation ? "donated" : "paid";
  pushHistory(record, "completed", "Scrap verified and payment settled");

  return structuredClone(record);
};

export default {
  getPickupsForRole,
  getJobsForCollector,
  getPickupById,
  getAddressesForRole,
  createPickup,
  cancelPickup,
  rateCollector,
  acceptJob,
  updateJobStatus,
  reportJobIssue,
  verifyAndCompletePickup,
};

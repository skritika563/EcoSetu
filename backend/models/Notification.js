const mongoose = require("mongoose");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Notification Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Persistent, per-user, database-backed notifications — replaces the frontend
 * mock feed (data/notificationData.js) that reset on every reload.
 *
 * `type` matches the string keys the frontend's NotificationBell already maps
 * to icons (pickup, points, marketplace, campaign), so no frontend component
 * changes are needed beyond swapping the data source.
 */

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["pickup", "points", "marketplace", "campaign"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    read: { type: Boolean, default: false },
    // Optional link to the record this notification is about (e.g. a Pickup),
    // so a future "tap to open" affordance doesn't need a schema change.
    relatedPickup: { type: mongoose.Schema.Types.ObjectId, ref: "Pickup", default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

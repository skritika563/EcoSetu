const Notification = require("../models/Notification");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Notification Service — internal helper for other controllers
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Not a controller itself — pickupController calls `notify()` at each
 * lifecycle transition (assigned, on the way, completed…) so notifications
 * are a side effect of the real event, not a separate thing the frontend has
 * to remember to trigger.
 *
 * Fire-and-forget by design: a notification failing to save should never fail
 * the pickup action that triggered it, so callers don't need to await this in
 * their own try/catch — errors are logged here and swallowed.
 */
const notify = async ({ userId, type, title, description, relatedPickup = null }) => {
  try {
    await Notification.create({ userId, type, title, description, relatedPickup });
  } catch (error) {
    console.error("Failed to create notification:", error.message);
  }
};

module.exports = { notify };

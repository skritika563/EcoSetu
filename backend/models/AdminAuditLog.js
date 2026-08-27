const mongoose = require("mongoose");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * AdminAuditLog Model
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Lightweight, append-only audit trail for administrative actions. Every
 * mutating admin operation (user suspension, rate change, listing deactivation,
 * etc.) creates one of these so the platform has accountability and debugging
 * breadcrumbs.
 *
 * Deliberately append-only: there is no update or delete endpoint — once an
 * action is logged, the record stays.
 */

const ADMIN_ACTIONS = [
  "user_role_changed",
  "user_activated",
  "user_deactivated",
  "user_deleted",
  "scrap_rate_updated",
  "product_deactivated",
  "product_restored",
  "campaign_cancelled",
  "notification_sent",
  "pickup_cancelled",
];

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ADMIN_ACTIONS,
      required: true,
    },
    targetType: {
      type: String,
      enum: ["user", "pickup", "product", "campaign", "scrap_rate", "notification"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    /** Free-form metadata — e.g. { previousRole, newRole } or { previousRate, newRate }. */
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1 });

adminAuditLogSchema.statics.ACTIONS = ADMIN_ACTIONS;

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);

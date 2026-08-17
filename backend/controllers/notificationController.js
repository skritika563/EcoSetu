const Notification = require("../models/Notification");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Notification Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Backs NotificationBell.jsx. Notifications themselves are created as a side
 * effect of pickup lifecycle events (see services/notificationService.js,
 * called from pickupController) — this controller only reads and marks-read.
 * Every query is scoped to req.user._id, so one user can never see or mark
 * another's notifications.
 */

const serializeNotification = (n) => ({
  id: n._id.toString(),
  type: n.type,
  title: n.title,
  description: n.description,
  read: n.read,
  createdAt: n.createdAt,
});

/** GET /api/notifications — most recent 50. */
const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved",
      data: notifications.map(serializeNotification),
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

/** GET /api/notifications/unread-count */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, read: false });
    return res.status(200).json({ success: true, message: "Unread count retrieved", data: { count } });
  } catch (error) {
    console.error("Unread count error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while counting notifications.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** PATCH /api/notifications/:id/read */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
        error: { code: "NOT_FOUND" },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: serializeNotification(notification),
    });
  } catch (error) {
    console.error("Mark notification read error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating this notification.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

/** POST /api/notifications/read-all */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    return res.status(200).json({ success: true, message: "All notifications marked as read", data: null });
  } catch (error) {
    console.error("Mark all read error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating notifications.",
      error: { code: "INTERNAL_ERROR" },
    });
  }
};

module.exports = { listNotifications, getUnreadCount, markAsRead, markAllAsRead };

const mongoose = require("mongoose");

/**
 * Conversation — a 1:1 direct-message thread between two users.
 *
 * Scoped to Marketplace (buyer↔seller) and Campaigns (participant↔organizer)
 * only — see Message.js's header comment and the frontend's ChatInboxPage
 * for the full picture. Pickups deliberately has no chat surface (the
 * collector's phone number is already shown once assigned).
 *
 * ONE CONVERSATION PER PAIR OF PEOPLE, not per pair-per-product/campaign —
 * `participantsKey` (below) is what enforces that. Two people who first
 * message about a product and later about a campaign keep talking in the
 * same thread; `contextType`/`contextId` just remember what the chat was
 * originally *about*, for a "regarding: <product/campaign>" hint in the UI.
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 2,
        message: "A conversation must have exactly two participants.",
      },
    },

    // Canonical "<lowerId>_<higherId>" string (sorted so participant order
    // never matters), unique-indexed below. This is what makes
    // "find or create the conversation between these two people" a single
    // indexed findOne() instead of an $all/$size query on the array, and is
    // what stops two "Message seller" clicks from ever creating duplicates.
    participantsKey: {
      type: String,
      required: true,
      unique: true,
    },

    contextType: {
      type: String,
      enum: ["marketplace_product", "campaign"],
      required: true,
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      // Not a `ref` to one fixed model — contextType decides whether this
      // points at a Product or a Campaign doc. Resolved manually wherever
      // the context needs to be displayed (see messageController's
      // populateContext helper), the same way Pickup.js's `relatedCampaign`
      // pattern is resolved elsewhere in this codebase.
    },

    // Denormalized snapshot of the newest message, so the conversation list
    // (both users' inboxes) renders from one Conversation query with no
    // per-row Message lookup.
    lastMessage: {
      body: { type: String, default: "" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },

    // Per-participant unread counter — keyed by userId string. Lets the
    // navbar/header badge read one field on this user's conversations
    // instead of aggregating over every Message on every page load.
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Every conversation list ("all my conversations, newest first") filters by
// participants and sorts by lastMessageAt — this compound index covers both
// in one pass.
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

/** Canonical sort-independent key for a pair of user ids. */
conversationSchema.statics.buildParticipantsKey = (userIdA, userIdB) =>
  [userIdA.toString(), userIdB.toString()].sort().join("_");

module.exports = mongoose.model("Conversation", conversationSchema);

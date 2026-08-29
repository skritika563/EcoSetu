const mongoose = require("mongoose");

/**
 * Message — one message inside a Conversation.
 *
 * `readAt` is a single timestamp, not a `readBy` array — every Conversation
 * here is strictly 1:1 (see Conversation.js), so "has the OTHER participant
 * read this" only ever has one answer to track.
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "A message can be at most 2000 characters."],
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Every read is "messages in conversation X, oldest first, page N" — this
// compound index covers pagination without a sort-in-memory.
messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);

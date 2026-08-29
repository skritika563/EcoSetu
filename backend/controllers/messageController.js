const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Product = require("../models/Product");
const Campaign = require("../models/Campaign");
const User = require("../models/User");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Message Controller — 1:1 direct messaging, Marketplace + Campaigns only
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Follows the same conventions as wishlistController/productController:
 *   - ownership is always re-checked server-side against req.user._id
 *   - a conversation a stranger isn't part of returns 404, not 403
 *   - nothing about identity is ever read from the request body
 *
 * See models/Conversation.js and Message.js for the schema rationale.
 */

const CONTEXT_MODELS = { marketplace_product: Product, campaign: Campaign };
const USER_SUMMARY_FIELDS = "name role profileImage";

/** True if `userId` is one of this conversation's two participants. */
const isParticipant = (conversation, userId) =>
  conversation.participants.some((p) => p.toString() === userId.toString());

/**
 * Batched context-title lookup for a list of conversations — one query per
 * context type (not one per conversation) so a 50-row inbox costs 2 extra
 * queries, not 50.
 */
const resolveContextTitles = async (conversations) => {
  const productIds = conversations.filter((c) => c.contextType === "marketplace_product").map((c) => c.contextId);
  const campaignIds = conversations.filter((c) => c.contextType === "campaign").map((c) => c.contextId);

  const [products, campaigns] = await Promise.all([
    productIds.length ? Product.find({ _id: { $in: productIds } }).select("title").lean() : [],
    campaignIds.length ? Campaign.find({ _id: { $in: campaignIds } }).select("name").lean() : [],
  ]);

  const titleById = new Map();
  for (const p of products) titleById.set(p._id.toString(), p.title);
  for (const c of campaigns) titleById.set(c._id.toString(), c.name);
  return titleById;
};

const serializeConversation = (conversation, currentUserId, otherUser, contextTitle) => ({
  id: conversation._id.toString(),
  otherUser: otherUser
    ? {
        id: otherUser._id.toString(),
        name: otherUser.name,
        role: otherUser.role,
        profileImage: otherUser.profileImage,
      }
    : null,
  contextType: conversation.contextType,
  contextId: conversation.contextId?.toString(),
  contextTitle: contextTitle ?? null,
  lastMessage: conversation.lastMessage?.body
    ? {
        body: conversation.lastMessage.body,
        senderId: conversation.lastMessage.senderId?.toString(),
        createdAt: conversation.lastMessage.createdAt,
      }
    : null,
  lastMessageAt: conversation.lastMessageAt,
  unreadCount: conversation.unreadCounts?.get?.(currentUserId.toString()) ?? 0,
});

const serializeMessage = (message) => ({
  id: message._id.toString(),
  conversationId: message.conversationId.toString(),
  senderId: message.senderId.toString(),
  body: message.body,
  readAt: message.readAt,
  createdAt: message.createdAt,
});

/**
 * POST /api/messages/conversations
 * body: { recipientId, contextType, contextId }
 *
 * Finds the existing conversation between these two people if one exists
 * (regardless of what it was originally about), otherwise creates one.
 */
const getOrCreateConversation = async (req, res) => {
  try {
    const { recipientId, contextType, contextId } = req.body;

    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ success: false, message: "A valid recipientId is required.", error: { code: "VALIDATION_ERROR" } });
    }
    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't message yourself.", error: { code: "VALIDATION_ERROR" } });
    }
    if (!CONTEXT_MODELS[contextType]) {
      return res.status(400).json({ success: false, message: "contextType must be marketplace_product or campaign.", error: { code: "VALIDATION_ERROR" } });
    }
    if (!mongoose.isValidObjectId(contextId)) {
      return res.status(400).json({ success: false, message: "A valid contextId is required.", error: { code: "VALIDATION_ERROR" } });
    }

    const [recipient, contextDoc] = await Promise.all([
      User.findById(recipientId).select(USER_SUMMARY_FIELDS).lean(),
      CONTEXT_MODELS[contextType].findById(contextId).select("_id"),
    ]);
    if (!recipient) {
      return res.status(404).json({ success: false, message: "That user could not be found.", error: { code: "NOT_FOUND" } });
    }
    if (!contextDoc) {
      return res.status(404).json({ success: false, message: "That listing/campaign could not be found.", error: { code: "NOT_FOUND" } });
    }

    const participantsKey = Conversation.buildParticipantsKey(req.user._id, recipientId);

    // Upsert on the unique participantsKey index — race-safe (two
    // simultaneous "Message seller" clicks can't create two conversations),
    // and existing conversations keep their original contextType/contextId
    // (only $setOnInsert applies those) rather than being overwritten by
    // whatever the caller re-opened the chat about this time.
    const conversation = await Conversation.findOneAndUpdate(
      { participantsKey },
      {
        $setOnInsert: {
          participants: [req.user._id, recipientId],
          participantsKey,
          contextType,
          contextId,
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    const titleById = await resolveContextTitles([conversation]);
    return res.status(200).json({
      success: true,
      message: "Conversation ready",
      data: serializeConversation(
        conversation,
        req.user._id,
        recipient,
        titleById.get(conversation.contextId.toString())
      ),
    });
  } catch (error) {
    console.error("Get or create conversation error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error while starting the conversation.", error: { code: "INTERNAL_ERROR" } });
  }
};

/** GET /api/messages/conversations?contextType=marketplace_product|campaign */
const listConversations = async (req, res) => {
  try {
    const { contextType } = req.query;
    const filter = { participants: req.user._id };
    if (contextType) {
      if (!CONTEXT_MODELS[contextType]) {
        return res.status(400).json({ success: false, message: "Invalid contextType filter.", error: { code: "VALIDATION_ERROR" } });
      }
      filter.contextType = contextType;
    }

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .populate("participants", USER_SUMMARY_FIELDS)
      .lean();

    const titleById = await resolveContextTitles(conversations);

    const data = conversations.map((c) => {
      const otherUser = c.participants.find((p) => p._id.toString() !== req.user._id.toString());
      // `.lean()` returns unreadCounts as a plain object, not a Map — read
      // both shapes so serializeConversation works regardless.
      const unreadCount = c.unreadCounts?.get
        ? c.unreadCounts.get(req.user._id.toString()) ?? 0
        : c.unreadCounts?.[req.user._id.toString()] ?? 0;
      return {
        ...serializeConversation(c, req.user._id, otherUser, titleById.get(c.contextId.toString())),
        unreadCount,
      };
    });

    return res.status(200).json({ success: true, message: "Conversations retrieved", data });
  } catch (error) {
    console.error("List conversations error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error while loading conversations.", error: { code: "INTERNAL_ERROR" } });
  }
};

/**
 * GET /api/messages/unread-count?contextType=marketplace_product|campaign
 *
 * Total unread across every conversation, for a header/navbar badge.
 * `contextType` is optional — omitted, this is the grand total across both
 * sections; passed, it's scoped to just that section's badge (Marketplace's
 * Messages icon shouldn't light up for an unread Campaigns chat).
 */
const getUnreadCount = async (req, res) => {
  try {
    const { contextType } = req.query;
    const filter = { participants: req.user._id };
    if (contextType) {
      if (!CONTEXT_MODELS[contextType]) {
        return res.status(400).json({ success: false, message: "Invalid contextType filter.", error: { code: "VALIDATION_ERROR" } });
      }
      filter.contextType = contextType;
    }

    const conversations = await Conversation.find(filter).select("unreadCounts").lean();
    const total = conversations.reduce((sum, c) => sum + (c.unreadCounts?.[req.user._id.toString()] ?? 0), 0);
    return res.status(200).json({ success: true, message: "Unread count retrieved", data: { unreadCount: total } });
  } catch (error) {
    console.error("Get unread count error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error while loading unread count.", error: { code: "INTERNAL_ERROR" } });
  }
};

/** GET /api/messages/conversations/:id/messages?before=<ISO date>&limit=30 */
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Conversation not found.", error: { code: "NOT_FOUND" } });
    }

    const conversation = await Conversation.findById(id).select("participants");
    if (!conversation || !isParticipant(conversation, req.user._id)) {
      return res.status(404).json({ success: false, message: "Conversation not found.", error: { code: "NOT_FOUND" } });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const filter = { conversationId: id };
    if (req.query.before) filter.createdAt = { $lt: new Date(req.query.before) };

    // Newest-first for the "give me the most recent page" query, then
    // reversed back to chronological order for rendering.
    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    messages.reverse();

    return res.status(200).json({
      success: true,
      message: "Messages retrieved",
      data: { messages: messages.map(serializeMessage), hasMore: messages.length === limit },
    });
  } catch (error) {
    console.error("Get messages error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error while loading messages.", error: { code: "INTERNAL_ERROR" } });
  }
};

/** POST /api/messages/conversations/:id/messages   body: { body } */
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Conversation not found.", error: { code: "NOT_FOUND" } });
    }
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ success: false, message: "Message can't be empty.", error: { code: "VALIDATION_ERROR" } });
    }
    if (body.length > 2000) {
      return res.status(400).json({ success: false, message: "Message is too long (max 2000 characters).", error: { code: "VALIDATION_ERROR" } });
    }

    const conversation = await Conversation.findById(id).select("participants");
    if (!conversation || !isParticipant(conversation, req.user._id)) {
      return res.status(404).json({ success: false, message: "Conversation not found.", error: { code: "NOT_FOUND" } });
    }

    const trimmedBody = body.trim();
    const otherParticipantId = conversation.participants.find((p) => p.toString() !== req.user._id.toString());

    const message = await Message.create({
      conversationId: id,
      senderId: req.user._id,
      body: trimmedBody,
    });

    await Conversation.updateOne(
      { _id: id },
      {
        $set: {
          lastMessage: { body: trimmedBody, senderId: req.user._id, createdAt: message.createdAt },
          lastMessageAt: message.createdAt,
        },
        $inc: { [`unreadCounts.${otherParticipantId}`]: 1 },
      }
    );

    return res.status(201).json({ success: true, message: "Message sent", data: serializeMessage(message) });
  } catch (error) {
    console.error("Send message error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error while sending your message.", error: { code: "INTERNAL_ERROR" } });
  }
};

/** PATCH /api/messages/conversations/:id/read */
const markConversationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "Conversation not found.", error: { code: "NOT_FOUND" } });
    }

    const conversation = await Conversation.findById(id).select("participants");
    if (!conversation || !isParticipant(conversation, req.user._id)) {
      return res.status(404).json({ success: false, message: "Conversation not found.", error: { code: "NOT_FOUND" } });
    }

    await Promise.all([
      Conversation.updateOne({ _id: id }, { $set: { [`unreadCounts.${req.user._id}`]: 0 } }),
      Message.updateMany(
        { conversationId: id, senderId: { $ne: req.user._id }, readAt: null },
        { $set: { readAt: new Date() } }
      ),
    ]);

    return res.status(200).json({ success: true, message: "Conversation marked as read", data: null });
  } catch (error) {
    console.error("Mark conversation read error:", error.message);
    return res.status(500).json({ success: false, message: "Internal server error while updating the conversation.", error: { code: "INTERNAL_ERROR" } });
  }
};

module.exports = {
  getOrCreateConversation,
  listConversations,
  getUnreadCount,
  getMessages,
  sendMessage,
  markConversationRead,
};

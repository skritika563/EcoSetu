/**
 * MarketplaceMessages — buyer ↔ seller conversations.
 *
 * NOT IMPLEMENTED, AND SAYS SO. There is no Conversation/Message model, no
 * endpoint and no persistence behind this screen yet, so it renders an
 * honest "not built" state instead of a fake inbox.
 *
 * WHY NOT MOCK IT: a messaging UI populated with invented conversations is
 * uniquely harmful — it looks identical to a working one, so a seller would
 * reasonably believe a buyer had contacted them, or that a reply they typed
 * had been sent. Every other "coming soon" surface in EcoSetu is a dead
 * button; a fake inbox would be a lie with consequences. The brief explicitly
 * ruled this out ("Do NOT create fake random messages that look like real
 * persistent conversations"), and it's the right call regardless.
 *
 * THE INTEGRATION BOUNDARY IS READY. When messaging is built, the shape is
 * already settled by how the rest of this module is designed:
 *
 *   Conversation { _id, participants: [ref User], productId: ref Product,
 *                  lastMessageAt, lastMessagePreview }
 *   Message      { _id, conversationId: ref Conversation, senderId: ref User,
 *                  body, readAt, createdAt }
 *
 *   GET    /api/marketplace/conversations
 *   GET    /api/marketplace/conversations/:id/messages
 *   POST   /api/marketplace/conversations   { productId, body }
 *   POST   /api/marketplace/conversations/:id/messages   { body }
 *   PATCH  /api/marketplace/conversations/:id/read
 *
 * Same ownership rule as everything else here: a conversation is only ever
 * readable by its own participants, checked server-side against req.user._id.
 * The "Contact seller" buttons on ProductDetailsPage and OrderDetailsPage are
 * the two call sites that will switch from notifyComingSoon() to this flow.
 */

import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";

const MarketplaceMessages = () => (
  <PageContainer className="space-y-6 py-6 sm:py-8">
    <MarketplaceHeader
      title="Messages"
      description="Conversations with buyers and sellers."
      action={<span />}
    />

    <EmptyState
      icon={MessageCircle}
      title="Messaging isn't available yet"
      description="Buyer–seller chat is still being built. In the meantime, order details include the other party's contact information once an order is placed."
      className="py-16"
    />

    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to="/marketplace/purchases">View my purchases</Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link to="/marketplace/orders">View orders received</Link>
      </Button>
    </div>
  </PageContainer>
);

export default MarketplaceMessages;

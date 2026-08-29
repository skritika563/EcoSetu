/**
 * MarketplaceMessages — buyer ↔ seller conversations.
 *
 * MarketplaceHeader (title + section tabs) stays consistent with every
 * other marketplace destination (WishlistPage, MyListingsPage, ...); the
 * actual chat UI is the shared ChatInboxPage (components/messages), scoped
 * to contextType="marketplace_product" so this inbox never mixes with
 * Campaigns' organizer↔participant chats. "Contact seller" on
 * ProductDetailsPage deep-links here with ?userId=<sellerId>&contextId=<productId>.
 */

import PageContainer from "@/components/common/PageContainer";
import MarketplaceHeader from "@/components/marketplace/MarketplaceHeader";
import ChatInboxPage from "@/components/messages/ChatInboxPage";

const MarketplaceMessages = () => (
  <PageContainer className="space-y-6 py-6 sm:py-8">
    <MarketplaceHeader
      title="Messages"
      description="Conversations with buyers and sellers."
      action={<span />}
    />
    <ChatInboxPage contextType="marketplace_product" />
  </PageContainer>
);

export default MarketplaceMessages;

/**
 * CampaignMessages — organizer ↔ participant/volunteer conversations.
 *
 * Mirrors pages/marketplace/MarketplaceMessages.jsx exactly: same shared
 * ChatInboxPage, scoped to contextType="campaign" so this inbox never mixes
 * with Marketplace's buyer↔seller chats. "Message organizer" on
 * CampaignDetailsPage and "Message" per participant on CampaignManagePage
 * deep-link here with ?userId=<theirId>&contextId=<campaignId>.
 */

import PageContainer from "@/components/common/PageContainer";
import CampaignHeader from "@/components/campaigns/CampaignHeader";
import ChatInboxPage from "@/components/messages/ChatInboxPage";

const CampaignMessages = () => (
  <PageContainer className="space-y-6 py-6 sm:py-8">
    <CampaignHeader
      title="Messages"
      description="Conversations with organizers, participants and volunteers."
    />
    <ChatInboxPage contextType="campaign" />
  </PageContainer>
);

export default CampaignMessages;

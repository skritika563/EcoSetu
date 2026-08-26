/**
 * CampaignManagePage — the organizer's management dashboard for one
 * campaign. Every section is a real management tool, not a social-media
 * page: participants/volunteers with approve/attendance actions, a
 * collection log, linked pickups, charted analytics, and the gallery.
 *
 * OWNERSHIP: the backend already scopes every management endpoint to the
 * campaign's own organizer (404, not 403, for anyone else — see
 * campaignController). This page adds one more layer purely for UX: if the
 * loaded campaign isn't owned by the viewer, it shows the same "not found"
 * state rather than a half-working dashboard, since none of the
 * owner-only calls below would succeed anyway.
 */

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";

import { useCampaign } from "@/hooks/useCampaigns";
import { getCampaignTypeLabel } from "@/config/campaigns";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewPanel from "@/components/campaigns/manage/OverviewPanel";
import ParticipantsPanel from "@/components/campaigns/manage/ParticipantsPanel";
import CollectionPanel from "@/components/campaigns/manage/CollectionPanel";
import PickupsPanel from "@/components/campaigns/manage/PickupsPanel";
import AnalyticsPanel from "@/components/campaigns/manage/AnalyticsPanel";
import GalleryPanel from "@/components/campaigns/manage/GalleryPanel";

const BackLink = () => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
    <Link to="/campaigns/mine">
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      My Campaigns
    </Link>
  </Button>
);

const MANAGE_TABS = [
  { value: "overview", label: "Overview" },
  { value: "participants", label: "Participants" },
  { value: "volunteers", label: "Volunteers" },
  { value: "collection", label: "Collection" },
  { value: "pickups", label: "Pickups" },
  { value: "analytics", label: "Analytics" },
  { value: "gallery", label: "Gallery" },
];

const CampaignManagePage = () => {
  const { campaignId } = useParams();
  const { campaign, loading, error, refetch, applyCampaign } = useCampaign(campaignId);

  if (error) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <ErrorState title="We couldn't load this campaign" description={error} onRetry={refetch} className="mt-4" />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <BackLink />
        <HeroSkeleton />
      </PageContainer>
    );
  }

  if (!campaign || !campaign.isOwner) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <EmptyState title="Campaign not found" description="It may have been removed, or it isn't yours to manage." className="mt-4" />
      </PageContainer>
    );
  }

  const typeLabel = getCampaignTypeLabel(campaign);

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={campaign.status} />
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{typeLabel}</span>
          </div>
          <h1 className="mt-1.5 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{campaign.name}</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/campaigns/${campaign.id}/edit`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max min-w-full sm:w-fit sm:min-w-0">
            {MANAGE_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-5">
          <OverviewPanel campaign={campaign} />
        </TabsContent>
        <TabsContent value="participants" className="mt-5">
          <ParticipantsPanel campaignId={campaign.id} type="participant" onCampaignChanged={refetch} />
        </TabsContent>
        <TabsContent value="volunteers" className="mt-5">
          <ParticipantsPanel campaignId={campaign.id} type="volunteer" onCampaignChanged={refetch} />
        </TabsContent>
        <TabsContent value="collection" className="mt-5">
          <CollectionPanel campaign={campaign} onRecorded={applyCampaign} />
        </TabsContent>
        <TabsContent value="pickups" className="mt-5">
          <PickupsPanel campaignId={campaign.id} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-5">
          <AnalyticsPanel campaignId={campaign.id} />
        </TabsContent>
        <TabsContent value="gallery" className="mt-5">
          <GalleryPanel campaign={campaign} onChanged={applyCampaign} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default CampaignManagePage;

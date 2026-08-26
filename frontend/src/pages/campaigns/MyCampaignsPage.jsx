/**
 * MyCampaignsPage — the organizer's own campaigns, split by status.
 * Mirrors pages/marketplace/MyListingsPage.jsx's shape.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Megaphone, Pencil, Settings, Trash2, Users } from "lucide-react";

import { useMyCampaigns } from "@/hooks/useCampaigns";
import { getCampaignType } from "@/config/campaigns";
import { formatFriendlyDate, formatNumber } from "@/lib/format";
import * as campaignService from "@/services/campaignService";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CampaignHeader from "@/components/campaigns/CampaignHeader";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_COPY = {
  all: "You haven't created any campaigns yet.",
  draft: "No drafts saved.",
  upcoming: "No upcoming campaigns.",
  active: "No active campaigns right now.",
  completed: "No completed campaigns yet.",
  cancelled: "No cancelled campaigns.",
};

const CampaignRow = ({ campaign, onCancel }) => {
  const type = getCampaignType(campaign.campaignType);
  const TypeIcon = type.icon;
  const image = campaign.bannerImage?.url ?? null;
  const canCancel = campaign.status === "upcoming" || campaign.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex gap-3 rounded-xl border border-border bg-card p-3 sm:p-4"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border sm:h-20 sm:w-20">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", type.tint)}>
            <TypeIcon className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium text-foreground">{campaign.name}</p>
          <StatusBadge status={campaign.status} className="shrink-0" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {formatNumber(campaign.participantCount)} participants
          </span>
          <span>·</span>
          <span>{formatFriendlyDate(campaign.startDate)}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs">
            <Link to={`/campaigns/${campaign.id}/manage`}>
              <Settings className="mr-1 h-3 w-3" />
              Manage
            </Link>
          </Button>
          {campaign.status !== "cancelled" && (
            <Button size="sm" variant="outline" asChild className="h-7 px-2 text-xs">
              <Link to={`/campaigns/${campaign.id}/edit`}>
                <Pencil className="mr-1 h-3 w-3" />
                Edit
              </Link>
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => onCancel(campaign)}>
              <Trash2 className="mr-1 h-3 w-3" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MyCampaignsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const { campaigns, loading, error, refetch, patchLocal } = useMyCampaigns(tab);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [working, setWorking] = useState(false);

  const handleCancel = async () => {
    setWorking(true);
    try {
      await campaignService.cancelCampaign(cancelTarget.id);
      toast.success("Campaign cancelled");
      patchLocal(cancelTarget.id, { status: "cancelled" });
      setCancelTarget(null);
    } catch (err) {
      toast.error(err.message || "Couldn't cancel this campaign.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <CampaignHeader title="My Campaigns" description="Every drive you've created, in one place." showCreateAction />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max min-w-full sm:w-fit sm:min-w-0">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {error ? (
              <ErrorState title="Unable to load your campaigns" description={error} onRetry={refetch} />
            ) : loading ? (
              <ListSkeleton count={3} />
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title={EMPTY_COPY[t.value]}
                description={t.value === "all" ? "Start a collection drive to rally your community around a goal." : undefined}
                actionLabel={t.value === "all" ? "Create a campaign" : undefined}
                onAction={t.value === "all" ? () => navigate("/campaigns/new") : undefined}
                className="py-12"
              />
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <CampaignRow key={campaign.id} campaign={campaign} onCancel={setCancelTarget} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this campaign?</DialogTitle>
            <DialogDescription>
              "{cancelTarget?.name}" will be marked cancelled and everyone who joined will be notified. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={working}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={working}>
              {working ? "Cancelling…" : "Cancel campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default MyCampaignsPage;

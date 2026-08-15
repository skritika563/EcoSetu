/**
 * CampaignPreview — two or three collection drives, framed by role.
 *
 * Households see drives they can join nearby; organizations see the drives they
 * are running. Full drive management belongs to the Campaigns module.
 */

import { CalendarDays, MapPin, Megaphone, Users } from "lucide-react";

import { notifyComingSoon } from "@/lib/comingSoon";
import { formatFriendlyDate, formatNumber } from "@/lib/format";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import ProgressBar from "@/components/common/ProgressBar";
import StatusBadge from "@/components/common/StatusBadge";

const CampaignCard = ({ campaign, showOrganizer }) => (
  <button
    type="button"
    onClick={() => notifyComingSoon("Campaigns")}
    className="w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/30"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{campaign.name}</p>
        {showOrganizer && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            by {campaign.organization.name}
          </p>
        )}
      </div>
      <StatusBadge status={campaign.status} className="shrink-0" />
    </div>

    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <CalendarDays className="h-3 w-3" />
        {formatFriendlyDate(campaign.startDate)}
      </span>
      <span className="flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {campaign.location.area}
      </span>
      <span className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        {formatNumber(campaign.participants)} joined
      </span>
    </div>

    <div className="mt-3">
      <ProgressBar
        value={campaign.collectedKg}
        max={campaign.goalKg}
        label={`${campaign.name} collection progress`}
      />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {formatNumber(campaign.collectedKg)} of {formatNumber(campaign.goalKg)} kg collected
      </p>
    </div>
  </button>
);

const CampaignPreview = ({ campaigns = [], isOrganization = false, className }) => (
  <section className={className} aria-label="Campaigns">
    <SectionHeader
      title={isOrganization ? "Your campaigns" : "Campaigns near you"}
      actionLabel="View all"
      onAction={() => notifyComingSoon("Campaigns")}
    />

    {campaigns.length === 0 ? (
      <EmptyState
        icon={Megaphone}
        title={isOrganization ? "No campaigns yet" : "No campaigns nearby"}
        description={
          isOrganization
            ? "Start a collection drive to rally your community around a goal."
            : "Collection drives near you will appear here as organizations create them."
        }
        actionLabel={isOrganization ? "Create campaign" : undefined}
        onAction={isOrganization ? () => notifyComingSoon("Create Campaign") : undefined}
      />
    ) : (
      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            showOrganizer={!isOrganization}
          />
        ))}
      </div>
    )}
  </section>
);

export default CampaignPreview;

/**
 * MyParticipationPage — campaigns the signed-in user has joined or
 * volunteered for, with their own status on each, and a way into their
 * certificate once a campaign completes and they were part of it.
 *
 * Available to every non-organizer role (household, collector) — the
 * organizer's equivalent is MyCampaignsPage (what they RUN, not what they
 * joined).
 *
 * ONE CARD PER CAMPAIGN, NOT PER REGISTRATION: the backend
 * (campaignController.listMyParticipation) returns one row per
 * CampaignParticipant document, so a user who is BOTH a participant and a
 * volunteer on the same drive gets two rows back with the same campaign id.
 * Rendering those as two separate cards reads as a duplicate bug, so this
 * page groups by campaign id first — a dual-role user sees one card
 * carrying both role badges, each with its own status and certificate link.
 */

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, HandHeart, Megaphone, UserCheck } from "lucide-react";

import { useMyParticipation } from "@/hooks/useCampaigns";
import { getCampaignType, getParticipationStatusMeta } from "@/config/campaigns";
import { formatFriendlyDate } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import CampaignHeader from "@/components/campaigns/CampaignHeader";
import { cn } from "@/lib/utils";

/** Groups the flat participation list into one entry per campaign, carrying every role the viewer has on it — Volunteer first, Participant second (fixed row order in the card, regardless of which the API returned first). */
const ROLE_ORDER = { volunteer: 0, participant: 1 };
const groupByCampaign = (campaigns) => {
  const byId = new Map();
  for (const campaign of campaigns) {
    const existing = byId.get(campaign.id);
    if (existing) {
      existing.roles.push(campaign.viewerParticipation);
    } else {
      byId.set(campaign.id, { ...campaign, roles: [campaign.viewerParticipation] });
    }
  }
  for (const campaign of byId.values()) {
    campaign.roles.sort((a, b) => ROLE_ORDER[a.participationType] - ROLE_ORDER[b.participationType]);
  }
  return Array.from(byId.values());
};

/** One row of the right-hand column: role + status, with its own certificate link when eligible. */
const RoleRow = ({ role, campaignStatus, campaignId }) => {
  const meta = getParticipationStatusMeta(role.status, role.participationType, role.cancelledBy);
  const canViewCertificate = campaignStatus === "completed" && (role.participationType === "participant" ? role.status !== "cancelled" : role.status === "attended");

  return (
    <div className="flex items-center justify-end gap-1.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {role.participationType === "volunteer" ? <HandHeart className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
        {role.participationType === "volunteer" ? "Volunteer" : "Participant"}
      </span>
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", meta.className)}>{meta.label}</span>
      {canViewCertificate && (
        <Button size="sm" variant="ghost" asChild className="h-6 px-2 text-[11px] text-primary hover:text-primary">
          <Link to={`/campaigns/${campaignId}/certificate?type=${role.participationType}`}>
            <Award className="mr-1 h-3 w-3" />
            Certificate
          </Link>
        </Button>
      )}
    </div>
  );
};

const ParticipationRow = ({ campaign }) => {
  const type = getCampaignType(campaign.campaignType);
  const TypeIcon = type.icon;
  const image = campaign.bannerImage?.url ?? null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <Link to={`/campaigns/${campaign.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border sm:h-20 sm:w-20">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", type.tint)}>
            <TypeIcon className="h-6 w-6" />
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link to={`/campaigns/${campaign.id}`} className="line-clamp-2 text-sm font-medium text-foreground hover:underline">
          {campaign.name}
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">{formatFriendlyDate(campaign.startDate)}</p>
      </div>

      {/* Right column: one row per role the viewer has, Volunteer above Participant — only rows that actually apply are rendered (see ROLE_ORDER above). */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {campaign.roles.map((role) => (
          <RoleRow key={role.participationType} role={role} campaignStatus={campaign.status} campaignId={campaign.id} />
        ))}
      </div>
    </div>
  );
};

const MyParticipationPage = () => {
  const navigate = useNavigate();
  const { campaigns, loading, error, refetch } = useMyParticipation();
  const grouped = useMemo(() => groupByCampaign(campaigns), [campaigns]);

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <CampaignHeader title="My Campaigns" description="Drives you've joined or volunteered for." showBack />

      {error ? (
        <ErrorState title="Unable to load your campaigns" description={error} onRetry={refetch} />
      ) : loading ? (
        <ListSkeleton count={3} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="You haven't joined any campaigns yet"
          description="Browse active drives and join one to see it here."
          actionLabel="Browse campaigns"
          onAction={() => navigate("/campaigns")}
          className="py-12"
        />
      ) : (
        <div className="space-y-3">
          {grouped.map((campaign) => (
            <ParticipationRow key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default MyParticipationPage;

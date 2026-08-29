/**
 * CampaignDetailsPage — one campaign, in full.
 *
 * OWNERSHIP SPLIT: the organizer sees Edit/Manage instead of Join/Volunteer
 * — `isOwner` comes from the SERVER (compares organizerId to the
 * authenticated user), the same pattern ProductDetailsPage already
 * established for Marketplace listings.
 *
 * IMPACT numbers (CO2 saved, Eco Points generated, collected weight) come
 * from the backend's `impact` object — never computed from anything the
 * client already had lying around, so they can't drift from what
 * campaignController actually aggregated.
 */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarDays,
  HandHeart,
  Images,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  Recycle,
  Settings,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { useCampaign } from "@/hooks/useCampaigns";
import * as campaignService from "@/services/campaignService";
import { getCampaignCategory, getCampaignType, getCampaignTypeLabel } from "@/config/campaigns";
import { formatFriendlyDate, formatNumber, formatWeight } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/common/StatusBadge";
import StatCard from "@/components/common/StatCard";
import CampaignProgress from "@/components/campaigns/CampaignProgress";
import { cn } from "@/lib/utils";

const BackLink = () => (
  <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
    <Link to="/campaigns">
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      Campaigns
    </Link>
  </Button>
);

const CampaignDetailsPage = () => {
  const { campaignId } = useParams();
  const { campaign, loading, error, refetch } = useCampaign(campaignId);
  const [working, setWorking] = useState(null); // "join" | "leave-join" | "volunteer" | "leave-volunteer" | null

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

  if (!campaign) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <EmptyState title="Campaign not found" description="It may have been removed." className="mt-4" />
      </PageContainer>
    );
  }

  const type = getCampaignType(campaign.campaignType);
  const typeLabel = getCampaignTypeLabel(campaign);
  const TypeIcon = type.icon;
  const vp = campaign.viewerParticipation ?? {};
  const isJoinable = campaign.status === "active" || campaign.status === "upcoming";

  const runAction = async (key, fn, successMessage) => {
    setWorking(key);
    try {
      await fn();
      toast.success(successMessage);
      await refetch();
    } catch (err) {
      toast.error(err.message || "That didn't work — please try again.");
    } finally {
      setWorking(null);
    }
  };

  const handleJoin = () => runAction("join", () => campaignService.joinCampaign(campaign.id), "You're participating");
  const handleLeaveJoin = () => runAction("leave-join", () => campaignService.leaveCampaign(campaign.id), "You've left this campaign");
  const handleVolunteer = () =>
    runAction("volunteer", () => campaignService.volunteerForCampaign(campaign.id), "Volunteer registration submitted");
  const handleLeaveVolunteer = () =>
    runAction("leave-volunteer", () => campaignService.leaveVolunteering(campaign.id), "Volunteer registration cancelled");

  const canViewCertificate =
    campaign.status === "completed" &&
    ((vp.isParticipant && vp.participantStatus !== "cancelled") || (vp.isVolunteer && vp.volunteerStatus === "attended"));

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted/40 sm:aspect-[3/1]">
          {campaign.bannerImage?.url ? (
            <img src={campaign.bannerImage.url} alt={campaign.name} className="h-full w-full object-cover" />
          ) : (
            <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2", type.tint)}>
              <TypeIcon className="h-10 w-10" />
              <span className="text-sm font-medium">{typeLabel}</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <StatusBadge status={campaign.status} className="shadow-sm" />
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm", type.tint)}>
              <TypeIcon className="h-3 w-3" />
              {typeLabel}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{campaign.name}</h1>

          {campaign.organization && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              Organized by <span className="font-medium text-foreground">{campaign.organization.name}</span>
              {campaign.organization.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified organization" />}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {formatFriendlyDate(campaign.startDate)} – {formatFriendlyDate(campaign.endDate)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {[campaign.location?.area, campaign.location?.city].filter(Boolean).join(", ")}
            </span>
          </div>

          {campaign.categories?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {campaign.categories.map((key) => {
                const cat = getCampaignCategory(key);
                const CatIcon = cat.icon;
                return (
                  <span key={key} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cat.tint)}>
                    <CatIcon className="h-3 w-3" />
                    {cat.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: description + progress + gallery ────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="font-heading text-base font-semibold text-foreground">About this campaign</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{campaign.description}</p>
          </section>

          <Separator />

          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">Progress</h2>
            <CampaignProgress campaign={campaign} />
          </section>

          {campaign.impact && (
            <section>
              <h2 className="mb-3 font-heading text-base font-semibold text-foreground">Impact</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Scrap collected" value={campaign.impact.collectedWeightKg} format={(v) => formatWeight(v)} icon={Recycle} />
                <StatCard label="CO₂ saved" value={campaign.impact.co2SavedKg} format={(v) => `${formatNumber(v, { decimals: 1 })} kg`} icon={Sparkles} />
                <StatCard label="Eco Points generated" value={campaign.impact.totalEcoPointsGenerated} icon={Award} />
                <StatCard label="Volunteers" value={campaign.impact.volunteerCount} icon={HandHeart} />
              </div>
            </section>
          )}

          {campaign.gallery?.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-1.5 font-heading text-base font-semibold text-foreground">
                <Images className="h-4 w-4" />
                Gallery
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {campaign.gallery.map((img) => (
                  <div key={img.id} className="aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={img.url} alt={img.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: actions ──────────────────────────────────────────── */}
        <aside className="space-y-4">
          {campaign.isOwner ? (
            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Your campaign</p>
              <Button asChild className="w-full">
                <Link to={`/campaigns/${campaign.id}/manage`}>
                  <Settings className="mr-1.5 h-4 w-4" />
                  Manage campaign
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link to={`/campaigns/${campaign.id}/edit`}>
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit details
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Participation</p>
                {vp.isParticipant ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <UserCheck className="h-4 w-4" />
                    {vp.participantStatus === "registered" ? "Registered — pending approval" : "You're participating"}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-muted-foreground">You haven't joined this campaign yet.</p>
                )}
              </div>

              {vp.isParticipant ? (
                <Button variant="outline" className="w-full" onClick={handleLeaveJoin} disabled={working === "leave-join"}>
                  {working === "leave-join" ? "Leaving…" : "Leave campaign"}
                </Button>
              ) : (
                isJoinable && (
                  <Button className="w-full" onClick={handleJoin} disabled={working === "join"}>
                    {working === "join" ? "Joining…" : "Join campaign"}
                  </Button>
                )
              )}

              <Separator />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Volunteering</p>
                {vp.isVolunteer ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <HandHeart className="h-4 w-4" />
                    {vp.volunteerStatus === "registered" && "Registered — pending approval"}
                    {vp.volunteerStatus === "approved" && "You're volunteering"}
                    {vp.volunteerStatus === "attended" && "Attended — thank you!"}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-muted-foreground">Volunteer to help run this drive.</p>
                )}
              </div>

              {vp.isVolunteer ? (
                vp.volunteerStatus !== "attended" && (
                  <Button variant="outline" className="w-full" onClick={handleLeaveVolunteer} disabled={working === "leave-volunteer"}>
                    {working === "leave-volunteer" ? "Cancelling…" : "Cancel volunteering"}
                  </Button>
                )
              ) : (
                isJoinable && (
                  <Button variant="outline" className="w-full" onClick={handleVolunteer} disabled={working === "volunteer"}>
                    {working === "volunteer" ? "Registering…" : "Volunteer"}
                  </Button>
                )
              )}

              {canViewCertificate && (
                <Button variant="ghost" asChild className="w-full text-primary hover:text-primary">
                  <Link to={`/campaigns/${campaign.id}/certificate`}>
                    <Award className="mr-1.5 h-4 w-4" />
                    View certificate
                  </Link>
                </Button>
              )}

              {campaign.organization && (
                <Button variant="outline" asChild className="w-full">
                  <Link to={`/campaigns/messages?userId=${campaign.organization.id}&contextId=${campaign.id}`}>
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Message organizer
                  </Link>
                </Button>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">At a glance</p>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Participants
                </dt>
                <dd className="font-medium text-foreground">{formatNumber(campaign.participantCount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <HandHeart className="h-3.5 w-3.5" />
                  Volunteers
                </dt>
                <dd className="font-medium text-foreground">{formatNumber(campaign.volunteerCount)}</dd>
              </div>
              {campaign.targetWeightKg > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Recycle className="h-3.5 w-3.5" />
                    Target
                  </dt>
                  <dd className="font-medium text-foreground">{formatWeight(campaign.targetWeightKg)}</dd>
                </div>
              )}
              {campaign.targetSaplings > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Sapling target</dt>
                  <dd className="font-medium text-foreground">{formatNumber(campaign.targetSaplings)}</dd>
                </div>
              )}
              {campaign.expectedStalls > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Stalls expected</dt>
                  <dd className="font-medium text-foreground">{formatNumber(campaign.expectedStalls)}</dd>
                </div>
              )}
            </dl>
          </div>

          {campaign.cancellation && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-destructive">Cancelled.</span> {campaign.cancellation.reason}
              </p>
            </div>
          )}
        </aside>
      </div>
    </PageContainer>
  );
};

export default CampaignDetailsPage;

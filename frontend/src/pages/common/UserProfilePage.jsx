/**
 * UserProfilePage — one general "who is this person" page, shared by two
 * entry points that both need the exact same thing: Marketplace's buyer
 * checking a seller before ordering (`/marketplace/seller/:sellerId`), and
 * Campaigns' organizer checking a participant/volunteer before approving
 * them (`/campaigns/users/:userId`). Same backend endpoint
 * (GET /users/:id/profile), same page, same layout — only what's actually
 * present in the response differs per person (a household viewer has no
 * `rating`, someone who has never joined a campaign has an empty
 * `campaignHistory`), so every section below renders conditionally rather
 * than the two entry points getting materially different pages.
 *
 * BACK LINK: this page has two real parents depending on how it was
 * reached (Marketplace's seller card, or a campaign's Participants/
 * Volunteers panel), so it retraces however the viewer actually got here
 * (`navigate(-1)`) rather than hard-coding one destination — same reasoning
 * as CampaignHeader's own `showBack`.
 */

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, BadgeCheck, HandHeart, MapPin, MessageCircle, Star, UserCheck } from "lucide-react";

import { useUserProfile } from "@/hooks/useUsers";
import { getCampaignTypeLabel, getParticipationStatusMeta } from "@/config/campaigns";
import { formatFriendlyDate, formatNumber, getInitials } from "@/lib/format";
import { notifyComingSoon } from "@/lib/comingSoon";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { HeroSkeleton } from "@/components/common/SectionSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  household: "Household",
  organization: "Organization",
  collector: "EcoSetu Collector",
};

const BackLink = () => {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 h-8 text-muted-foreground hover:text-foreground">
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
      Back
    </Button>
  );
};

const CampaignHistoryRow = ({ entry }) => {
  const typeLabel = getCampaignTypeLabel({ campaignType: entry.campaignType, customTypeLabel: entry.customTypeLabel });
  const participationMeta = getParticipationStatusMeta(entry.participationStatus, entry.participationType);

  return (
    <Link
      to={`/campaigns/${entry.campaignId}`}
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3.5 hover:border-primary/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {entry.participationType === "volunteer" ? <HandHeart className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
            {entry.participationType === "volunteer" ? "Volunteer" : "Participant"}
          </span>
          <span>·</span>
          <span>{typeLabel}</span>
          <span>·</span>
          <span>{formatFriendlyDate(entry.joinedAt)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", participationMeta.className)}>
          {participationMeta.label}
        </span>
        <StatusBadge status={entry.campaignStatus} />
      </div>
    </Link>
  );
};

const UserProfilePage = () => {
  const { sellerId, userId } = useParams();
  const id = userId ?? sellerId;

  const { profile, bio, campaignHistory, loading, error, refetch } = useUserProfile(id);

  const participantEntries = useMemo(() => campaignHistory.filter((e) => e.participationType === "participant"), [campaignHistory]);
  const volunteerEntries = useMemo(() => campaignHistory.filter((e) => e.participationType === "volunteer"), [campaignHistory]);
  // Only worth splitting into tabs when this person has done both kinds —
  // one lone tab would just relabel the same list. Default to whichever
  // kind actually has entries.
  const hasBothKinds = participantEntries.length > 0 && volunteerEntries.length > 0;
  const [historyTab, setHistoryTab] = useState(participantEntries.length > 0 ? "participant" : "volunteer");
  const visibleEntries = hasBothKinds ? (historyTab === "participant" ? participantEntries : volunteerEntries) : campaignHistory;

  if (error) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <ErrorState title="We couldn't load this profile" description={error} onRetry={refetch} className="mt-4" />
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

  if (!profile) {
    return (
      <PageContainer className="py-10">
        <BackLink />
        <EmptyState title="Profile not found" className="mt-4" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <BackLink />

      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16">
          {profile.profileImage && <AvatarImage src={profile.profileImage} alt="" />}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">{getInitials(profile.name)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight text-foreground">
            <span className="truncate">{profile.name}</span>
            {profile.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label="Verified by EcoSetu" />}
            {/* Chat isn't built yet (no Conversation/Message model — see
                MarketplaceMessages.jsx's header comment for the honest
                "not built" boundary this shares); an honest coming-soon
                toast beats a dead-looking link. */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
              onClick={() => notifyComingSoon("Chat")}
              aria-label={`Chat with ${profile.name}`}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </h1>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{profile.role === "organization" && profile.organizationType ? profile.organizationType : (ROLE_LABELS[profile.role] ?? profile.role)}</span>
            {profile.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                {profile.rating.toFixed(1)}
              </span>
            )}
            {profile.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-primary" />
              {formatNumber(profile.ecoPoints)} Eco Points
            </span>
          </div>

          {profile.memberSince && <p className="mt-0.5 text-xs text-muted-foreground">On EcoSetu since {formatFriendlyDate(profile.memberSince)}</p>}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">About</h2>
        {bio ? (
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{bio}</p>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">This user hasn't added a bio yet.</p>
        )}
      </div>

      {campaignHistory.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-semibold text-foreground">Campaign history</h2>
            {/* Lets an organizer checking this profile see at a glance how
                many drives this person has volunteered for/managed versus
                just participated in, rather than one mixed list. */}
            {hasBothKinds && (
              <Tabs value={historyTab} onValueChange={setHistoryTab}>
                <TabsList className="h-8">
                  <TabsTrigger value="participant" className="text-xs">
                    Participant ({participantEntries.length})
                  </TabsTrigger>
                  <TabsTrigger value="volunteer" className="text-xs">
                    Volunteer ({volunteerEntries.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="space-y-2.5">
            {visibleEntries.map((entry) => (
              <CampaignHistoryRow key={`${entry.campaignId}-${entry.participationType}`} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default UserProfilePage;

/**
 * SustainabilityDashboard — the user's environmental impact and journey.
 *
 * Home answers "what matters to me right now?".
 * This page answers "what impact have I made, and how has it grown?".
 *
 * One page serves every role. Household, NGO, school, university and collector
 * differ in copy and which metrics lead — never in structure, because they are
 * the same product with different content.
 *
 * All numbers derive from one mock source (data/sustainabilityData.js) through
 * sustainabilityService, so nothing on the page can contradict anything else.
 */

import { ArrowLeft, Sprout } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useSustainabilityData } from "@/hooks/useSustainabilityData";
import { getOrganizationLabel } from "@/config/domain";
import { formatNumber } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import EmptyState from "@/components/common/EmptyState";
import { ListSkeleton, StatsSkeleton } from "@/components/common/SectionSkeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import StatCard from "@/components/common/StatCard";

import { buildImpactStats } from "@/config/impactStats";
import CollectionBreakdown from "@/components/home/CollectionBreakdown";
import RecentActivity from "@/components/home/RecentActivity";
import EcoJourney from "@/components/sustainability/EcoJourney";
import ImpactChart from "@/components/sustainability/ImpactChart";
import EcoStreak from "@/components/sustainability/EcoStreak";
import AchievementGrid from "@/components/sustainability/AchievementGrid";
import EcoPointsShowcase from "@/components/sustainability/EcoPointsShowcase";

/* ─── Role-specific copy ─────────────────────────────────────────────────── */
const getCopy = (role, user) => {
  const name = user?.name?.trim();

  if (role === "organization") {
    const label = getOrganizationLabel(user?.organizationType);
    return {
      title: name ? `${name} Sustainability Journey` : "Your Sustainability Journey",
      subtitle: `See how your ${label.sentenceNoun}'s everyday actions are creating a measurable impact.`,
      breakdownTitle: "What your community has recycled",
      activityTitle: "Recent eco activity",
    };
  }

  if (role === "collector") {
    return {
      title: "Your Collection Impact 🌱",
      subtitle: "See how much material you've kept in circulation and out of landfill.",
      breakdownTitle: "What you've collected",
      activityTitle: "Recent eco activity",
    };
  }

  return {
    title: "Your Sustainability Journey 🌱",
    subtitle: "See how your everyday actions are creating a measurable impact.",
    breakdownTitle: "What you've recycled",
    activityTitle: "Recent eco activity",
  };
};

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
const DashboardSkeleton = () => (
  <div className="space-y-8">
    <StatsSkeleton />
    <div className="rounded-2xl border border-border bg-card p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-3">
      <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
      <ListSkeleton count={3} />
    </div>
  </div>
);

/* ─── Page ───────────────────────────────────────────────────────────────── */
const SustainabilityDashboard = () => {
  const { user, role } = useAuth();
  const { data, loading, error, refetch } = useSustainabilityData();

  const copy = getCopy(role, user);
  const isOrganization = role === "organization";
  const summary = data?.summary;
  const hasActivity = (summary?.activities ?? 0) > 0;
  const impactStats = summary ? buildImpactStats(summary, isOrganization) : [];

  return (
    <PageContainer className="space-y-8 py-6 sm:py-8">
      {/* ─── Header ───────────────────────────────────────────────────── */}
      <header className="min-w-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 mb-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Home
          </Link>
        </Button>

        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.subtitle}</p>

        {!loading && !error && hasActivity && (
          <p className="mt-3 text-sm text-muted-foreground">
            You&apos;ve made an impact on{" "}
            <span className="font-medium text-foreground">
              {formatNumber(summary.activeDays)} days
            </span>{" "}
            this year. Keep growing your EcoSetu journey.
          </p>
        )}
      </header>

      {error ? (
        <ErrorState
          title="We couldn't load your sustainability data"
          description="Something went wrong while loading your impact history."
          onRetry={refetch}
        />
      ) : loading ? (
        <DashboardSkeleton />
      ) : !hasActivity ? (
        /* ─── Empty state: brand-new account ─────────────────────────── */
        <div className="space-y-8">
          <EmptyState
            icon={Sprout}
            title="Your Eco Journey Starts Here 🌱"
            description="You haven't recorded any sustainability activity yet. Complete your first pickup or join a campaign to start growing your EcoSetu journey."
            className="py-14"
          />
          {/* The garden still renders — empty planters and a bare sapling show
              the user exactly what their actions will grow. */}
          <TooltipProvider>
            <EcoJourney months={data?.months ?? []} summary={summary} />
          </TooltipProvider>
        </div>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="space-y-8">
            {/* ─── Impact overview ─────────────────────────────────── */}
            {/* Bento layout: Scrap Recycled / CO₂ Saved / Eco Activities /
                Trees Planted fill a 2×2 block across the first two (wider)
                columns; Eco Points gets its own tall showcase card in the
                third column, spanning both rows, since it's the one figure
                on this page you can actually go spend (see
                EcoPointsShowcase's link into /rewards). */}
            <section aria-label="Impact overview">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.15fr_1.15fr_1fr] lg:grid-rows-2">
                {["recycled", "co2", "activities", "treesPlanted"].map((key, index) => {
                  const stat = impactStats.find((s) => s.key === key);
                  if (!stat) return null;
                  const position = [
                    "lg:col-start-1 lg:row-start-1",
                    "lg:col-start-2 lg:row-start-1",
                    "lg:col-start-1 lg:row-start-2",
                    "lg:col-start-2 lg:row-start-2",
                  ][index];
                  return (
                    <div key={stat.key} className={position}>
                      <StatCard
                        label={stat.label}
                        value={stat.value}
                        format={stat.format}
                        icon={stat.icon}
                        iconClassName={stat.iconClassName}
                        hint={stat.hint}
                        delay={index * 0.06}
                      />
                    </div>
                  );
                })}

                <div className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2">
                  <EcoPointsShowcase value={summary.ecoPoints} delay={0.24} />
                </div>
              </div>
            </section>

            {/* ─── Signature: plants + tree ────────────────────────── */}
            <EcoJourney months={data.months} summary={summary} />

            {/* ─── Trends + recycling mix ──────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-3">
              <ImpactChart months={data.months} className="lg:col-span-2" />
              <CollectionBreakdown
                data={data.categories}
                title={copy.breakdownTitle}
                description={`${formatNumber(summary.scrapRecycledKg, { decimals: 1 })} kg across ${data.categories.length} categories`}
              />
            </div>

            {/* ─── Streak + achievements ───────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-3">
              <EcoStreak streak={data.streak} />
              <AchievementGrid achievements={data.achievements} className="lg:col-span-2" />
            </div>

            {/* ─── Recent eco activity ─────────────────────────────── */}
            <RecentActivity
              activity={data.activity}
              title={copy.activityTitle}
              description="The latest actions feeding your garden"
            />
          </div>
        </TooltipProvider>
      )}
    </PageContainer>
  );
};

export default SustainabilityDashboard;

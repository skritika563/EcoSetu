/**
 * GeneralUserHome — the Home dashboard for household and organization users.
 *
 * ONE dashboard serves household, NGO, school and university. Household and
 * organization differ only in copy, ordering and which data they receive —
 * never in structure. NGO / school / university are all `role === "organization"`
 * distinguished by `organizationType`; they are never separate dashboards.
 *
 * Home answers "what matters to me right now?" and nothing more:
 *   hero pickup summary · quick actions · previews · activity
 * Lifetime impact totals live on the Sustainability dashboard; detailed
 * management lives in the Pickups, Marketplace, Rewards and Campaigns modules.
 */

import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getOrganizationLabel } from "@/config/domain";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import {
  CardGridSkeleton,
  HeroSkeleton,
  ListSkeleton,
} from "@/components/common/SectionSkeleton";

import DashboardGreeting from "@/components/home/DashboardGreeting";
import DashboardHero from "@/components/home/DashboardHero";
import QuickActions from "@/components/home/QuickActions";
import MarketplacePreview from "@/components/home/MarketplacePreview";
import CampaignPreview from "@/components/home/CampaignPreview";
import RecentActivity from "@/components/home/RecentActivity";

const GeneralUserHome = () => {
  const { user, role } = useAuth();
  const { data, loading, error, refetch } = useDashboardData();

  const isOrganization = role === "organization";
  const orgLabel = getOrganizationLabel(user?.organizationType);

  const subtitle = isOrganization
    ? `Here's how your ${orgLabel.sentenceNoun} is doing on EcoSetu today.`
    : "Here's what's happening with your recycling today.";

  return (
    <PageContainer className="space-y-8 py-6 sm:py-8">
      <DashboardGreeting subtitle={subtitle} />

      {error ? (
        <ErrorState
          title="We couldn't load your dashboard"
          description={error}
          onRetry={refetch}
        />
      ) : (
        <>
          {/* Primary action card */}
          {loading ? (
            <HeroSkeleton />
          ) : (
            <DashboardHero pickup={data?.upcomingPickup} isOrganization={isOrganization} />
          )}

          {/* Shortcuts */}
          <QuickActions role={role} />

          {/* Previews — marketplace leads for households, campaigns for orgs */}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className={isOrganization ? "lg:order-2 lg:col-span-2" : "lg:col-span-2"}>
              {loading ? (
                <>
                  <div className="mb-4 h-5 w-40 rounded bg-muted" />
                  <CardGridSkeleton />
                </>
              ) : (
                <MarketplacePreview listings={data?.marketplace} />
              )}
            </div>

            <div className={isOrganization ? "lg:order-1" : undefined}>
              {loading ? (
                <>
                  <div className="mb-4 h-5 w-32 rounded bg-muted" />
                  <ListSkeleton count={2} />
                </>
              ) : (
                <CampaignPreview campaigns={data?.campaigns} isOrganization={isOrganization} />
              )}
            </div>
          </div>

          {/* Recent activity */}
          {loading ? (
            <div>
              <div className="mb-4 h-5 w-32 rounded bg-muted" />
              <ListSkeleton count={3} />
            </div>
          ) : (
            <RecentActivity activity={data?.activity} />
          )}
        </>
      )}
    </PageContainer>
  );
};

export default GeneralUserHome;

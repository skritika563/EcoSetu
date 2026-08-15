/**
 * CollectorHome — the Home dashboard for scrap collectors.
 *
 * Separate from GeneralUserHome by design: collectors run an operational shift
 * rather than browsing a consumer product. The page leads with today's numbers
 * and the next job, then supporting detail.
 *
 * Summary only — job execution, weighing and payment belong to the Jobs module.
 */

import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";

import PageContainer from "@/components/common/PageContainer";
import ErrorState from "@/components/common/ErrorState";
import {
  HeroSkeleton,
  ListSkeleton,
  StatsSkeleton,
} from "@/components/common/SectionSkeleton";

import DashboardGreeting from "@/components/home/DashboardGreeting";
import CollectorSummary from "@/components/home/CollectorSummary";
import NextJobCard from "@/components/home/NextJobCard";
import QuickActions from "@/components/home/QuickActions";
import WeeklyEarnings from "@/components/home/WeeklyEarnings";
import CollectionBreakdown from "@/components/home/CollectionBreakdown";
import MarketplaceOrders from "@/components/home/MarketplaceOrders";
import RecentActivity from "@/components/home/RecentActivity";

const CollectorHome = () => {
  const { role } = useAuth();
  const { data, loading, error, refetch } = useDashboardData();

  const remaining = data?.today ? Math.max(0, data.today.jobsTotal - data.today.jobsCompleted) : 0;

  const subtitle = loading
    ? "Loading your shift…"
    : remaining > 0
      ? `You have ${remaining} ${remaining === 1 ? "job" : "jobs"} left today.`
      : "All of today's jobs are done.";

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
          {/* Today's numbers + progress */}
          {loading ? <StatsSkeleton count={3} className="lg:grid-cols-3" /> : (
            <CollectorSummary today={data?.today} />
          )}

          {/* Next job — the primary action */}
          {loading ? <HeroSkeleton /> : <NextJobCard job={data?.nextJob} />}

          {/* Shortcuts */}
          <QuickActions role={role} />

          {/* Earnings + category mix */}
          <div className="grid gap-8 lg:grid-cols-2">
            {loading ? (
              <>
                <div>
                  <div className="mb-4 h-5 w-28 rounded bg-muted" />
                  <ListSkeleton count={2} />
                </div>
                <div>
                  <div className="mb-4 h-5 w-44 rounded bg-muted" />
                  <ListSkeleton count={3} />
                </div>
              </>
            ) : (
              <>
                <WeeklyEarnings data={data?.weeklyEarnings} />
                <CollectionBreakdown data={data?.categoryBreakdown} />
              </>
            )}
          </div>

          {/* Orders + activity */}
          <div className="grid gap-8 lg:grid-cols-2">
            {loading ? (
              <>
                <div>
                  <div className="mb-4 h-5 w-40 rounded bg-muted" />
                  <ListSkeleton count={3} />
                </div>
                <div>
                  <div className="mb-4 h-5 w-32 rounded bg-muted" />
                  <ListSkeleton count={3} />
                </div>
              </>
            ) : (
              <>
                <MarketplaceOrders orders={data?.orders} />
                <RecentActivity activity={data?.activity} />
              </>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default CollectorHome;

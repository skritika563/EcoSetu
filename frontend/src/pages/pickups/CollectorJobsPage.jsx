/**
 * CollectorJobsPage — the collector's main pickup-management surface.
 *
 * Collectors never see the household booking UI — they work from jobs that
 * already exist. Three tabs match how a collector actually works the queue:
 *
 *   Upcoming — accepted jobs, not yet finished. Today's jobs are grouped
 *              first within this tab rather than needing a separate "Today"
 *              tab — the whole list is sorted so "today" naturally sorts up.
 *   Requests — pending pickups nobody has accepted yet, with a search box to
 *              find one worth taking.
 *   History  — completed and cancelled jobs, most recent 30.
 */

import { useMemo, useState } from "react";
import { Construction, Search } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePickups } from "@/hooks/usePickups";
import { COLLECTOR_JOB_TABS, HISTORY_LIMIT, isSameDay } from "@/config/pickups";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { ListSkeleton } from "@/components/common/SectionSkeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobCard from "@/components/pickups/JobCard";

const EMPTY_COPY = {
  upcoming: "No upcoming jobs assigned yet.",
  requests: "No pickup requests waiting right now.",
  history: "Your completed and cancelled jobs will appear here.",
};

/** Ascending by date — soonest (today included) first. */
const byDateAscending = (a, b) => new Date(a.pickupDate) - new Date(b.pickupDate);

/** Descending by most recent activity — newest history first. */
const byRecentActivityDescending = (a, b) => {
  const lastAt = (job) => job.statusHistory?.at(-1)?.at ?? job.pickupDate;
  return new Date(lastAt(b)) - new Date(lastAt(a));
};

const CollectorJobsPage = () => {
  const { role } = useAuth();
  const { data, loading, error, refetch } = usePickups();
  const [search, setSearch] = useState("");

  // All hooks must run in the same order on every render, so these are
  // computed unconditionally even though they're unused on the admin path.
  const requestResults = useMemo(() => {
    if (!data) return [];
    const requests = data.filter(COLLECTOR_JOB_TABS.find((t) => t.value === "requests").filter);
    const query = search.trim().toLowerCase();
    const filtered = query
      ? requests.filter(
          (job) =>
            job.id.toLowerCase().includes(query) ||
            job.pickupAddress?.line?.toLowerCase().includes(query) ||
            job.customer?.name?.toLowerCase().includes(query)
        )
      : requests;
    return filtered.sort(byDateAscending);
  }, [data, search]);

  const upcoming = useMemo(() => {
    if (!data) return { today: [], later: [] };
    const jobs = data
      .filter(COLLECTOR_JOB_TABS.find((t) => t.value === "upcoming").filter)
      .sort(byDateAscending);
    const now = new Date();
    return {
      today: jobs.filter((j) => isSameDay(new Date(j.pickupDate), now)),
      later: jobs.filter((j) => !isSameDay(new Date(j.pickupDate), now)),
    };
  }, [data]);

  const history = useMemo(() => {
    if (!data) return [];
    return data
      .filter(COLLECTOR_JOB_TABS.find((t) => t.value === "history").filter)
      .sort(byRecentActivityDescending)
      .slice(0, HISTORY_LIMIT);
  }, [data]);

  if (role === "admin") {
    return (
      <PageContainer className="py-10">
        <EmptyState
          icon={Construction}
          title="Pickup management for administrators is coming soon"
          description="This surface is being designed for admins separately from the collector experience."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <header>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your accepted pickups, open requests near you, and your job history.
        </p>
      </header>

      {error ? (
        <ErrorState title="Unable to load jobs" description="Please try again." onRetry={refetch} />
      ) : loading ? (
        <ListSkeleton count={4} />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList className="w-full sm:w-fit">
            {COLLECTOR_JOB_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Upcoming — today's jobs grouped first, everything else after */}
          <TabsContent value="upcoming" className="mt-4 space-y-6">
            {upcoming.today.length === 0 && upcoming.later.length === 0 ? (
              <EmptyState title={EMPTY_COPY.upcoming} className="py-12" />
            ) : (
              <>
                {upcoming.today.length > 0 && (
                  <div>
                    <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Today
                    </h2>
                    <div className="space-y-3">
                      {upcoming.today.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </div>
                )}
                {upcoming.later.length > 0 && (
                  <div>
                    {upcoming.today.length > 0 && (
                      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Later
                      </h2>
                    )}
                    <div className="space-y-3">
                      {upcoming.later.map((job) => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Requests — pending, unaccepted pickups, searchable */}
          <TabsContent value="requests" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search requests by ID, customer or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search pickup requests"
              />
            </div>

            {requestResults.length === 0 ? (
              <EmptyState
                title={search.trim() ? "No requests match your search." : EMPTY_COPY.requests}
                className="py-12"
              />
            ) : (
              <div className="space-y-3">
                {requestResults.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* History — completed + cancelled, most recent 30 */}
          <TabsContent value="history" className="mt-4">
            {history.length === 0 ? (
              <EmptyState title={EMPTY_COPY.history} className="py-12" />
            ) : (
              <div className="space-y-3">
                {history.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </PageContainer>
  );
};

export default CollectorJobsPage;

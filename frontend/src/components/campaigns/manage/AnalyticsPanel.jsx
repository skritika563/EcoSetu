/**
 * AnalyticsPanel — owner-only campaign analytics.
 *
 * Uses recharts, already a project dependency (see
 * components/sustainability/ImpactChart.jsx, the first thing to use it) —
 * no second charting library. Every number comes straight from
 * campaignController.getCampaignAnalytics's real aggregates; nothing here
 * is computed from anything the frontend already had.
 *
 * Three charts, deliberately: participant growth, collection over time,
 * category breakdown — plus the overview as stat cards. More than that
 * stops being "understandable at a glance."
 */

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Award, Recycle, Sparkles, Users } from "lucide-react";

import { useCampaignAnalytics } from "@/hooks/useCampaigns";
import { getCategory } from "@/config/domain";
import { formatNumber, formatWeight } from "@/lib/format";

import ErrorState from "@/components/common/ErrorState";
import { StatsSkeleton } from "@/components/common/SectionSkeleton";
import EmptyState from "@/components/common/EmptyState";
import StatCard from "@/components/common/StatCard";

const ChartTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-foreground px-3 py-2 text-xs text-background shadow-md">
      <p className="font-semibold">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-0.5 opacity-90">
          {p.name}: {format ? format(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/** [{day, type, count}] → cumulative [{day, participant, volunteer}] for a growth line. */
const buildGrowthSeries = (rows) => {
  const days = [...new Set(rows.map((r) => r.day))].sort();
  let participantTotal = 0;
  let volunteerTotal = 0;
  return days.map((day) => {
    participantTotal += rows.filter((r) => r.day === day && r.type === "participant").reduce((s, r) => s + r.count, 0);
    volunteerTotal += rows.filter((r) => r.day === day && r.type === "volunteer").reduce((s, r) => s + r.count, 0);
    return { day, participant: participantTotal, volunteer: volunteerTotal };
  });
};

const ChartCard = ({ title, children }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <h3 className="mb-4 font-heading text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

const AnalyticsPanel = ({ campaignId }) => {
  const { analytics, loading, error, refetch } = useCampaignAnalytics(campaignId);

  if (error) return <ErrorState title="Unable to load analytics" description={error} onRetry={refetch} />;
  if (loading || !analytics) return <StatsSkeleton count={4} />;

  const { overview, participantGrowth, collectionOverTime, categoryBreakdown } = analytics;
  const growthSeries = buildGrowthSeries(participantGrowth);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Participants" value={overview.participantCount} icon={Users} hint={overview.participantProgressPercent != null ? `${overview.participantProgressPercent}% of target` : undefined} />
        <StatCard label="Scrap collected" value={overview.collectedWeightKg} format={(v) => formatWeight(v)} icon={Recycle} hint={`${overview.weightProgressPercent}% of target`} />
        <StatCard label="CO₂ saved" value={overview.co2SavedKg} format={(v) => `${formatNumber(v, { decimals: 1 })} kg`} icon={Sparkles} />
        <StatCard label="Eco Points generated" value={overview.totalEcoPointsGenerated} icon={Award} />
      </div>

      <ChartCard title="Participation growth">
        {growthSeries.length === 0 ? (
          <EmptyState title="No registrations yet" className="py-8" />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthSeries} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
                <Line type="monotone" dataKey="participant" name="Participants" stroke="var(--ecosetu-primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="volunteer" name="Volunteers" stroke="var(--ecosetu-orange)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Scrap collected over time">
        {collectionOverTime.length === 0 ? (
          <EmptyState title="Nothing logged yet" className="py-8" />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={collectionOverTime} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="collection-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ecosetu-secondary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--ecosetu-secondary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <RechartsTooltip content={<ChartTooltip format={(v) => `${formatNumber(v, { decimals: 1 })} kg`} />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="weightKg" name="Collected" stroke="var(--ecosetu-primary)" strokeWidth={2} fill="url(#collection-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Category breakdown">
        {categoryBreakdown.length === 0 ? (
          <EmptyState title="Nothing logged yet" className="py-8" />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown.map((c) => ({ ...c, label: getCategory(c.category).label }))} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={90} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <RechartsTooltip content={<ChartTooltip format={(v) => `${formatNumber(v, { decimals: 1 })} kg`} />} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="weightKg" name="Collected" fill="var(--ecosetu-secondary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
};

export default AnalyticsPanel;

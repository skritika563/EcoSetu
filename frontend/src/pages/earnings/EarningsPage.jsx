/**
 * EarningsPage — a collector's money view.
 *
 * Two real sides, both from recorded documents (see backend
 * analyticsController.getEarnings): income from marketplace sales, minus
 * what they paid households at pickup. Net is the difference — this page
 * exists to answer "am I actually making money", which neither the
 * marketplace stats card nor the jobs list can answer on its own.
 */

import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  IndianRupee,
  Package,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import useEarnings from "@/hooks/useEarnings";
import { formatCurrency, formatFriendlyDate, formatNumber } from "@/lib/format";

import PageContainer from "@/components/common/PageContainer";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const RANGES = [
  { months: 3, label: "3M" },
  { months: 6, label: "6M" },
  { months: 12, label: "1Y" },
];

const StatTile = ({ icon: Icon, label, value, hint, tone = "primary" }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          tone === "primary" && "bg-primary/10 text-primary",
          tone === "emerald" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          tone === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
    <p className="mt-2 font-heading text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const EarningsPage = () => {
  const { data, loading, error, refetch, months, setMonths } = useEarnings(6);

  if (loading && !data) {
    return (
      <PageContainer className="space-y-6 py-6 sm:py-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer className="py-6 sm:py-8">
        <ErrorState title="Unable to load your earnings" description={error} onRetry={refetch} />
      </PageContainer>
    );
  }

  const { summary, monthly, recentSales } = data;
  const hasActivity = summary.totalOrders > 0 || summary.totalPickups > 0;

  return (
    <PageContainer className="space-y-6 py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            <Wallet className="h-5 w-5 text-primary" />
            Earnings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What you earned selling recovered material, minus what you paid at pickup.
          </p>
        </div>

        <div className="flex shrink-0 gap-1.5">
          {RANGES.map((r) => (
            <Button
              key={r.months}
              variant={months === r.months ? "default" : "outline"}
              size="sm"
              onClick={() => setMonths(r.months)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={TrendingUp}
          label="Net earnings"
          value={formatCurrency(summary.netEarnings)}
          hint="Lifetime, income minus payouts"
          tone={summary.netEarnings >= 0 ? "emerald" : "amber"}
        />
        <StatTile
          icon={ArrowUpRight}
          label="Sales income"
          value={formatCurrency(summary.totalIncome)}
          hint={`${formatNumber(summary.totalOrders)} orders`}
          tone="emerald"
        />
        <StatTile
          icon={ArrowDownLeft}
          label="Paid at pickup"
          value={formatCurrency(summary.totalPayouts)}
          hint={`${formatNumber(summary.totalPickups)} completed pickups`}
          tone="amber"
        />
        <StatTile
          icon={IndianRupee}
          label="This month"
          value={formatCurrency(summary.thisMonthIncome)}
          hint={`Net ${formatCurrency(summary.thisMonthNet)}`}
        />
      </div>

      {/* Trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-base font-semibold text-foreground">Income vs payouts</h2>
        <p className="text-xs text-muted-foreground">Month by month over the selected range</p>

        <div className="mt-4 h-72 w-full">
          {!hasActivity ? (
            <EmptyState
              icon={Wallet}
              title="No earnings yet"
              description="Complete a pickup and sell recovered material to start tracking your earnings."
              className="py-10"
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C6E49" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#2C6E49" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="earningsPayouts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D68C45" stopOpacity={0.75} />
                    <stop offset="95%" stopColor="#D68C45" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "currentColor" }} />
                <YAxis tick={{ fontSize: 11, fill: "currentColor" }} />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="income" name="Sales income" fill="url(#earningsIncome)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payouts" name="Paid at pickup" fill="url(#earningsPayouts)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Recent sales</h2>
            <p className="text-xs text-muted-foreground">
              {summary.pendingOrders > 0
                ? `${formatNumber(summary.pendingOrders)} order(s) still awaiting confirmation`
                : "Your latest confirmed marketplace orders"}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/marketplace/orders">All orders</Link>
          </Button>
        </div>

        {recentSales.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No sales yet"
            description="Once a buyer confirms an order, it shows up here."
            className="py-10"
          />
        ) : (
          <div className="mt-4 space-y-2.5">
            {recentSales.map((sale) => (
              <Link
                key={sale.id}
                to={`/marketplace/orders/${sale.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3.5 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{sale.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {sale.createdAt ? formatFriendlyDate(sale.createdAt) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={sale.status} />
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(sale.amount)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default EarningsPage;

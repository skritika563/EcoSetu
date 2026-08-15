/**
 * ImpactChart — monthly trend with a metric switcher.
 *
 * Uses recharts, which was already a project dependency (unused until now), so
 * no new charting library enters the bundle. The page is lazy-loaded, so the
 * chart weight only lands when someone opens the dashboard.
 *
 * Accessibility: the chart is mirrored by a visually-hidden data table, so the
 * numbers are available to screen readers rather than locked inside an SVG.
 */

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const METRICS = {
  waste: {
    label: "Waste",
    dataKey: "wasteRecycled",
    axisLabel: "Waste recycled per month",
    format: (v) => `${formatNumber(v, { decimals: 1 })} kg`,
  },
  activities: {
    label: "Eco Activities",
    dataKey: "activities",
    axisLabel: "Eco activities per month",
    format: (v) => `${formatNumber(v)} activities`,
  },
  points: {
    label: "Eco Points",
    dataKey: "ecoPoints",
    axisLabel: "Eco Points earned per month",
    format: (v) => `${formatNumber(v)} pts`,
  },
};

const ChartTooltip = ({ active, payload, label, metric }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl bg-foreground px-3 py-2 text-xs text-background shadow-md">
      <p className="font-semibold">{label}</p>
      <p className="mt-0.5 opacity-90">{metric.format(payload[0].value)}</p>
    </div>
  );
};

const ImpactChart = ({ months = [], className }) => {
  const [metricKey, setMetricKey] = useState("waste");
  const metric = METRICS[metricKey];

  const data = months.map((m) => ({
    name: m.shortMonth,
    month: m.month,
    wasteRecycled: m.wasteRecycled,
    activities: m.activities,
    ecoPoints: m.ecoPoints,
  }));

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Your Impact Over Time
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{metric.axisLabel}</p>
        </div>

        <Tabs value={metricKey} onValueChange={setMetricKey}>
          <TabsList aria-label="Choose the metric to chart">
            {Object.entries(METRICS).map(([key, m]) => (
              <TabsTrigger key={key} value={key}>
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="impact-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ecosetu-secondary)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--ecosetu-secondary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <RechartsTooltip
              content={<ChartTooltip metric={metric} />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey={metric.dataKey}
              stroke="var(--ecosetu-primary)"
              strokeWidth={2}
              fill="url(#impact-fill)"
              dot={{ r: 2.5, fill: "var(--ecosetu-primary)", strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader equivalent of the chart */}
      <table className="sr-only">
        <caption>{metric.axisLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">{metric.label}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.month}</th>
              <td>{metric.format(row[metric.dataKey])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default ImpactChart;

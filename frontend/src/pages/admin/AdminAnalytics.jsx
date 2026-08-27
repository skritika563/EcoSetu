/**
 * AdminAnalytics — high-fidelity reports and analytics dashboard with interactive charts.
 */
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import StatCard from "@/components/admin/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Scale,
  Leaf,
  DollarSign,
  Truck,
  TrendingUp,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#2C6E49",
  "#4C956C",
  "#D68C45",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
  "#6366F1",
];

const AdminAnalytics = () => {
  const { analytics, impact, period, setPeriod } = useAdminAnalytics();

  const data = analytics.data;
  const env = impact.data;

  return (
    <div className="space-y-8">
      {/* Header with Period Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform performance metrics, user growth, scrap distribution, and environmental impact
          </p>
        </div>

        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      {/* Environmental Impact Banner Stats */}
      {impact.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : env ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Scrap Recycled"
            value={env.totalScrapRecycledKg}
            icon={Scale}
            color="primary"
            suffix=" kg"
            decimals={1}
          />
          <StatCard
            label="CO₂ Saved"
            value={env.totalCo2SavedKg}
            icon={Leaf}
            color="emerald"
            suffix=" kg"
            decimals={1}
          />
          <StatCard
            label="Total Eco Points"
            value={env.totalEcoPoints}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            label="Completed Pickups"
            value={env.totalCompletedPickups}
            icon={Truck}
            color="amber"
          />
        </div>
      ) : null}

      {/* Analytics Charts Grid */}
      {analytics.loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : analytics.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {analytics.error}
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* 1. Scrap Volume Over Time */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Scrap Collected (kg)
              </h3>
              <p className="text-xs text-muted-foreground">Historical scrap volume gathered</p>
            </div>
            <div className="h-64 w-full">
              {data.scrapOverTime?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.scrapOverTime}>
                    <defs>
                      <linearGradient id="scrapColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2C6E49" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2C6E49" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="weightKg"
                      name="Weight (kg)"
                      stroke="#2C6E49"
                      fillOpacity={1}
                      fill="url(#scrapColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No data for this time period
                </div>
              )}
            </div>
          </div>

          {/* 2. User Growth Over Time */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                New User Registrations
              </h3>
              <p className="text-xs text-muted-foreground">Daily platform user sign-ups</p>
            </div>
            <div className="h-64 w-full">
              {data.userGrowth?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="New Users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No data for this time period
                </div>
              )}
            </div>
          </div>

          {/* 3. Scrap Category Breakdown */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Scrap by Category
              </h3>
              <p className="text-xs text-muted-foreground">Total volume per material type</p>
            </div>
            <div className="h-64 w-full">
              {data.scrapByCategory?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.scrapByCategory}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => val?.replace(/_/g, " ")}
                      width={80}
                    />
                    <Tooltip />
                    <Bar dataKey="weightKg" name="Weight (kg)" fill="#4C956C" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* 4. Users by Role (Pie) */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Users by Role
              </h3>
              <p className="text-xs text-muted-foreground">Community composition</p>
            </div>
            <div className="h-64 w-full">
              {data.usersByRole?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.usersByRole}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ role, percent }) =>
                        `${role} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {data.usersByRole.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No user data
                </div>
              )}
            </div>
          </div>

          {/* 5. Pickup Volume (Total vs Completed) */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Pickup Request Volume
              </h3>
              <p className="text-xs text-muted-foreground">Daily requests vs completed jobs</p>
            </div>
            <div className="h-64 w-full">
              {data.pickupVolume?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.pickupVolume}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="total" name="Total Requested" fill="#D68C45" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#2C6E49" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No pickup volume for this period
                </div>
              )}
            </div>
          </div>

          {/* 6. CO2 Saved Over Time */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Estimated CO₂ Saved (kg)
              </h3>
              <p className="text-xs text-muted-foreground">Environmental impact over time</p>
            </div>
            <div className="h-64 w-full">
              {data.co2OverTime?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.co2OverTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="co2SavedKg"
                      name="CO₂ Saved (kg)"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  No data for this time period
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminAnalytics;

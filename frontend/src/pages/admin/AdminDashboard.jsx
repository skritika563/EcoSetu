/**
 * AdminDashboard — comprehensive platform overview with animated stat cards,
 * user category breakdown visuals, mini weekly pickup & scrap distribution graphs,
 * and live activity stream.
 */
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  Truck,
  CheckCircle2,
  Scale,
  Leaf,
  Package,
  ShoppingBag,
  Megaphone,
  TrendingUp,
  Building2,
  School,
  GraduationCap,
  Home,
  Shield,
  BarChart2,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import StatCard from "@/components/admin/StatCard";
import ActivityFeed from "@/components/admin/ActivityFeed";
import useAdminDashboard from "@/hooks/useAdminDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const USER_TYPE_ICONS = {
  household: Home,
  ngo: Building2,
  school: School,
  university: GraduationCap,
  collector: Truck,
  admin: Shield,
};

const CATEGORY_COLORS = ["#2C6E49", "#4C956C", "#D68C45", "#3B82F6", "#8B5CF6", "#EC4899"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const AdminDashboard = () => {
  const { stats, activity } = useAdminDashboard();
  const data = stats.data;

  const statCards = data
    ? [
        { label: "Total Users", value: data.totalUsers, icon: Users, color: "blue" },
        { label: "Active Users", value: data.activeUsers, icon: UserCheck, color: "emerald" },
        { label: "Total Pickups", value: data.totalPickups, icon: Truck, color: "amber" },
        { label: "Completed Pickups", value: data.completedPickups, icon: CheckCircle2, color: "primary" },
        { label: "Scrap Collected", value: data.totalScrapCollectedKg, icon: Scale, color: "teal", suffix: " kg", decimals: 1 },
        { label: "Total Eco Points", value: data.totalEcoPoints, icon: Leaf, color: "emerald" },
        { label: "Marketplace Listings", value: data.marketplaceListings, icon: Package, color: "purple" },
        { label: "Marketplace Orders", value: data.marketplaceOrders, icon: ShoppingBag, color: "orange" },
        { label: "Active Campaigns", value: data.activeCampaigns, icon: Megaphone, color: "cyan" },
      ]
    : [];

  const userBreakdown = data?.userTypeBreakdown || [];
  const totalUsersCount = data?.totalUsers || 1;
  const weeklyPickups = data?.weeklyPickupTrend || [];
  const categoryDist = data?.categoryDistribution || [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Admin Executive Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics, user ecosystem breakdown, and live platform operations
        </p>
      </motion.div>

      {/* ── Visual Section: User Type / Category Breakdown Cards (Placed at the Top) ── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Community & Stakeholder Breakdown
            </h2>
            <p className="text-xs text-muted-foreground">
              User distribution and active participation by stakeholder category
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex border-primary/30 text-primary">
            {data?.totalUsers ?? 0} Total Registered
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.loading
            ? Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))
            : userBreakdown.map((item) => {
                const IconComponent = USER_TYPE_ICONS[item.key] || Users;
                const percentage = totalUsersCount > 0 ? Math.round((item.count / totalUsersCount) * 100) : 0;

                return (
                  <motion.div
                    key={item.key}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                    className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${item.color}15`, color: item.color }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-heading text-sm font-semibold text-foreground">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.activeCount} active this month
                          </p>
                        </div>
                      </div>
                      <span className="font-heading text-xl font-bold text-foreground">
                        {item.count}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Share of platform</span>
                        <span className="font-semibold text-foreground">{percentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(percentage, item.count > 0 ? 5 : 0)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Footer stats if available */}
                    {item.ecoPoints > 0 && (
                      <div className="mt-2.5 flex items-center justify-between border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
                        <span>Eco Points: {item.ecoPoints.toLocaleString()}</span>
                        {item.weightKg > 0 && <span>{item.weightKg} kg recycled</span>}
                      </div>
                    )}
                  </motion.div>
                );
              })}
        </div>
      </motion.div>

      {/* ── Section: Platform Key Metrics (9 Stat Cards) ── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Platform Key Metrics
          </h2>
          <p className="text-xs text-muted-foreground">
            Aggregate volumes across users, pickups, scrap collection, marketplace, and drives
          </p>
        </div>

        {stats.loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : stats.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {stats.error}
          </div>
        ) : (
          <motion.div variants={containerVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <motion.div
                key={card.label}
                variants={itemVariants}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <StatCard {...card} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>


      {/* ── Graphs Grid: Weekly Pickups Trend + Top Scrap Category Distribution ── */}
      <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-2">
        {/* Graph 1: Weekly Pickups (Requested vs Completed) */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary" /> Pickup Activity (Last 7 Days)
              </h3>
              <p className="text-xs text-muted-foreground">Daily incoming requests vs fulfilled pickups</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Weekly Flow
            </Badge>
          </div>

          <div className="h-64 w-full">
            {stats.loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : weeklyPickups.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyPickups} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weeklyRequestedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D68C45" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#D68C45" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="weeklyCompletedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2C6E49" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#2C6E49" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="total" name="Requested" fill="url(#weeklyRequestedColor)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="url(#weeklyCompletedColor)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No pickup requests logged in the last 7 days
              </div>
            )}
          </div>
        </div>

        {/* Graph 2: Top Scrap Categories by Volume */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-emerald-600" /> Top Scrap Materials Collected
              </h3>
              <p className="text-xs text-muted-foreground">Category-wise volume gathered across all completed pickups</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Materials
            </Badge>
          </div>

          <div className="h-64 w-full">
            {stats.loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryDist}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    {categoryDist.map((_, index) => {
                      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                      return (
                        <linearGradient key={`catColor-${index}`} id={`catColor-${index}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor={color} stopOpacity={0.75} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.15} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor" }} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} kg`, "Collected"]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="weightKg" name="Weight (kg)" radius={[0, 4, 4, 0]}>
                    {categoryDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#catColor-${index})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No completed pickups to compute material breakdown
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Live Platform Activity Feed ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border/60 bg-card p-6 shadow-xs transition-shadow hover:shadow-md"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">
              Live Platform Activity Stream
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time feed of registrations, pickup updates, marketplace trades, and drives
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
            Realtime
          </Badge>
        </div>

        <ActivityFeed
          activities={activity.data || []}
          loading={activity.loading}
        />
        {activity.error && (
          <p className="mt-2 text-sm text-red-600">{activity.error}</p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;

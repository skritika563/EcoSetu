/**
 * ActivityFeed — recent platform activity list for admin dashboard.
 */
import { motion } from "framer-motion";
import {
  UserPlus,
  Truck,
  Package,
  ShoppingBag,
  Megaphone,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ICON_MAP = {
  "user-plus": UserPlus,
  truck: Truck,
  package: Package,
  "shopping-bag": ShoppingBag,
  megaphone: Megaphone,
};

const TYPE_COLORS = {
  user_registered: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  pickup_pending: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  pickup_completed: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  pickup_collector_assigned: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  pickup_on_the_way: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  pickup_in_progress: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
  pickup_cancelled: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  listing_created: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  purchase_completed: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  campaign_created: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
};

const ActivityFeed = ({ activities = [], loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-lg bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2.5 w-1/3 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((item, i) => {
        const IconComponent = ICON_MAP[item.icon] || Activity;
        const colorClass = TYPE_COLORS[item.type] || "bg-muted text-muted-foreground";

        return (
          <motion.div
            key={`${item.type}-${item.timestamp}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/30"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-snug">{item.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;

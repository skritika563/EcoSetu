/**
 * StatusBadge — colored badge for statuses (pickups, orders, campaigns, users).
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  // Pickup / order
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  collector_assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  on_the_way: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  in_progress: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ready: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  shipped: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",

  // Product
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  sold: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",

  // Campaign
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",

  // Payment
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  unpaid: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  donated: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const STATUS_LABELS = {
  collector_assigned: "Assigned",
  on_the_way: "On the Way",
  in_progress: "In Progress",
};

const StatusBadge = ({ status, className }) => {
  const style = STATUS_STYLES[status] || "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[status] || status?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge variant="outline" className={cn("border-0 text-[11px] font-semibold", style, className)}>
      {label}
    </Badge>
  );
};

export default StatusBadge;

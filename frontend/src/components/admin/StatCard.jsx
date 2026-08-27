/**
 * StatCard — animated statistic card for the admin dashboard.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

const StatCard = ({ label, value, icon: Icon, color = "primary", prefix = "", suffix = "", decimals = 0 }) => {
  const displayValue = useCountUp(typeof value === "number" ? value : 0, { decimals });

  const colorMap = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/30",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300/30",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/30",
    red: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-300/30",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300/30",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300/30",
    teal: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300/30",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4.5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-110",
              colorMap[color] ?? colorMap.primary
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
      <p className="mt-2.5 font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {prefix}{displayValue}{suffix}
      </p>
    </motion.div>
  );
};

export default StatCard;

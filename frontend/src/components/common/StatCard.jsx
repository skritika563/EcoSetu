/**
 * StatCard — a single metric tile.
 *
 * Deliberately restrained: one border, no gradient, no coloured background.
 * The icon carries the colour so a row of four tiles reads as one system
 * rather than four competing cards.
 */

import { motion } from "framer-motion";

import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

const StatCard = ({
  label,
  value,
  format,
  icon: Icon,
  iconClassName,
  hint,
  animate = true,
  delay = 0,
}) => {
  const display = useCountUp(value, { enabled: animate, format });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
              iconClassName
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <div className="mt-2 font-heading text-2xl font-semibold tabular-nums text-foreground">
        {display}
      </div>

      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </motion.div>
  );
};

export default StatCard;

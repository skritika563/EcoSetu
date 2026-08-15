/**
 * ProgressBar — thin, token-coloured progress indicator.
 *
 * Used for job progress and campaign goals. Animates its width once on mount
 * rather than continuously.
 */

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const ProgressBar = ({ value = 0, max = 100, className, barClassName, label }) => {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn("h-full rounded-full bg-primary", barClassName)}
      />
    </div>
  );
};

export default ProgressBar;

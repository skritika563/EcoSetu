/**
 * EcoPointsShowcase — the tall, third-column card in the Sustainability
 * Dashboard's impact grid: Eco Points shown large, with an animated
 * money-bag illustration filling the rest of the card below it.
 *
 * Deliberately its own component rather than another StatCard — it needs a
 * much bigger number and a full illustration area, neither of which
 * StatCard's compact layout is built for.
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { useCountUp } from "@/hooks/useCountUp";
import { formatNumber } from "@/lib/format";
import MoneyBagAnimation from "@/components/sustainability/MoneyBagAnimation";

const EcoPointsShowcase = ({ value, delay = 0 }) => {
  const display = useCountUp(value, { format: (n) => formatNumber(Math.round(n)) });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="flex h-full flex-col rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Eco Points
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <Sparkles className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-2 font-heading text-5xl font-bold tabular-nums text-foreground sm:text-6xl">
        {display}
      </div>
      <Link to="/rewards" className="mt-1 text-xs text-muted-foreground hover:text-primary hover:underline">
        Redeemable in Rewards
      </Link>

      <MoneyBagAnimation className="mt-2 flex min-h-0 flex-1 items-center justify-center" />
    </motion.div>
  );
};

export default EcoPointsShowcase;

/**
 * EcoStreak — consecutive days with an eco-positive action.
 *
 * Compact by design: a number, a sentence, and the week at a glance. The day
 * markers carry text labels and aria-labels rather than relying on colour
 * alone.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check, Flame } from "lucide-react";

import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const EcoStreak = ({ streak, className }) => {
  const prefersReducedMotion = useReducedMotion();

  const current = streak?.current ?? 0;
  const longest = streak?.longest ?? 0;
  const week = streak?.week ?? Array(7).fill(false);

  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
      aria-label="Eco streak"
    >
      <h2 className="font-heading text-base font-semibold text-foreground">Current Eco Streak</h2>

      <div className="mt-3 flex items-center gap-3">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            current > 0 ? "bg-ecosetu-orange/15 text-ecosetu-orange" : "bg-muted text-muted-foreground"
          )}
        >
          <Flame className="h-5 w-5" />
        </span>

        <div className="min-w-0">
          <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
            {current} {current === 1 ? "day" : "days"}
          </p>
          <p className="text-sm text-muted-foreground">
            {current > 0
              ? `You've taken an eco-positive action ${current} days in a row.`
              : "Take an eco action today to start a streak."}
          </p>
        </div>
      </div>

      <ul className="mt-5 flex items-center justify-between gap-1">
        {week.map((done, i) => (
          <li key={DAY_LABELS[i]} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.span
              initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
              aria-hidden="true"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                done
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-dashed border-border text-muted-foreground/50"
              )}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={2.6} /> : "–"}
            </motion.span>
            <span className="text-[11px] text-muted-foreground">
              <span className="sr-only">
                {DAY_FULL[i]}: {done ? "active" : "no activity"}
              </span>
              <span aria-hidden="true">{DAY_LABELS[i]}</span>
            </span>
          </li>
        ))}
      </ul>

      {longest > 0 && (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Longest streak this year:{" "}
          <span className="font-medium text-foreground">{longest} days</span>
        </p>
      )}
    </section>
  );
};

export default EcoStreak;

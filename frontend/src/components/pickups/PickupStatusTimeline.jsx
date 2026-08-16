/**
 * PickupStatusTimeline — the 5-step visual journey of a pickup.
 *
 * Request Sent → Collector Assigned → Collector On The Way → Pickup Started →
 * Completed. Distinguishes completed / current / upcoming steps by shape AND
 * label (never colour alone), so it reads correctly without colour vision.
 *
 * Horizontal stepper on tablet/desktop, vertical on mobile — a 5-node
 * horizontal row doesn't fit a phone screen without becoming illegible.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Ban } from "lucide-react";

import { PICKUP_TIMELINE_STEPS, getTimelineIndex } from "@/config/pickups";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const stepState = (index, currentIndex) =>
  index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";

const circleClasses = (state, size = "h-9 w-9") =>
  cn(
    "flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
    size,
    state === "done" && "border-primary bg-primary text-primary-foreground",
    state === "current" && "border-primary bg-primary/10 text-primary",
    state === "upcoming" && "border-border bg-muted text-muted-foreground"
  );

const PickupStatusTimeline = ({ status, statusHistory = [], cancellation, className }) => {
  const prefersReducedMotion = useReducedMotion();

  if (cancellation) {
    return (
      <div
        className={cn("rounded-xl border border-destructive/25 bg-destructive/5 p-4", className)}
        role="status"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Ban className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Pickup cancelled</p>
            <p className="text-xs text-muted-foreground">
              {cancellation.reason} · {formatRelativeTime(cancellation.cancelledAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = getTimelineIndex(status);
  const historyAt = Object.fromEntries(statusHistory.map((h) => [h.status, h.at]));
  const stepDelay = (index) => (prefersReducedMotion ? 0 : index * 0.08);

  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4 sm:p-5", className)}
      role="list"
      aria-label="Pickup status timeline"
    >
      {/* Tablet / desktop — horizontal */}
      <div className="hidden sm:flex sm:items-start">
        {PICKUP_TIMELINE_STEPS.map((step, index) => {
          const state = stepState(index, currentIndex);
          const Icon = step.icon;
          const at = historyAt[step.status];

          return (
            <div key={step.status} role="listitem" className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    "h-px flex-1",
                    index === 0 ? "opacity-0" : state === "upcoming" ? "bg-border" : "bg-primary"
                  )}
                />
                <motion.span
                  initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: stepDelay(index) }}
                  className={circleClasses(state)}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <Icon className="h-4 w-4" />
                </motion.span>
                <div
                  className={cn(
                    "h-px flex-1",
                    index === PICKUP_TIMELINE_STEPS.length - 1
                      ? "opacity-0"
                      : state === "done"
                        ? "bg-primary"
                        : "bg-border"
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {step.label}
              </p>
              {at && <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeTime(at)}</p>}
            </div>
          );
        })}
      </div>

      {/* Mobile — vertical */}
      <div className="flex flex-col sm:hidden">
        {PICKUP_TIMELINE_STEPS.map((step, index) => {
          const state = stepState(index, currentIndex);
          const Icon = step.icon;
          const at = historyAt[step.status];
          const isLast = index === PICKUP_TIMELINE_STEPS.length - 1;

          return (
            <div key={step.status} role="listitem" className="flex gap-3">
              <div className="flex flex-col items-center">
                <motion.span
                  initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: stepDelay(index) }}
                  className={circleClasses(state, "h-8 w-8")}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                </motion.span>
                {!isLast && (
                  <div
                    className={cn("min-h-6 w-px flex-1", state === "done" ? "bg-primary" : "bg-border")}
                  />
                )}
              </div>
              <div className={isLast ? "pb-0" : "pb-5"}>
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {step.label}
                </p>
                {at && <p className="text-xs text-muted-foreground">{formatRelativeTime(at)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PickupStatusTimeline;

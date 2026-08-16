/**
 * Pickup domain config — status timeline, tab filters, type/payment labels.
 *
 * Waste categories and generic status badges already live in config/domain.js
 * and are reused here; this file owns only what is specific to the pickup
 * lifecycle, so the two never duplicate each other.
 *
 * Status flow (DATABASE_SCHEMA.md §Pickup Statuses, extended with a UI-only
 * `in_progress` sub-state for "collector is on-site weighing scrap" — the
 * stored record stays `on_the_way` until verification completes):
 *
 *   pending → collector_assigned → on_the_way → in_progress → completed
 *                                                            ↘ cancelled (any point)
 */

import { CalendarClock, CheckCircle2, PackageSearch, Truck, UserCheck } from "lucide-react";

/* ─── Status timeline (Pickup Details page) ──────────────────────────────── */
export const PICKUP_TIMELINE_STEPS = [
  { status: "pending", label: "Request Sent", icon: CalendarClock },
  { status: "collector_assigned", label: "Collector Assigned", icon: UserCheck },
  { status: "on_the_way", label: "Collector On The Way", icon: Truck },
  { status: "in_progress", label: "Pickup Started", icon: PackageSearch },
  { status: "completed", label: "Completed", icon: CheckCircle2 },
];

const TIMELINE_ORDER = PICKUP_TIMELINE_STEPS.map((s) => s.status);

/** Index of a status in the timeline; -1 for cancelled/unknown (no position). */
export const getTimelineIndex = (status) => TIMELINE_ORDER.indexOf(status);

/** True once a pickup has left the "can still be cancelled by the user" window. */
export const isPickupActive = (status) => status === "on_the_way" || status === "in_progress";
export const isPickupUpcoming = (status) => status === "pending" || status === "collector_assigned";
export const isPickupTerminal = (status) => status === "completed" || status === "cancelled";

/* ─── Pickup type ─────────────────────────────────────────────────────────── */
export const PICKUP_TYPES = {
  scheduled: { label: "Scheduled", description: "Free — collector visits on your chosen slot" },
  instant: { label: "Instant", description: "Priority pickup within hours — platform fee applies" },
};

/* ─── Payment status ─────────────────────────────────────────────────────── */
export const PAYMENT_STATUS = {
  pending: { label: "Pending", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  processing: { label: "Processing", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  paid: { label: "Paid", tone: "bg-primary/10 text-primary" },
  donated: { label: "Donated", tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
};

export const getPaymentStatus = (key) => PAYMENT_STATUS[key] ?? PAYMENT_STATUS.pending;

/* ─── General user pickup list tabs ──────────────────────────────────────── */
export const USER_PICKUP_TABS = [
  { value: "upcoming", label: "Upcoming", filter: (p) => isPickupUpcoming(p.status) },
  { value: "active", label: "Active", filter: (p) => isPickupActive(p.status) },
  { value: "completed", label: "Completed", filter: (p) => p.status === "completed" },
  { value: "cancelled", label: "Cancelled", filter: (p) => p.status === "cancelled" },
];

/* ─── Collector job list tabs ─────────────────────────────────────────────── */
export const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Collectors also accept jobs, so the tab set is built around that workflow
 * rather than a plain date/status split:
 *
 *   Upcoming — jobs already accepted, not yet finished. Sorted date-ascending
 *              by the page, so today's jobs surface first without a separate
 *              "today" filter.
 *   Requests — pending pickups nobody has accepted yet: what a collector
 *              searches to find new work.
 *   History  — everything finished, completed or cancelled, most recent 30.
 *
 * Every job returned by getJobsForCollector() (pending-unassigned, or
 * assigned to "you") falls into exactly one bucket — nothing is dropped.
 */
export const COLLECTOR_JOB_TABS = [
  {
    value: "upcoming",
    label: "Upcoming",
    filter: (job) => !!job.collector && !isPickupTerminal(job.status),
  },
  {
    value: "requests",
    label: "Requests",
    filter: (job) => job.status === "pending" && !job.collector,
  },
  {
    value: "history",
    label: "History",
    filter: (job) => isPickupTerminal(job.status),
  },
];

/** How many most-recent records the History tab keeps in view. */
export const HISTORY_LIMIT = 30;

/* ─── Collector job primary action per status ────────────────────────────── */
export const getJobPrimaryAction = (status) => {
  switch (status) {
    case "pending":
      return "accept";
    case "collector_assigned":
      return "navigate";
    case "on_the_way":
      return "start";
    case "in_progress":
      return "verify";
    default:
      return "view";
  }
};

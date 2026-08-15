/**
 * Domain display config — maps backend string keys to UI presentation.
 *
 * Mock data (and later, API responses) only carry keys like "plastic" or
 * "on_the_way". Everything visual — label, icon, colour tone — is decided here,
 * so a change of wording or icon never means touching a data file or a screen.
 *
 * Waste categories mirror PROJECT_SPEC.md; statuses mirror DATABASE_SCHEMA.md.
 */

import {
  Package,
  Wrench,
  Newspaper,
  Box,
  Layers,
  Cpu,
  TreePine,
  Sparkles,
  Trash2,
} from "lucide-react";

/* ─── Waste categories ───────────────────────────────────────────────────────
 * `tint` styles the icon chip; `bar` fills data bars. Charting every category
 * in the same brand green made breakdowns unreadable — each category now owns
 * one hue, used consistently wherever that category appears. Held at 70%
 * opacity so a stack of bars reads as a muted set rather than a colour clash.
 */
export const WASTE_CATEGORIES = {
  plastic: { label: "Plastic", icon: Package, tint: "text-sky-600 dark:text-sky-400 bg-sky-500/10", bar: "bg-sky-500/70" },
  metal: { label: "Metal", icon: Wrench, tint: "text-slate-600 dark:text-slate-300 bg-slate-500/10", bar: "bg-slate-400/70" },
  paper: { label: "Paper", icon: Newspaper, tint: "text-amber-600 dark:text-amber-400 bg-amber-500/10", bar: "bg-amber-500/70" },
  cardboard: { label: "Cardboard", icon: Box, tint: "text-orange-600 dark:text-orange-400 bg-orange-500/10", bar: "bg-orange-500/70" },
  glass: { label: "Glass", icon: Layers, tint: "text-teal-600 dark:text-teal-400 bg-teal-500/10", bar: "bg-teal-500/70" },
  "e-waste": { label: "E-Waste", icon: Cpu, tint: "text-violet-600 dark:text-violet-400 bg-violet-500/10", bar: "bg-violet-500/70" },
  wooden: { label: "Wooden Scraps", icon: TreePine, tint: "text-emerald-700 dark:text-emerald-400 bg-emerald-600/10", bar: "bg-emerald-600/70" },
  decorations: { label: "Decorations", icon: Sparkles, tint: "text-pink-600 dark:text-pink-400 bg-pink-500/10", bar: "bg-pink-400/70" },
  mixed: { label: "Mixed Waste", icon: Trash2, tint: "text-muted-foreground bg-muted", bar: "bg-muted-foreground/50" },
};

export const getCategory = (key) => WASTE_CATEGORIES[key] ?? WASTE_CATEGORIES.mixed;

/* ─── Status tones ───────────────────────────────────────────────────────── */
const TONES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  success: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
};

const STATUS_MAP = {
  pending: { label: "Pending", tone: "warning" },
  accepted: { label: "Accepted", tone: "info" },
  assigned: { label: "Collector assigned", tone: "info" },
  on_the_way: { label: "On the way", tone: "info" },
  collected: { label: "Collected", tone: "success" },
  delivered: { label: "Delivered", tone: "success" },
  completed: { label: "Completed", tone: "success" },
  approved: { label: "Approved", tone: "success" },
  active: { label: "Active", tone: "success" },
  upcoming: { label: "Upcoming", tone: "info" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const getStatus = (key) => {
  const entry = STATUS_MAP[key] ?? { label: key ?? "Unknown", tone: "neutral" };
  return { label: entry.label, className: TONES[entry.tone] };
};

/* ─── Organization wording ───────────────────────────────────────────────── */
/**
 * Household / NGO / school / university share one product — only wording shifts.
 * `noun` is used as a standalone label; `sentenceNoun` reads correctly mid-sentence
 * (an acronym stays uppercase, ordinary nouns go lowercase).
 */
export const ORGANIZATION_LABELS = {
  ngo: { noun: "NGO", sentenceNoun: "NGO", campaignWord: "drive" },
  school: { noun: "School", sentenceNoun: "school", campaignWord: "drive" },
  university: { noun: "University", sentenceNoun: "university", campaignWord: "campaign" },
};

const DEFAULT_ORGANIZATION_LABEL = {
  noun: "Organization",
  sentenceNoun: "organization",
  campaignWord: "campaign",
};

export const getOrganizationLabel = (organizationType) =>
  ORGANIZATION_LABELS[organizationType] ?? DEFAULT_ORGANIZATION_LABEL;

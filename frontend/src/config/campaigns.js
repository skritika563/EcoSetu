/**
 * Campaigns domain config — types, categories, tabs, filters.
 *
 * Same role as config/marketplace.js: the backend only ever carries string
 * keys ("waste_collection", "e-waste"); every label, icon and tone is
 * decided here so wording changes never touch a screen or a data file.
 *
 * TYPE vs CATEGORY — two different vocabularies (mirrors
 * models/Campaign.js's own header comment):
 *   `campaignType` is what KIND of drive this is — chosen first, on
 *   CampaignForm, and it decides which further fields apply at all.
 *   `categories` is WHICH materials a collection-type drive targets
 *   (multiple can apply); only meaningful for the two COLLECTION_TYPES.
 *
 * STATUS deliberately reuses config/domain.js's shared STATUS_MAP (and
 * StatusBadge) rather than a second one — active/upcoming/completed/
 * cancelled/draft already live there; campaigns don't have a vocabulary
 * divergent enough to need their own, the way Marketplace's did.
 */

import { Cpu, Package, Wrench, Layers, Newspaper, Sprout, Trash2, Megaphone, Boxes, Recycle, Store, Sparkles } from "lucide-react";

/* ─── Campaign types ─────────────────────────────────────────────────────── */
/**
 * `cardBg` is the CampaignForm type-picker's own resting/hover background.
 * Most types mix an EcoSetu brand token into the theme's own `--card`;
 * plantation_drive (lavender/purple) and awareness_campaign (yellow) use
 * literal Tailwind swatches instead since the brand palette has no
 * purple/yellow token — three of the six brand colours are greens by
 * design (an eco brand), and green/green/green/orange/peach/grey left
 * plantation and awareness too close to their neighbours, so these two
 * intentionally break from the brand palette for contrast.
 *
 * MIXED INTO `--card`, NOT `transparent`: color-mix()-ing a low-opacity
 * hue into "transparent" reads fine on a near-white card in light mode,
 * but on dark mode's near-black card the same low-alpha tint gets
 * swallowed — every type ends up looking like the same dark card with a
 * barely-there wash. Mixing into the theme's own `--card` token instead
 * (defined for both themes) shifts the card's actual colour toward the
 * target hue, so the tint survives at the SAME visible strength in both
 * themes rather than only in light mode.
 *
 * PER-THEME HUE, NOT JUST PER-THEME OPACITY: plantation_drive and
 * awareness_campaign go further and swap the literal swatch itself
 * between light/dark (`dark:bg-[...]`) — a lighter, more saturated
 * lavender/yellow shade in dark mode reads far better against a near-
 * black card than the same light-mode shade would, whereas the brand-
 * token types only need a stronger MIX PERCENTAGE (not a different
 * colour) since --card already carries the theme swing for them.
 *
 * Kept as full literal class strings (not built from a template at
 * runtime) because Tailwind's build-time scanner needs to see the exact
 * string to generate CSS for it.
 */
export const CAMPAIGN_TYPES = {
  waste_collection: {
    label: "Waste Collection Drive",
    icon: Recycle,
    tint: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
    cardBg: "bg-[color-mix(in_oklab,var(--ecosetu-primary)_14%,var(--card))] hover:bg-[color-mix(in_oklab,var(--ecosetu-primary)_26%,var(--card))]",
    description: "Collect sorted scrap materials toward a weight target.",
  },
  cleaning_drive: {
    label: "Cleaning Drive",
    icon: Trash2,
    tint: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    cardBg: "bg-[color-mix(in_oklab,var(--ecosetu-orange)_14%,var(--card))] hover:bg-[color-mix(in_oklab,var(--ecosetu-orange)_26%,var(--card))]",
    description: "A hands-on cleanup of a public space, collecting litter and waste on-site.",
  },
  plantation_drive: {
    label: "Plantation Drive",
    icon: Sprout,
    tint: "text-violet-600 dark:text-violet-300 bg-violet-500/10",
    cardBg:
      "bg-[color-mix(in_oklab,#a78bfa_20%,var(--card))] hover:bg-[color-mix(in_oklab,#a78bfa_34%,var(--card))] dark:bg-[color-mix(in_oklab,#c4b5fd_30%,var(--card))] dark:hover:bg-[color-mix(in_oklab,#c4b5fd_44%,var(--card))]",
    description: "Planting saplings or trees — no scrap collection involved.",
  },
  awareness_campaign: {
    label: "Awareness Campaign",
    icon: Megaphone,
    tint: "text-amber-600 dark:text-yellow-300 bg-amber-500/10",
    cardBg:
      "bg-[color-mix(in_oklab,#facc15_20%,var(--card))] hover:bg-[color-mix(in_oklab,#facc15_34%,var(--card))] dark:bg-[color-mix(in_oklab,#fde047_28%,var(--card))] dark:hover:bg-[color-mix(in_oklab,#fde047_42%,var(--card))]",
    description: "A meetup with stalls and activities to spread awareness on a cause.",
  },
  exhibition: {
    label: "Exhibition",
    icon: Store,
    tint: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
    cardBg: "bg-[color-mix(in_oklab,var(--ecosetu-accent)_30%,var(--card))] hover:bg-[color-mix(in_oklab,var(--ecosetu-accent)_44%,var(--card))]",
    description: "A showcase of recycled and upcycled products.",
  },
  other: {
    label: "Other",
    icon: Sparkles,
    tint: "text-muted-foreground bg-muted",
    cardBg: "bg-[color-mix(in_oklab,var(--ecosetu-muted)_16%,var(--card))] hover:bg-[color-mix(in_oklab,var(--ecosetu-muted)_28%,var(--card))]",
    description: "None of the above? Describe your own kind of campaign.",
  },
};

export const CAMPAIGN_TYPE_KEYS = Object.keys(CAMPAIGN_TYPES);

export const getCampaignType = (key) => CAMPAIGN_TYPES[key] ?? CAMPAIGN_TYPES.waste_collection;

/**
 * The label actually worth showing for a campaign: an "other" campaign's
 * own `customTypeLabel` (e.g. "Bake Sale Fundraiser") is far more useful
 * than the generic "Other" — every other type just shows its normal label.
 */
export const getCampaignTypeLabel = (campaign) =>
  campaign.campaignType === "other" && campaign.customTypeLabel ? campaign.customTypeLabel : getCampaignType(campaign.campaignType).label;

/** Only these two types collect sorted scrap — categories/weight target only apply to them. */
export const COLLECTION_CAMPAIGN_TYPES = ["waste_collection", "cleaning_drive"];
export const isCollectionCampaignType = (type) => COLLECTION_CAMPAIGN_TYPES.includes(type);

/* ─── Material categories — only meaningful for collection-type drives ────── */
/**
 * Deliberately just the material vocabulary now (plantation/cleanup/
 * awareness moved to campaignType above, where they actually belong — a
 * drive's activity type isn't a "material"). Shared keys reuse the same
 * icons/hues as config/marketplace.js and config/domain.js so one material
 * reads the same colour across the whole product.
 */
export const CAMPAIGN_CATEGORIES = {
  "e-waste": { label: "E-Waste", icon: Cpu, tint: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  plastic: { label: "Plastic", icon: Package, tint: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  metal: { label: "Metal", icon: Wrench, tint: "text-slate-600 dark:text-slate-300 bg-slate-500/10" },
  glass: { label: "Glass", icon: Layers, tint: "text-teal-600 dark:text-teal-400 bg-teal-500/10" },
  paper: { label: "Paper", icon: Newspaper, tint: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  mixed: { label: "Mixed", icon: Boxes, tint: "text-muted-foreground bg-muted" },
};

export const CAMPAIGN_CATEGORY_KEYS = Object.keys(CAMPAIGN_CATEGORIES);

export const getCampaignCategory = (key) => CAMPAIGN_CATEGORIES[key] ?? CAMPAIGN_CATEGORIES.mixed;

/* ─── Browse tabs ────────────────────────────────────────────────────────── */
export const CAMPAIGN_STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

/* ─── Sort options ───────────────────────────────────────────────────────── */
export const CAMPAIGN_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "starting-soon", label: "Starting soon" },
  { value: "most-participants", label: "Most participants" },
  { value: "target-progress", label: "Closest to target" },
];

/* ─── Browse filter state ────────────────────────────────────────────────── */
export const EMPTY_CAMPAIGN_FILTERS = {
  campaignType: "all",
  category: "all",
  city: "",
  sort: "newest",
};

export const countActiveCampaignFilters = (filters) =>
  [
    filters.campaignType && filters.campaignType !== "all",
    filters.category && filters.category !== "all",
    !!filters.city?.trim(),
  ].filter(Boolean).length;

/* ─── Participation status (participants & volunteers) ───────────────────── */
/**
 * Participants and volunteers share the same four raw statuses
 * (registered/approved/attended/cancelled — see CampaignParticipant.js),
 * but read differently: a participant never needs an organizer's approval,
 * so their badge only ever says "Registered" or "Cancelled" — the
 * pending/approved distinction is a real backend state (it still drives the
 * Approve/Reject buttons in ParticipantsPanel when a campaign requires
 * approval), just not one worth exposing as separate participant-facing
 * wording. A volunteer's registration IS a request the organizer acts on,
 * so it gets the fuller vocabulary: Requested → Approved, or Requested →
 * Declined (organizer said no) / Cancelled (they withdrew themselves) —
 * same underlying "cancelled" status, disambiguated by `cancelledBy`.
 * "Attended" applies to either role post-event and isn't part of that
 * registration lifecycle, so it's unaffected.
 */
const TONE_CLASSES = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  success: "bg-primary/10 text-primary",
  danger: "bg-destructive/10 text-destructive",
};

const PARTICIPANT_STATUS_META = {
  registered: { label: "Registered", tone: "warning" },
  approved: { label: "Registered", tone: "warning" },
  attended: { label: "Attended", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

const VOLUNTEER_STATUS_META = {
  registered: { label: "Requested", tone: "warning" },
  approved: { label: "Approved", tone: "info" },
  attended: { label: "Attended", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" }, // overridden to "Declined" below when cancelledBy === "organizer"
};

/**
 * @param {string} status - registered | approved | attended | cancelled
 * @param {string} [participationType] - "participant" | "volunteer"; defaults to the fuller volunteer vocabulary when omitted (existing call sites that don't yet pass it).
 * @param {string} [cancelledBy] - "self" | "organizer" | null — only meaningful when status is "cancelled" and participationType is "volunteer".
 */
export const getParticipationStatusMeta = (status, participationType = "volunteer", cancelledBy = null) => {
  const table = participationType === "participant" ? PARTICIPANT_STATUS_META : VOLUNTEER_STATUS_META;
  const meta = table[status];
  if (!meta) return { label: status ?? "Unknown", className: TONE_CLASSES.neutral };

  const label = participationType === "volunteer" && status === "cancelled" && cancelledBy === "organizer" ? "Declined" : meta.label;
  return { label, className: TONE_CLASSES[meta.tone] };
};

export const getParticipantStatusFilterTabs = (participationType) => [
  { value: "all", label: "All" },
  { value: "registered", label: participationType === "volunteer" ? "Requested" : "Pending" },
  { value: "approved", label: "Approved" },
  { value: "attended", label: "Attended" },
  { value: "cancelled", label: participationType === "volunteer" ? "Declined / Cancelled" : "Cancelled" },
];

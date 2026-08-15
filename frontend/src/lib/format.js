/**
 * Formatting helpers — shared across dashboard modules so numbers, currency and
 * dates read identically everywhere.
 */

import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

/** ₹1,234 — Indian grouping, no decimals unless asked. */
export const formatCurrency = (value, { decimals = 0 } = {}) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);

/** 1,234.5 — Indian grouping. */
export const formatNumber = (value, { decimals = 0 } = {}) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);

export const formatWeight = (kg, { decimals = 1 } = {}) => `${formatNumber(kg, { decimals })} kg`;

/** "Tomorrow", "Today", or "Fri, 12 Sep". */
export const formatFriendlyDate = (isoDate) => {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, d MMM");
};

/** "2 hours ago" */
export const formatRelativeTime = (isoDate) => {
  if (!isoDate) return "—";
  return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
};

/** Time-of-day greeting used by the dashboard header. */
export const getGreeting = (date = new Date()) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

/** "Rahul Sharma" → "Rahul". Organizations keep their full name. */
export const getFirstName = (fullName) => (fullName || "").trim().split(/\s+/)[0] || "";

export const getInitials = (name) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase())
        .join("")
    : "?";

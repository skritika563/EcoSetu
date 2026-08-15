/**
 * DashboardGreeting — personalised dashboard header.
 *
 * Households get a time-of-day greeting on their first name; organizations get
 * a "welcome back" on their full name. Everything falls back gracefully when
 * profile fields are missing — nothing here is hardcoded.
 *
 * Avatar, name and role badge deliberately live only in the navbar: repeating
 * them beside the greeting was redundant. Notifications are in the navbar too.
 */

import { useAuth } from "@/contexts/AuthContext";
import { getFirstName, getGreeting } from "@/lib/format";
import { cn } from "@/lib/utils";

const DashboardGreeting = ({ subtitle, className }) => {
  const { user, role } = useAuth();

  const isOrganization = role === "organization";
  const displayName = user?.name?.trim();

  const heading = isOrganization
    ? `Welcome back, ${displayName || "there"}`
    : `${getGreeting()}, ${getFirstName(displayName) || "there"} 👋`;

  return (
    <header className={cn("min-w-0", className)}>
      <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {heading}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
    </header>
  );
};

export default DashboardGreeting;

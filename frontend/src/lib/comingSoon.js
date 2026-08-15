/**
 * comingSoon — honest handling for destinations whose module isn't built yet.
 *
 * EcoSetu is built module by module. Rather than shipping dead links or fake
 * screens, unbuilt destinations tell the user plainly that the feature is on
 * the way. Delete a call site as soon as its real route exists.
 */

import { toast } from "sonner";

export const notifyComingSoon = (label) => {
  toast.info(`${label} is coming soon`, {
    description: "This part of EcoSetu is still being built.",
  });
};

/**
 * Click handler for a nav item / action that may or may not be routable yet.
 * Returns null when the destination exists, so callers can render a real Link.
 */
export const handleUnavailable = (label) => (event) => {
  event.preventDefault();
  notifyComingSoon(label);
};

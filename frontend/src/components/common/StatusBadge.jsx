/**
 * StatusBadge — renders a backend status key with consistent wording and tone.
 * Mapping lives in config/domain.js, so statuses look the same everywhere.
 */

import { getStatus } from "@/config/domain";
import { cn } from "@/lib/utils";

const StatusBadge = ({ status, className }) => {
  const { label, className: toneClass } = getStatus(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass,
        className
      )}
    >
      {label}
    </span>
  );
};

export default StatusBadge;

/**
 * EmptyState — "nothing here yet" for a dashboard section.
 *
 * An empty section should look deliberate, never broken: an icon, a plain
 * explanation, and (where it helps) the action that would fill it.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, className }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center",
      className
    )}
  >
    {Icon && (
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
    )}

    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>

    {actionLabel && onAction && (
      <Button size="sm" variant="outline" onClick={onAction} className="mt-1">
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;

/**
 * ErrorState — a section failed to load.
 *
 * Scoped to the section rather than the page: one failing panel should never
 * take down the whole dashboard.
 */

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ErrorState = ({
  title = "Couldn't load this section",
  description = "Something went wrong while fetching this data.",
  onRetry,
  className,
}) => (
  <div
    role="alert"
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-10 text-center",
      className
    )}
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
      <TriangleAlert className="h-5 w-5" />
    </span>

    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>

    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
        Try again
      </Button>
    )}
  </div>
);

export default ErrorState;

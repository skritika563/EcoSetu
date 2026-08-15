/**
 * SectionHeader — title + optional description and trailing action for a
 * dashboard section. Keeps section typography identical across every module.
 */

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SectionHeader = ({ title, description, actionLabel, onAction, className }) => (
  <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
    <div className="min-w-0">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p>
      )}
    </div>

    {actionLabel && onAction && (
      <Button
        variant="ghost"
        size="sm"
        onClick={onAction}
        className="-mr-2 shrink-0 text-sm font-medium text-primary hover:text-primary"
      >
        {actionLabel}
        <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

export default SectionHeader;

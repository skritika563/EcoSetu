/**
 * StepIndicator — progress pills for multi-step flows (signup, profile completion).
 */

import { cn } from "@/lib/utils";

const StepIndicator = ({ current, total, className }) => (
  <div
    className={cn("mb-6 flex items-center justify-center gap-2", className)}
    role="progressbar"
    aria-valuenow={current + 1}
    aria-valuemin={1}
    aria-valuemax={total}
    aria-label={`Step ${current + 1} of ${total}`}
  >
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={cn(
          "h-1.5 rounded-full transition-all duration-300",
          i === current ? "w-8 bg-primary" : i < current ? "w-4 bg-primary/40" : "w-4 bg-border"
        )}
      />
    ))}
  </div>
);

export default StepIndicator;

/**
 * DateRangeFilter — period selector for admin analytics.
 */
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
];

const DateRangeFilter = ({ value, onChange, className }) => {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
            value === p.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
};

export default DateRangeFilter;

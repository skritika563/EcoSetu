/**
 * PriceBreakdownTable — Category → Weight → Rate → Subtotal, plus total.
 *
 * The one place this arithmetic is ever displayed: the booking review's rough
 * estimate, the collector's live verification entry, the completed pickup's
 * final breakdown, and the receipt all render through this component, fed by
 * services/pricingService.js. A stacked list rather than an HTML table, so it
 * never turns into a cramped horizontal scroll on mobile.
 *
 * `mode="estimate"` softens the language ("Estimated value") per the business
 * rule that nothing is guaranteed until the collector verifies on site.
 */

import { getCategory } from "@/config/domain";
import { formatCurrency, formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";

const PriceBreakdownTable = ({
  lines = [],
  totalAmount = 0,
  serviceCharge = 0,
  mode = "final",
  className,
}) => {
  const isEstimate = mode === "estimate";
  const grandTotal = totalAmount + serviceCharge;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", className)}>
      <ul className="divide-y divide-border">
        {lines.map((line) => {
          const category = getCategory(line.category);
          const Icon = category.icon;

          return (
            <li key={line.category} className="flex items-center gap-3 bg-card p-3">
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", category.tint)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{category.label}</p>
                <p className="text-xs text-muted-foreground">
                  {formatWeight(line.weightKg)} × {formatCurrency(line.ratePerKg, { decimals: 2 })}/kg
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(line.amount, { decimals: 2 })}
              </p>
            </li>
          );
        })}

        {serviceCharge > 0 && (
          <li className="flex items-center justify-between gap-3 bg-card p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Instant pickup fee</p>
              <p className="text-xs text-muted-foreground">Platform convenience charge</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(serviceCharge)}
            </p>
          </li>
        )}
      </ul>

      <div className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-3">
        <span className="text-sm font-semibold text-foreground">
          {isEstimate ? "Estimated value" : "Total amount"}
        </span>
        <span className="font-heading text-base font-semibold tabular-nums text-foreground">
          {formatCurrency(grandTotal, { decimals: isEstimate ? 0 : 2 })}
        </span>
      </div>
    </div>
  );
};

export default PriceBreakdownTable;

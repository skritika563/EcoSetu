/**
 * ProductFilters — condition / price / city / provenance / sort.
 *
 * RESPONSIVE SPLIT: on desktop these sit inline above the grid. On mobile
 * they'd consume most of the first screen, so they collapse behind a
 * "Filters" button that opens a bottom Sheet — a real mobile pattern rather
 * than the desktop row shrunk down. The active-filter count sits on the
 * button so nothing is silently filtering a mobile user's results.
 *
 * Category is deliberately NOT here — it has its own always-visible chip row
 * (CategoryFilter), because it's the one filter people reach for first.
 */

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import {
  CONDITION_KEYS,
  EMPTY_FILTERS,
  SORT_OPTIONS,
  countActiveFilters,
  getCondition,
} from "@/config/marketplace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** The actual control set, shared by the desktop row and the mobile sheet. */
const FilterFields = ({ draft, setDraft, idPrefix }) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-condition`}>Condition</Label>
      <Select value={draft.condition} onValueChange={(v) => setDraft({ ...draft, condition: v })}>
        <SelectTrigger id={`${idPrefix}-condition`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any condition</SelectItem>
          {CONDITION_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {getCondition(key).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-city`}>City</Label>
      <Input
        id={`${idPrefix}-city`}
        placeholder="e.g. Bengaluru"
        value={draft.city}
        onChange={(e) => setDraft({ ...draft, city: e.target.value })}
      />
    </div>

    <div className="space-y-1.5">
      <Label>Price range (₹)</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="Min"
          aria-label="Minimum price"
          value={draft.minPrice}
          onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })}
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="Max"
          aria-label="Maximum price"
          value={draft.maxPrice}
          onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
        />
      </div>
    </div>

    <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
      <div className="min-w-0">
        <Label htmlFor={`${idPrefix}-eco`} className="text-sm font-medium">
          EcoSetu verified only
        </Label>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Material collected through a completed EcoSetu pickup.
        </p>
      </div>
      <Switch
        id={`${idPrefix}-eco`}
        checked={draft.ecoVerified}
        onCheckedChange={(v) => setDraft({ ...draft, ecoVerified: v })}
      />
    </div>
  </div>
);

const ProductFilters = ({ filters, onChange, className }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  // The sheet edits a draft and commits on Apply, so a mobile user isn't
  // refetching the grid on every keystroke behind the overlay.
  const [draft, setDraft] = useState(filters);

  const activeCount = countActiveFilters(filters);

  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };

  const applySheet = () => {
    onChange(draft);
    setSheetOpen(false);
  };

  const clearAll = () => {
    onChange({ ...EMPTY_FILTERS, sort: filters.sort });
    setDraft({ ...EMPTY_FILTERS, sort: filters.sort });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Sort — always visible; it's a one-tap control at any width. */}
      <Select value={filters.sort} onValueChange={(v) => onChange({ ...filters, sort: v })}>
        <SelectTrigger className="h-9 w-full min-w-0 sm:w-48" aria-label="Sort listings">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* One button at every width — the Sheet it opens is what adapts
          (bottom drawer on mobile, side panel from sm up). */}
      <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={openSheet}>
        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-9 shrink-0 text-muted-foreground" onClick={clearAll}>
          <X className="mr-1 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter listings</SheetTitle>
          </SheetHeader>

          <div className="px-4 pb-2">
            <FilterFields draft={draft} setDraft={setDraft} idPrefix="sheet" />
          </div>

          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setDraft({ ...EMPTY_FILTERS, sort: draft.sort })}
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
            <Button onClick={applySheet} className="w-full sm:w-auto">
              Apply filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProductFilters;

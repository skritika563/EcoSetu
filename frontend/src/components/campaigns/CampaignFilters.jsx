/**
 * CampaignFilters — category, city and sort.
 *
 * Same responsive split as components/marketplace/ProductFilters.jsx: one
 * "Filters" button at every width, opening a bottom Sheet on mobile / side
 * panel from sm up, with the active-filter count on the button itself.
 * Status is NOT here — CampaignsBrowse's own tabs already cover it.
 */

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import {
  CAMPAIGN_CATEGORY_KEYS,
  CAMPAIGN_SORT_OPTIONS,
  CAMPAIGN_TYPE_KEYS,
  EMPTY_CAMPAIGN_FILTERS,
  countActiveCampaignFilters,
  getCampaignCategory,
  getCampaignType,
} from "@/config/campaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

const FilterFields = ({ draft, setDraft, idPrefix }) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-type`}>Campaign type</Label>
      <Select value={draft.campaignType} onValueChange={(v) => setDraft({ ...draft, campaignType: v })}>
        <SelectTrigger id={`${idPrefix}-type`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any type</SelectItem>
          {CAMPAIGN_TYPE_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {getCampaignType(key).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label htmlFor={`${idPrefix}-category`}>Material (collection drives)</Label>
      <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
        <SelectTrigger id={`${idPrefix}-category`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any material</SelectItem>
          {CAMPAIGN_CATEGORY_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {getCampaignCategory(key).label}
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
  </div>
);

const CampaignFilters = ({ filters, onChange, className }) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  const activeCount = countActiveCampaignFilters(filters);

  const openSheet = () => {
    setDraft(filters);
    setSheetOpen(true);
  };
  const applySheet = () => {
    onChange(draft);
    setSheetOpen(false);
  };
  const clearAll = () => {
    onChange({ ...EMPTY_CAMPAIGN_FILTERS, sort: filters.sort });
    setDraft({ ...EMPTY_CAMPAIGN_FILTERS, sort: filters.sort });
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Select value={filters.sort} onValueChange={(v) => onChange({ ...filters, sort: v })}>
          <SelectTrigger className="h-9 w-full min-w-0 sm:w-48" aria-label="Sort campaigns">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter campaigns</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-2">
            <FilterFields draft={draft} setDraft={setDraft} idPrefix="sheet" />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDraft({ ...EMPTY_CAMPAIGN_FILTERS, sort: draft.sort })} className="w-full sm:w-auto">
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

export default CampaignFilters;

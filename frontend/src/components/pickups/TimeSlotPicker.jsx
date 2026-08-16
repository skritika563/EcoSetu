/**
 * TimeSlotPicker — step 3 of booking: pickup type, date and time slot.
 *
 * Scheduled pickups are free and use the date/slot grid below. Instant
 * pickups skip slot selection entirely — a collector is matched within hours
 * for a flat platform fee — so choosing "Instant" replaces the grid with a
 * short explanation instead of showing irrelevant date pickers.
 *
 * Slot availability is realistic mock data (data/pickupData.js), not a real
 * scheduling backend.
 */

import { CalendarClock, Zap } from "lucide-react";

import { getBookableDates, getSlotAvailability } from "@/data/pickupData";
import { INSTANT_PICKUP_FEE } from "@/data/pricingData";
import { formatCurrency, formatFriendlyDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  {
    id: "scheduled",
    icon: CalendarClock,
    label: "Scheduled",
    description: "Free — choose a date and time slot",
  },
  {
    id: "instant",
    icon: Zap,
    label: "Instant",
    description: `Priority pickup within hours — ${formatCurrency(INSTANT_PICKUP_FEE)} platform fee`,
  },
];

const TimeSlotPicker = ({
  pickupType,
  onPickupTypeChange,
  selectedDate,
  onSelectDate,
  selectedSlotId,
  onSelectSlot,
}) => {
  const dates = getBookableDates();
  const slots = selectedDate ? getSlotAvailability(selectedDate) : [];

  return (
    <div className="space-y-5">
      {/* Pickup type */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = pickupType === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onPickupTypeChange(option.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {pickupType === "instant" ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
          <Zap className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-medium text-foreground">We'll match you with a nearby collector</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Usually within 2–3 hours of confirming. You'll get updates as soon as a collector accepts.
          </p>
        </div>
      ) : (
        <>
          {/* Date strip */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Pickup date</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((iso) => {
                const isSelected = iso === selectedDate;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => onSelectDate(iso)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground hover:bg-muted/40"
                    )}
                  >
                    {formatFriendlyDate(iso)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot grid */}
          {selectedDate && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Preferred time slot</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected = slot.id === selectedSlotId;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => onSelectSlot(slot.id)}
                      aria-pressed={isSelected}
                      aria-label={`${slot.label}${!slot.available ? ", unavailable" : ""}`}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                        !slot.available && "cursor-not-allowed border-border/60 text-muted-foreground/50 line-through",
                        slot.available &&
                          (isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground hover:bg-muted/40")
                      )}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TimeSlotPicker;

/**
 * Pickup scheduling helpers — bookable dates and time slot labels.
 *
 * Everything else that used to live in this file (mock addresses, mock
 * collectors, the full mock PICKUPS array) is gone: pickups, addresses and
 * collector identities are all real now, served by /api/pickups and
 * /api/addresses (see services/pickupService.js and services/
 * addressService.js).
 *
 * WHY THERE'S NO "SOME SLOTS ARE FULL" LOGIC HERE ANYMORE: there used to be
 * a getSlotAvailability() that marked some time slots unselectable, seeded
 * off the date so it looked deterministic rather than random. It was pure
 * fiction — this app has no per-slot capacity/dispatch system. ANY
 * collector can accept ANY pending pickup regardless of which slot was
 * picked (see pickupController.listPickups's collector query — it's just
 * `status: "pending"`, nothing scoped to a time window). Showing some slots
 * as "unavailable" implied a real scheduling constraint that doesn't exist,
 * which is exactly the kind of half-real mock this project is careful to
 * avoid — so every slot is just selectable. If real per-slot capacity ever
 * becomes a real feature (e.g. limiting how many pickups a slot can hold
 * based on active collector count in an area), it belongs here, backed by
 * an actual query — not reintroduced as another seeded fake.
 */

// Normalized to local midnight, not `Date.now()` + offset — a plain time-of-day
// offset produces a slightly different millisecond-precision ISO string on
// every call, so the exact string a user clicked (captured into `selectedDate`
// state) would never match the freshly-regenerated array on the next render,
// and the "selected" highlight would silently vanish. Midnight-normalizing
// makes the same calendar day resolve to the exact same ISO string every time.
const daysFromNow = (d) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + d);
  return date.toISOString();
};

/* ─── Time slots ──────────────────────────────────────────────────────────── */
export const TIME_SLOTS = [
  { id: "morning-1", label: "9:00 AM – 11:00 AM", startHour: 9 },
  { id: "morning-2", label: "11:00 AM – 1:00 PM", startHour: 11 },
  { id: "afternoon-1", label: "2:00 PM – 4:00 PM", startHour: 14 },
  { id: "afternoon-2", label: "4:00 PM – 6:00 PM", startHour: 16 },
];

/** Next 7 selectable pickup dates (today excluded — same-day needs Instant). */
export const getBookableDates = () => Array.from({ length: 7 }, (_, i) => daysFromNow(i + 1));

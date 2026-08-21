/**
 * ──────────────────────────────────────────────────────────────────────────────
 * City-name normalization
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * "Bengaluru", "BENGALURU", "bengalore ", "  Bengaluru" are all the same
 * place, typed differently by different people across signup, saved
 * addresses, listings, and pickup bookings. Without a single canonical form,
 * the same city fragments across search results, "nearby" matching, and
 * plain display — which is exactly what a user reported seeing.
 *
 * STORAGE: normalizeCity() is wired in as a Mongoose `set` transform on
 * every city field that exists in this codebase (see models/User.js,
 * Product.js, Pickup.js, MarketplaceOrder.js), so it runs on every write
 * automatically — no controller has to remember to call it. The canonical
 * stored form is lowercase, trimmed, internal whitespace collapsed to a
 * single space.
 *
 * VALIDATION: isValidCityName() rejects empty strings and anything that
 * isn't letters/spaces/.'- once normalized — catches stray digits or
 * symbols at the point of write rather than letting garbage into the
 * database, while still allowing real names ("Port Blair", "O'Fallon"-style
 * apostrophes, hyphenated names).
 *
 * DISPLAY: toTitleCase() is applied at the API response boundary (the
 * serializers), never mutating what's stored. It's idempotent on ANY input
 * casing — "BENGALURU" and "bengaluru" both come out "Bengaluru" — so it
 * also fixes up already-stored legacy values on the way out without
 * requiring a data migration first.
 */

const VALID_CITY_PATTERN = /^[\p{L}][\p{L}\s.'-]{0,99}$/u;

/** Canonical storage form: trim, collapse internal whitespace, lowercase. */
const normalizeCity = (raw) => {
  if (typeof raw !== "string") return raw;
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
};

/** True for a non-empty city name made only of letters, spaces, `.`, `'`, `-`. */
const isValidCityName = (raw) => {
  if (typeof raw !== "string") return false;
  const normalized = normalizeCity(raw);
  return normalized.length > 0 && VALID_CITY_PATTERN.test(normalized);
};

/** Display form: "bengaluru" / "BENGALURU" → "Bengaluru". Safe on any input casing. */
const toTitleCase = (raw) => {
  if (typeof raw !== "string" || raw.length === 0) return raw;
  return raw
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
};

module.exports = { normalizeCity, isValidCityName, toTitleCase };

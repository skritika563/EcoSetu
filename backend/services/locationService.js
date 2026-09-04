/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Location Service — the ONLY place that talks to the LocationIQ API
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Three operations: forward geocode (address/pincode → coordinates + a
 * structured address), reverse geocode (coordinates → a structured address,
 * used by "pick on map"), and directions (two points → a route polyline +
 * distance/duration, used for collector navigation).
 *
 * Kept deliberately narrow and provider-agnostic in its RETURN SHAPE — every
 * function here returns plain {lat, lng, ...} objects and generic route
 * geometry, never a LocationIQ-specific response shape. If this project ever
 * moves to Mapbox (see the maps discussion — LocationIQ now, Mapbox if this
 * scales), only THIS file's internals change; locationController and
 * everything upstream of it never touch a provider-shaped object.
 *
 * The frontend never calls LocationIQ directly — every request is proxied
 * through locationController so the API key stays server-side only, the same
 * pattern razorpayService/geminiService/cloudinary already follow for their
 * own provider secrets.
 */

const BASE_URL = "https://us1.locationiq.com/v1";

const getApiKey = () => process.env.LOCATIONIQ_API_KEY || null;

/** Thin wrapper: builds the URL, adds the key, and normalizes a failed call into a thrown Error. */
const callLocationIQ = async (path, params) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("Location services are temporarily unavailable. Please try again shortly.");
    error.statusCode = 503;
    error.code = "LOCATION_SERVICE_UNAVAILABLE";
    throw error;
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("format", "json");
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    // LocationIQ returns 404 for "no results" on geocoding — not a real
    // failure, just an empty match. Every other status is a real error.
    if (response.status === 404) return null;
    const error = new Error("Couldn't reach the location service. Please try again.");
    error.statusCode = 502;
    error.code = "LOCATION_SERVICE_ERROR";
    throw error;
  }
  return response.json();
};

/** Pulls city/state/pincode out of LocationIQ's `address` breakdown, which varies by result type. */
const extractAddressParts = (address = {}) => ({
  city: address.city || address.town || address.village || address.county || null,
  state: address.state || null,
  pincode: address.postcode || null,
});

/**
 * Forward geocode — a free-text query (pincode, or a full address string) →
 * the best-matching location. Used for "type a pincode, autofill city/state".
 * @returns {Promise<{lat: number, lng: number, displayName: string, city: string|null, state: string|null, pincode: string|null}|null>}
 */
const geocode = async (query) => {
  const results = await callLocationIQ("/search.php", { q: query, addressdetails: 1, limit: 1 });
  if (!results || results.length === 0) return null;
  const [result] = results;
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
    ...extractAddressParts(result.address),
  };
};

/**
 * Reverse geocode — coordinates → the address at that point. Used by
 * "pick on map": the user drops a pin, this fills in city/state/pincode.
 * @returns {Promise<{lat: number, lng: number, displayName: string, city: string|null, state: string|null, pincode: string|null}|null>}
 */
const reverseGeocode = async (lat, lng) => {
  const result = await callLocationIQ("/reverse.php", { lat, lon: lng, addressdetails: 1 });
  if (!result) return null;
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
    ...extractAddressParts(result.address),
  };
};

/**
 * Driving directions between two points — a route polyline plus distance
 * and duration. Used for the collector's in-app navigation preview.
 * @param {{lat: number, lng: number}} from
 * @param {{lat: number, lng: number}} to
 * @returns {Promise<{coordinates: [number, number][], distanceKm: number, durationMin: number}|null>}
 *   `coordinates` is an array of [lat, lng] pairs — already flipped from
 *   GeoJSON's [lng, lat] order into the [lat, lng] order Leaflet expects,
 *   so callers (and a future MapView swap) never have to think about it.
 */
const getDirections = async ({ from, to }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("Location services are temporarily unavailable. Please try again shortly.");
    error.statusCode = 503;
    error.code = "LOCATION_SERVICE_UNAVAILABLE";
    throw error;
  }

  const coordString = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = new URL(`${BASE_URL}/directions/driving/${coordString}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = new Error("Couldn't calculate a route. Please try again.");
    error.statusCode = 502;
    error.code = "LOCATION_SERVICE_ERROR";
    throw error;
  }
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) return null;

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.round(route.duration / 60),
  };
};

module.exports = { geocode, reverseGeocode, getDirections };

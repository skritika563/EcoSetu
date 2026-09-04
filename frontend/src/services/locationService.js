/**
 * Location service — geocoding, reverse geocoding and directions, all proxied
 * through the backend (backend/controllers/locationController.js) so the
 * LocationIQ key never reaches the browser.
 *
 * Every function returns the SAME plain shape the backend does
 * ({lat, lng, ...}) — if this ever moves to Mapbox, only backend/services/
 * locationService.js and this file change; nothing that calls these
 * functions needs to know or care.
 */

import api from "@/services/api";

/**
 * Forward geocode a free-text query (a pincode, or a full address string) —
 * used for "type a pincode, autofill city/state".
 * @returns {Promise<{lat: number, lng: number, displayName: string, city: string|null, state: string|null, pincode: string|null}|null>}
 */
export const geocode = async (query) => {
  const response = await api.get("/location/geocode", { params: { q: query } });
  return response.data.data;
};

/**
 * Reverse geocode a map click — used by "pick on map" to fill in
 * city/state/pincode from a dropped pin.
 * @returns {Promise<{lat: number, lng: number, displayName: string, city: string|null, state: string|null, pincode: string|null}|null>}
 */
export const reverseGeocode = async (lat, lng) => {
  const response = await api.get("/location/reverse-geocode", { params: { lat, lng } });
  return response.data.data;
};

/**
 * Driving directions between two points — used for the collector's
 * navigation preview.
 * @param {{lat: number, lng: number}} from
 * @param {{lat: number, lng: number}} to
 * @returns {Promise<{coordinates: [number, number][], distanceKm: number, durationMin: number}|null>}
 */
export const getDirections = async (from, to) => {
  const response = await api.get("/location/directions", {
    params: { fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng },
  });
  return response.data.data;
};

export default { geocode, reverseGeocode, getDirections };

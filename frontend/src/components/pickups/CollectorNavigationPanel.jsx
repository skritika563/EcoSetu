/**
 * CollectorNavigationPanel — the collector's own "where do I go" view: a
 * route from their current position to the pickup address, plus a reliable
 * "Open in Google Maps" fallback for actual turn-by-turn voice navigation.
 * Leaflet draws a route line here; it doesn't drive turn-by-turn guidance,
 * and building that is out of scope — deep-linking to the device's real
 * maps app is the standard, honest way to hand off real navigation.
 *
 * `liveMyPosition` — when present (the collector is "on_the_way" and
 * useCollectorLocationBroadcast is actively watching their position) — moves
 * the collector's marker live as they drive, without re-fetching the route
 * itself on every update (that would burn the LocationIQ quota for no real
 * benefit — the drawn line stays a fine reference even as the dot moves
 * along it).
 */

import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";

import * as locationService from "@/services/locationService";
import { Button } from "@/components/ui/button";
import MapView from "@/components/map/MapView";

// A saved address's `coordinates` field defaults, at the DB layer, to
// {lat: null, lng: null} rather than a clean `null` when it's never been
// pinned — the backend collapses that for every endpoint it controls, but
// checking both here too means this component can never hand Leaflet or the
// directions API a null lat/lng, no matter what shape a caller passes.
const hasCoordinates = (point) => point?.lat != null && point?.lng != null;

const CollectorNavigationPanel = ({ destination, liveMyPosition }) => {
  // A one-shot fallback position (from the initial getCurrentPosition call
  // below) for when there's no live broadcast yet. The live-broadcast
  // position — only present while "on_the_way" — always wins once it starts
  // arriving; computed inline rather than mirrored into its own state, so
  // there's nothing to synchronize in an effect.
  const [oneShotOrigin, setOneShotOrigin] = useState(null);
  const origin = liveMyPosition || oneShotOrigin;
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasDestination = hasCoordinates(destination);

  useEffect(() => {
    if (!hasDestination || !navigator.geolocation) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOneShotOrigin((prev) => prev || from);
        try {
          const result = await locationService.getDirections(from, destination);
          setRoute(result);
        } catch (err) {
          setError(err.message || "Couldn't calculate a route.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Couldn't access your location — showing the destination only.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
    // Only re-run when the destination itself changes — origin updates from
    // the live broadcast above should move the marker, not re-fetch a route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lng]);

  if (!hasDestination) {
    return (
      <p className="text-xs text-muted-foreground">
        This address has no pinned location, so a route can't be calculated — use the address text above instead.
      </p>
    );
  }

  const openInGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-2">
      <MapView
        className="h-48"
        fitToMarkers
        route={route?.coordinates}
        markers={[
          { position: [destination.lat, destination.lng], type: "destination" },
          ...(origin ? [{ position: [origin.lat, origin.lng], type: "collector" }] : []),
        ]}
      />
      {route ? (
        <p className="text-xs text-muted-foreground">
          {route.distanceKm} km · ~{route.durationMin} min by road
        </p>
      ) : loading ? (
        <p className="text-xs text-muted-foreground">Calculating route…</p>
      ) : null}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button variant="outline" className="w-full" onClick={openInGoogleMaps}>
        <Navigation className="mr-1.5 h-4 w-4" />
        Open in Google Maps
      </Button>
    </div>
  );
};

export default CollectorNavigationPanel;

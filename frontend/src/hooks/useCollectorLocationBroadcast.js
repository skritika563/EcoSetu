/**
 * useCollectorLocationBroadcast — while `enabled`, watches the collector's
 * own position and pushes it to the backend (PATCH /api/pickups/:id/location)
 * every ~20s, so the customer's Pickup Details page — which already
 * background-polls the pickup every 6s (usePickupDetails.js) — picks up a
 * moving "collector" marker with no extra plumbing on the receiving end.
 *
 * Deliberately not tied to a fixed interval calling getCurrentPosition
 * itself: `watchPosition` lets the browser report only on real movement,
 * which is both more accurate and cheaper on battery than polling GPS on a
 * timer. The 20s throttle below is purely about how often that gets SENT to
 * the server, independent of how often the browser reports it.
 *
 * Returns the collector's own last-known position too, so the page that
 * calls this can show it on their own navigation map without a second
 * geolocation subscription.
 */

import { useEffect, useRef, useState } from "react";

import api from "@/services/api";

const BROADCAST_INTERVAL_MS = 20000;

export const useCollectorLocationBroadcast = (jobId, enabled) => {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled || !jobId || !navigator.geolocation) return;

    // Reset the throttle on every (re)start — e.g. re-enabling after a
    // status change shouldn't inherit a stale "last sent" timestamp from a
    // previous job.
    lastSentRef.current = 0;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        setError(null);

        const now = Date.now();
        if (now - lastSentRef.current < BROADCAST_INTERVAL_MS) return;
        lastSentRef.current = now;
        api.patch(`/pickups/${jobId}/location`, next).catch((err) => {
          console.error("Failed to broadcast collector location:", err);
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Couldn't access your location. Check your browser's location permission.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [jobId, enabled]);

  return { position, error };
};

export default useCollectorLocationBroadcast;

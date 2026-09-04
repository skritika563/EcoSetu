/**
 * MapView — the ONE component that wraps the map library (Leaflet, via
 * react-leaflet). Every page that needs a map — the address picker, the
 * collector's navigation screen, the customer's live tracking view — renders
 * THIS component with props/callbacks, and never touches react-leaflet or
 * Leaflet's own API directly.
 *
 * That's deliberate: if this project ever moves off LocationIQ + Leaflet to
 * Mapbox GL JS (the plan if EcoSetu scales past a college project — see the
 * maps discussion), this is the one file that gets rewritten. Everything
 * that renders <MapView .../> keeps working unchanged, because the props
 * below (markers, route, onLocationSelect, center/zoom) describe WHAT to
 * show, never HOW a specific map library shows it.
 *
 * Leaflet's default marker icon references image files by URL in a way that
 * breaks under Vite's bundling — rather than fight that, every marker here
 * is a small themed CSS pin (divIcon), which also means markers can be
 * colored/sized per use case (destination vs. live collector position)
 * without carrying separate marker image assets at all.
 */

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { cn } from "@/lib/utils";

const DEFAULT_CENTER = [20.5937, 78.9629]; // India, roughly centered — used only when nothing else is known
const DEFAULT_ZOOM = 13;

// A last line of defense: a null/undefined lat or lng anywhere in a
// [lat, lng] pair crashes Leaflet outright (it doesn't validate — it just
// throws deep inside its own pixel-projection math), taking down the whole
// page via the app's error boundary rather than degrading gracefully. Every
// point this component touches is filtered through this first, regardless
// of whether the caller already believes it's clean — a spot missed
// upstream (a saved address whose {lat: null, lng: null} default wasn't
// collapsed to a real null, say) should never be able to crash the map.
const isValidPoint = (point) =>
  Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]);

const PIN_COLORS = {
  destination: "#16a34a", // primary green — where the pickup is
  collector: "#2563eb", // blue — the collector's live position
  picker: "#dc2626", // red — the pin being placed in "pick on map" mode
};

/** A small teardrop pin built from CSS, not an image — see the file header for why. */
const buildPinIcon = (color, { pulse = false } = {}) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${pulse ? `<div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.35;animation:ecosetu-pin-pulse 1.8s ease-out infinite;"></div>` : ""}
        <svg width="28" height="28" viewBox="0 0 24 24" style="position:relative;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
          <path d="M12 0C7.03 0 3 4.03 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9z" fill="${color}" />
          <circle cx="12" cy="9" r="3.5" fill="white" />
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const ICONS = {
  destination: buildPinIcon(PIN_COLORS.destination),
  collector: buildPinIcon(PIN_COLORS.collector, { pulse: true }),
  picker: buildPinIcon(PIN_COLORS.picker),
};

/** Injected once — the pulse keyframes the "collector" icon's pulse ring above uses. */
if (typeof document !== "undefined" && !document.getElementById("ecosetu-map-pin-styles")) {
  const style = document.createElement("style");
  style.id = "ecosetu-map-pin-styles";
  style.textContent = `@keyframes ecosetu-pin-pulse { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }`;
  document.head.appendChild(style);
}

/** Re-fits the map's viewport whenever the set of points to show changes. */
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], DEFAULT_ZOOM);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
  return null;
};

/**
 * react-leaflet only uses `center`/`zoom` to construct the map ONCE — after
 * that, changing those props on an already-mounted MapContainer does
 * nothing on its own (the same class of gotcha FitBounds above exists for,
 * but for an explicit center rather than a set of markers to fit). Only
 * mounted when the caller passed `fitToMarkers={false}` — i.e. they're
 * driving the view via `center` themselves — so it never fights FitBounds
 * over who owns the viewport.
 */
const RecenterOnChange = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    map.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], zoom]);
  return null;
};

/** Reports a click's coordinates back to the caller — only mounted when onLocationSelect is passed. */
const ClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
};

/**
 * Leaflet measures its container's pixel size ONCE, when the map is
 * constructed, and after that only reacts to the browser's own `resize`
 * event — never to the container simply becoming a different size for some
 * other reason (a dialog's open animation still settling, a parent flexbox
 * reflowing as sibling form fields render, a collapsed section expanding).
 * When that happens, Leaflet keeps drawing against its stale first
 * measurement: tiles get positioned using pixel math for a container that
 * no longer matches reality, which is what makes the map appear to overflow
 * its rounded/clipped wrapper or render offset — most visible exactly where
 * this app puts maps: inside Dialogs.
 *
 * A ResizeObserver on the map's own container catches every one of those
 * cases generically (not just "wait N ms for a dialog to finish animating")
 * and tells Leaflet to remeasure via invalidateSize().
 */
const AutoInvalidateSize = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    // Fires once immediately (covers "container was already its final size
    // by the time this mounted") and again on every subsequent resize.
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

/**
 * @param {object} props
 * @param {[number, number]} [props.center] - [lat, lng] used before any markers exist
 * @param {number} [props.zoom]
 * @param {Array<{position: [number, number], type?: 'destination'|'collector'|'picker'}>} [props.markers]
 * @param {[number, number][]} [props.route] - polyline coordinates, e.g. from locationService.getDirections
 * @param {(latlng: {lat: number, lng: number}) => void} [props.onLocationSelect] - click-to-pick a point; omit for a read-only map
 * @param {boolean} [props.fitToMarkers] - auto-fit the viewport to markers + route (default true when any are given)
 * @param {string} [props.className]
 */
const MapView = ({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  route = null,
  onLocationSelect,
  fitToMarkers = true,
  className,
}) => {
  const validMarkers = useMemo(() => markers.filter((m) => isValidPoint(m.position)), [markers]);
  const validRoute = useMemo(() => (route ? route.filter(isValidPoint) : null), [route]);
  const validCenter = isValidPoint(center) ? center : null;

  const fitPoints = useMemo(() => {
    if (!fitToMarkers) return [];
    const points = validMarkers.map((m) => m.position);
    if (validRoute?.length) points.push(...validRoute);
    return points;
  }, [validMarkers, validRoute, fitToMarkers]);

  const initialCenter = validCenter || validMarkers[0]?.position || DEFAULT_CENTER;

  return (
    <div className={cn("relative isolate overflow-hidden rounded-xl border border-border", className)}>
      <MapContainer
        center={initialCenter}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 200 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {validRoute?.length > 0 && (
          <Polyline positions={validRoute} pathOptions={{ color: PIN_COLORS.collector, weight: 4, opacity: 0.85 }} />
        )}

        {validMarkers.map((marker, i) => (
          <Marker key={i} position={marker.position} icon={ICONS[marker.type || "destination"]} />
        ))}

        {fitPoints.length > 0 && <FitBounds points={fitPoints} />}
        {!fitToMarkers && <RecenterOnChange center={validCenter} zoom={zoom} />}
        {onLocationSelect && <ClickHandler onLocationSelect={onLocationSelect} />}
        <AutoInvalidateSize />
      </MapContainer>
    </div>
  );
};

export default MapView;

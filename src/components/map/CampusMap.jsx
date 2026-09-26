import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { config, Map, Marker, Popup, LngLatBounds } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useDatabase } from "../../context/DatabaseContext";
import { calculateHaversineDistance } from "../../utils/haversine";

// Configure MapLibre GL Worker Count to 0 so line geometry tessellation runs reliably without WebWorker URL failures
if (config) {
  config.WORKER_COUNT = 0;
}

// Campus center default (Lng, Lat order for MapLibre GL)
const CAMPUS_CENTER_LNG_LAT = [76.285827, 10.361964];

// Flag to show/hide the Outdoor Node Debugger button (set to true when path correction is needed)
const ENABLE_NODE_DEBUGGER = false;

/**
 * Calculates geographic bearing between two points (0° to 360°).
 */
function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// How close (metres) to a node before advancing to the next one
const NODE_ADVANCE_METERS = 8;

/**
 * Finds the index of the next route node the user should be heading toward.
 * - Starts from `fromIdx` (the last known next-node index).
 * - Advances past nodes that are already within NODE_ADVANCE_METERS.
 * - Never goes past the last node.
 */
function findNextNodeIndex(userLat, userLng, route, fromIdx) {
  if (!route || route.length < 2) return 0;
  let idx = Math.max(0, Math.min(fromIdx, route.length - 1));

  // Walk forward as long as the user is already close to the current target node
  while (idx < route.length - 1) {
    const nodeLat = parseFloat(route[idx][0]);
    const nodeLng = parseFloat(route[idx][1]);
    const dist = calculateHaversineDistance(userLat, userLng, nodeLat, nodeLng);
    if (dist <= NODE_ADVANCE_METERS) {
      idx++; // Already passed this node — advance
    } else {
      break;
    }
  }
  return idx;
}


// ─── Static Building Name Labels ───────────────────────────────────────────
// These labels appear on the map and fade out when the user zooms out below 17.
const BUILDING_LABELS = [
  { name: 'Main Block',       lat: 10.359507, lng: 76.285990 },
  { name: 'Bio Block',        lat: 10.359160, lng: 76.286595 },
  { name: 'Decenial Block',   lat: 10.357725, lng: 76.285586 },
  { name: 'Knowledge Center', lat: 10.358411, lng: 76.286691 },
  { name: 'College Mess',     lat: 10.357651, lng: 76.286949 },
  { name: 'SIIMS',            lat: 10.360638, lng: 76.284267 },
  { name: 'Auditorium',       lat: 10.358643, lng: 76.285676 },
];

const LABEL_SHOW_ZOOM = 19.5; // labels visible at overview zoom — hides only when zoomed very far out

/**
 * Returns an SVG string for a curved directional arrow based on turn angle.
 * Designed with "arriving from bottom, departing upward" as the default orientation.
 * The marker element is then rotated by the approach bearing to align with the map.
 * @param {number} turnAngle - degrees: negative = left turn, positive = right turn
 */
function getArrowSVG(turnAngle) {
  const abs = Math.abs(turnAngle);
  const c = 'rgba(255,255,255,0.97)';
  const f = 'filter:drop-shadow(0 1px 3px rgba(10,60,180,0.65))';
  const sw = 2.5;

  if (abs < 22) {
    return `<svg width="14" height="20" viewBox="0 0 20 28" fill="none" style="${f}">
      <line x1="10" y1="27" x2="10" y2="7" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>
      <polyline points="4 13 10 4 16 13" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  if (turnAngle > 0) {
    if (abs < 65) {
      return `<svg width="20" height="20" viewBox="0 0 28 28" fill="none" style="${f}">
        <path d="M 8 27 Q 8 9 23 9" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
        <polyline points="17 3 23 9 17 15" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    } else {
      return `<svg width="20" height="18" viewBox="0 0 28 26" fill="none" style="${f}">
        <path d="M 8 25 L 8 13 Q 8 5 20 5" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
        <polyline points="14 0 20 5 14 11" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
  } else {
    if (abs < 65) {
      return `<svg width="20" height="20" viewBox="0 0 28 28" fill="none" style="${f}">
        <path d="M 20 27 Q 20 9 5 9" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
        <polyline points="11 3 5 9 11 15" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    } else {
      return `<svg width="20" height="18" viewBox="0 0 28 26" fill="none" style="${f}">
        <path d="M 20 25 L 20 13 Q 20 5 8 5" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>
        <polyline points="14 0 8 5 14 11" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
    }
  }
}

/**
 * Generates route directional arrows:
 *  - One curved arrow at each turn waypoint (showing the turn direction)
 *  - One straight arrow at the midpoint of long straight segments (> 50 m)
 * This keeps arrow count minimal while maximising directional information.
 */
function generateRouteArrows(route = []) {
  if (!route || !Array.isArray(route) || route.length < 2) return [];

  const arrows = [];

  // Pre-compute bearings for every segment
  const segBearings = [];
  for (let i = 0; i < route.length - 1; i++) {
    const s = route[i], e = route[i + 1];
    if (s && e && s.length >= 2 && e.length >= 2) {
      segBearings.push(calculateBearing(s[0], s[1], e[0], e[1]));
    } else {
      segBearings.push(null);
    }
  }

  // ── Turn-point arrows (placed at each internal waypoint) ──
  for (let i = 1; i < route.length - 1; i++) {
    const inB  = segBearings[i - 1];
    const outB = segBearings[i];
    if (inB === null || outB === null) continue;

    // Signed turn angle: positive = right, negative = left
    const turnAngle = ((outB - inB + 540) % 360) - 180;
    const pt = route[i];

    arrows.push({
      lat:        pt[0],
      lng:        pt[1],
      bearing:    Math.round(inB),   // approach direction used for rotation
      turnAngle:  Math.round(turnAngle),
    });
  }

  // ── Midpoint arrows for long straight segments (> 50 m) ──
  const LONG_SEG_M = 50;
  for (let i = 0; i < route.length - 1; i++) {
    const s = route[i], e = route[i + 1];
    if (!s || !e || segBearings[i] === null) continue;
    const dist = calculateHaversineDistance(s[0], s[1], e[0], e[1]);
    if (dist > LONG_SEG_M) {
      arrows.push({
        lat:       (s[0] + e[0]) / 2,
        lng:       (s[1] + e[1]) / 2,
        bearing:   Math.round(segBearings[i]),
        turnAngle: 0, // straight arrow
      });
    }
  }

  return arrows;
}

// Category Icon and Color Resolver
const getCategoryIconAndColor = (name = "", type = "") => {
  const n = name.toLowerCase();
  const t = type.toLowerCase();

  // 1. Food / Canteen / Cafe
  if (n.includes("cafe") || n.includes("mess") || n.includes("food") || t.includes("food")) {
    return {
      bg: "#f59e0b",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`
    };
  }

  // 2. Auditorium / Stage / Hall
  if (n.includes("auditorium") || n.includes("amphi") || n.includes("stage") || n.includes("hall")) {
    return {
      bg: "#8b5cf6",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`
    };
  }

  // 3. Sports / Ground / Turf
  if (n.includes("ground") || n.includes("turf") || n.includes("sports") || n.includes("court")) {
    return {
      bg: "#10b981",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`
    };
  }

  // 4. Library / Labs
  if (n.includes("library") || n.includes("Lab")) {
    return {
      bg: "#06b6d4",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6.5 6H20"/></svg>`
    };
  }

  // 5. Entrance / Gate
  if (n.includes("entrance") || n.includes("gate")) {
    return {
      bg: "#334155",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg>`
    };
  }

  // 6. Buildings / Academic Blocks
  if (
    n.includes("block") ||
    n.includes("Center") ||
    n.includes("Bio") ||
    n.includes("main") ||
    n.includes("building") || 
    n.includes("Sahrdaya")
  ) {
    return {
      bg: "#2563eb",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`
    };
  }

  // Default Pin
  return {
    bg: "#64748b",
    svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`
  };
};

const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY || "cb1_3w0b_1_b52722bac6c2e78bfcf9da6e";

// Mobile-Safe CARTO Voyager WebGL Map Style (Guarantees 100% rendering on all mobile devices with 3D rotation)
const MOBILE_SAFE_MAP_STYLE = {
  version: 8,
  sources: {
    "carto-voyager": {
      type: "raster",
      tiles: [
        `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
        `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
        `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
        `https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "carto-voyager-layer",
      type: "raster",
      source: "carto-voyager",
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export default function CampusMap({
  selectedLocation,
  currentLocation,
  isLiveGps = false,
  heading,
  route = [],
  destination,
  isNavigating = false,
  offRouteConnector = null,
  onSelectLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapBearing, setMapBearing] = useState(180); // Default: south-facing view

  const { nodes = [], edges = [] } = useDatabase();
  const [showDebugNodes, setShowDebugNodes] = useState(ENABLE_NODE_DEBUGGER);

  // Track initial auto-focus & navigation transition state
  const initialCenteredRef = useRef(false);
  const hasCenteredLiveGpsRef = useRef(false);
  const lastPreviewRouteRef = useRef(null);
  const wasNavigatingRef = useRef(false);

  // Compass Heading & Movement Tracking Refs
  const headingRef = useRef(null);
  const prevLocRef = useRef(null);

  // Google-Maps-style cone smoothing refs
  // smoothedWorldHdgRef: the angle currently being displayed (drifts toward headingRef each frame)
  // headingRafRef: handle for the persistent 60fps heading-smoothing loop
  const smoothedWorldHdgRef = useRef(null);
  const headingRafRef = useRef(null);

  // Navigation Follow Mode State & Refs
  const followModeRef = useRef(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const navRotationFrameRef = useRef(null);
  // Keep latest route accessible inside rAF without stale closure
  const routeRef = useRef(route);
  // Tracks which route node is next (advances as user passes each node)
  const nextNodeIndexRef = useRef(1);

  // Markers Refs
  const userMarkerRef = useRef(null);
  const userConeElRef = useRef(null);
  const destMarkerRef = useRef(null);
  const venueMarkersRef = useRef([]);
  const arrowMarkersRef = useRef([]);
  const debugMarkersRef = useRef([]);
  const buildingLabelMarkersRef = useRef([]);
  const svgPathRef = useRef(null);
  const svgCasingRef = useRef(null);
  const svgConnectorRef = useRef(null); // dashed off-route connector line

  // updateHeadlightRotation — sets the target heading that the rAF loop drifts toward.
  // The DOM is no longer written here; the persistent 60fps loop owns all cone animation.
  const updateHeadlightRotation = useCallback((overrideHdg) => {
    if (overrideHdg !== undefined && overrideHdg !== null && !isNaN(overrideHdg)) {
      headingRef.current = overrideHdg;
    }
    // If called with no args, the rAF loop already reads headingRef each frame — nothing else needed.
  }, []);

  // Sync headingRef whenever the compass/GPS heading prop changes.
  // The rAF loop below picks this up within one frame — no direct DOM write needed here.
  useEffect(() => {
    if (heading !== null && heading !== undefined && !isNaN(heading)) {
      headingRef.current = heading;
    }
  }, [heading]);


  // ─── Persistent Google-Maps-style torch smoothing loop ──────────────────────
  // Runs at 60fps from mount until unmount.
  // Every frame:
  //  1. Lerps smoothedWorldHdgRef → headingRef using shortest-path interpolation
  //     (handles 359°→1° wrap correctly — never goes the long way around)
  //  2. Derives visual rotation: smoothedHdg - mapBearing
  //     (compensates for map rotation so cone always points the correct world direction)
  //  3. Writes result directly to the cone DOM element
  // Removing CSS transition from the cone lets this loop own the animation entirely.
  const CONE_ALPHA = 0.12; // ~130ms time-constant at 60fps — smooth but responsive

  useEffect(() => {
    const rafLoop = () => {
      const map = mapRef.current;
      const coneEl = userConeElRef.current;

      if (map && coneEl) {
        const targetHdg = headingRef.current;

        if (targetHdg === null || targetHdg === undefined || isNaN(targetHdg)) {
          // No heading data — dim cone, point straight up
          coneEl.style.opacity = "0.35";
          coneEl.style.transform = "rotate(0deg)";
        } else {
          // ── Shortest-path lerp toward target world heading ────────────────
          if (smoothedWorldHdgRef.current === null || smoothedWorldHdgRef.current === undefined) {
            // First reading — jump immediately so there is no initial sweep across the screen
            smoothedWorldHdgRef.current = targetHdg;
          } else {
            const delta = ((targetHdg - smoothedWorldHdgRef.current) + 540) % 360 - 180;
            smoothedWorldHdgRef.current = (smoothedWorldHdgRef.current + delta * CONE_ALPHA + 360) % 360;
          }

          // ── Derive visual rotation from smoothed world heading ────────────
          // Subtract live map bearing so the cone compensates for map rotation.
          const mapBrg = map.getBearing() || 0;
          const visualAngle = (smoothedWorldHdgRef.current - mapBrg + 360) % 360;

          coneEl.style.opacity = "1";
          coneEl.style.transform = `rotate(${visualAngle.toFixed(2)}deg)`;
        }
      }

      headingRafRef.current = requestAnimationFrame(rafLoop);
    };

    headingRafRef.current = requestAnimationFrame(rafLoop);

    return () => {
      if (headingRafRef.current) {
        cancelAnimationFrame(headingRafRef.current);
        headingRafRef.current = null;
      }
    };
  }, []); // Empty deps: runs once on mount, reads all values via refs
  // ────────────────────────────────────────────────────────────────────────────


  // Synchronize mapBearing state on Map Camera Touch Rotation & Pitch
  // (updateHeadlightRotation calls here are now no-ops — rAF loop owns the cone)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleCameraRotate = () => {
      updateHeadlightRotation(); // no-op now — cone updates via rAF each frame
      if (mapRef.current) {
        setMapBearing(mapRef.current.getBearing() || 0);
      }
    };

    map.on("rotate", handleCameraRotate);
    map.on("pitch", handleCameraRotate);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("rotate", handleCameraRotate);
        mapRef.current.off("pitch", handleCameraRotate);
      }
    };
  }, [mapLoaded, updateHeadlightRotation]);

  // 1. Initial Load Auto-Focus (Fly to User Location once on map open, and re-center on live GPS fix when acquired)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const hasValidLoc = currentLocation && Array.isArray(currentLocation) && currentLocation.length === 2 && !isNaN(currentLocation[0]) && !isNaN(currentLocation[1]);
    if (!hasValidLoc) return;

    if (isLiveGps) {
      if (!hasCenteredLiveGpsRef.current) {
        map.flyTo({
          center: [currentLocation[1], currentLocation[0]],
          zoom: 17.2,
          bearing: 180,
          pitch: 30,
          duration: 1200,
        });
        hasCenteredLiveGpsRef.current = true;
        initialCenteredRef.current = true;
      }
    } else if (!initialCenteredRef.current) {
      map.flyTo({
        center: [currentLocation[1], currentLocation[0]],
        zoom: 17.2,
        bearing: 180,
        pitch: 30,
        duration: 1000,
      });
      initialCenteredRef.current = true;
    }
  }, [currentLocation, isLiveGps, mapLoaded]);

  // Keep routeRef in sync so rAF loop always sees latest route
  useEffect(() => { routeRef.current = route; }, [route]);

  // 2. Start Navigation — Enable Follow Mode & rotate map to forward path bearing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (isNavigating) {
      if (!wasNavigatingRef.current && route && route.length >= 2 && currentLocation) {
        wasNavigatingRef.current = true;
        followModeRef.current = true;
        setIsFollowing(true);
        nextNodeIndexRef.current = 1; // Aim at first waypoint after start

        const userLat = currentLocation[0];
        const userLng = currentLocation[1];
        const nextLat = parseFloat(route[1][0]);
        const nextLng = parseFloat(route[1][1]);
        const initialBearing = calculateBearing(userLat, userLng, nextLat, nextLng);

        headingRef.current = initialBearing;
        updateHeadlightRotation(initialBearing);

        map.flyTo({
          center: [userLng, userLat],
          zoom: 17.8,
          pitch: 50,
          bearing: initialBearing,
          duration: 1200,
        });
      }
    } else {
      if (wasNavigatingRef.current) {
        wasNavigatingRef.current = false;
        followModeRef.current = false;
        setIsFollowing(false);
        nextNodeIndexRef.current = 1;

        if (map) {
          // Return to south-facing view after navigation — matches the app's default orientation
          map.easeTo({ bearing: 180, pitch: 30, duration: 800 });
          setMapBearing(180);
        }
      }
    }
  }, [isNavigating, currentLocation, route, mapLoaded, updateHeadlightRotation]);

  // 3. Next-Node Navigation Rotation Loop
  //    Bearing = user GPS → next route node ahead
  //    Map rotates so that direction points to the top of the screen.
  //    User position stays centered with path/destination flowing upward.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (navRotationFrameRef.current) {
      cancelAnimationFrame(navRotationFrameRef.current);
      navRotationFrameRef.current = null;
    }

    if (!isNavigating) return;

    const rotationLoop = () => {
      if (!mapRef.current) return;

      const currentRoute = routeRef.current;
      const loc = currentLocation;

      if (
        followModeRef.current &&
        loc && Array.isArray(loc) && loc.length === 2 &&
        currentRoute && currentRoute.length >= 2
      ) {
        const userLat = loc[0];
        const userLng = loc[1];

        // ── Advance node index past already-reached nodes ──────────────────
        const nextIdx = findNextNodeIndex(userLat, userLng, currentRoute, nextNodeIndexRef.current);
        nextNodeIndexRef.current = nextIdx;

        const safeIdx = Math.min(nextIdx, currentRoute.length - 1);
        const nextLat = parseFloat(currentRoute[safeIdx][0]);
        const nextLng = parseFloat(currentRoute[safeIdx][1]);

        // ── Bearing: from user → next node ────────────────────────────────
        const targetBearing = calculateBearing(userLat, userLng, nextLat, nextLng);
        const currentBearing = mapRef.current.getBearing();
        const delta = ((targetBearing - currentBearing) + 540) % 360 - 180;

        // Snappy, smooth map rotation — 15% per frame
        if (Math.abs(delta) > 0.2) {
          const smoothed = (currentBearing + delta * 0.15 + 360) % 360;
          mapRef.current.setBearing(smoothed);
        }

        // ── Keep headlight cone pointing straight up along route line ──────
        headingRef.current = targetBearing;
        updateHeadlightRotation(targetBearing);

        // ── Keep camera centered on user position ─────────────────────────
        const mapCenter = mapRef.current.getCenter();
        const dx = Math.abs(mapCenter.lng - userLng);
        const dy = Math.abs(mapCenter.lat - userLat);

        if (dx > 0.00001 || dy > 0.00001) {
          mapRef.current.setCenter([userLng, userLat]);
        }
      }

      navRotationFrameRef.current = requestAnimationFrame(rotationLoop);
    };

    navRotationFrameRef.current = requestAnimationFrame(rotationLoop);

    return () => {
      if (navRotationFrameRef.current) {
        cancelAnimationFrame(navRotationFrameRef.current);
        navRotationFrameRef.current = null;
      }
    };
  }, [isNavigating, mapLoaded, currentLocation, updateHeadlightRotation]);

  // 4. Detect user manual map interaction to pause follow mode (re-engages on recenter)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleUserInteraction = () => {
      if (isNavigating && followModeRef.current) {
        followModeRef.current = false; // Pause follow mode on manual pan/rotate/zoom
        setIsFollowing(false);
      }
    };

    map.on('dragstart', handleUserInteraction);
    map.on('rotatestart', handleUserInteraction);
    map.on('pitchstart', handleUserInteraction);
    map.on('zoomstart', handleUserInteraction);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('dragstart', handleUserInteraction);
        mapRef.current.off('rotatestart', handleUserInteraction);
        mapRef.current.off('pitchstart', handleUserInteraction);
        mapRef.current.off('zoomstart', handleUserInteraction);
      }
    };
  }, [isNavigating, mapLoaded]);

  // Dynamic High-Performance SVG Polyline Overlay Synchronization
  const updateSvgPolyline = () => {
    const map = mapRef.current;
    if (!map || !svgPathRef.current || !svgCasingRef.current) return;

    if (!route || !Array.isArray(route) || route.length < 2) {
      svgPathRef.current.setAttribute("d", "");
      svgCasingRef.current.setAttribute("d", "");
      return;
    }

    const points = route
      .filter((pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
      .map((pt) => map.project([parseFloat(pt[1]), parseFloat(pt[0])]));

    if (points.length < 2) {
      svgPathRef.current.setAttribute("d", "");
      svgCasingRef.current.setAttribute("d", "");
      return;
    }

    let d = "";
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      d += `${i === 0 ? "M" : " L"} ${p.x.toFixed(1.5)} ${p.y.toFixed(1.5)}`;
    }

    svgPathRef.current.setAttribute("d", d);
    svgCasingRef.current.setAttribute("d", d);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    updateSvgPolyline();

    const handleMapMove = () => updateSvgPolyline();

    map.on("move", handleMapMove);
    map.on("zoom", handleMapMove);
    map.on("pitch", handleMapMove);
    map.on("rotate", handleMapMove);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("move", handleMapMove);
        mapRef.current.off("zoom", handleMapMove);
        mapRef.current.off("pitch", handleMapMove);
        mapRef.current.off("rotate", handleMapMove);
      }
    };
  }, [route, mapLoaded]);

  // ── Off-Route Dashed Connector Line ─────────────────────────────────
  // Draws a short dotted line from the user's real GPS position to the
  // nearest point on the route whenever they are >5 m off-path.
  // Clears itself when back on-route (connector prop becomes null).
  useEffect(() => {
    const updateConnector = () => {
      const el = svgConnectorRef.current;
      const map = mapRef.current;
      if (!el || !map) { if (el) el.setAttribute('d', ''); return; }

      if (!offRouteConnector) { el.setAttribute('d', ''); return; }

      const { userPoint, pathPoint } = offRouteConnector;
      if (!userPoint || !pathPoint) { el.setAttribute('d', ''); return; }

      // Project both points to screen space
      const p1 = map.project([userPoint[1], userPoint[0]]);
      const p2 = map.project([pathPoint[1], pathPoint[0]]);

      el.setAttribute('d', `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    };

    updateConnector();

    const map = mapRef.current;
    if (!map) return;
    map.on('move',   updateConnector);
    map.on('zoom',   updateConnector);
    map.on('rotate', updateConnector);
    map.on('pitch',  updateConnector);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('move',   updateConnector);
        mapRef.current.off('zoom',   updateConnector);
        mapRef.current.off('rotate', updateConnector);
        mapRef.current.off('pitch',  updateConnector);
      }
    };
  }, [offRouteConnector, mapLoaded]);
  // ───────────────────────────────────────────────────────────

  // Derive map markers dynamically from DB nodes — only show entrance nodes
  // Derive map markers — only nodes where is_entrance = true in the database
  const mapMarkers = useMemo(() => {
    return nodes
      .filter((n) => {
        if (!n.building_name || n.latitude === undefined || n.longitude === undefined) return false;
        // Support both boolean true and string "true" from different DB drivers
        return n.is_entrance === true || n.is_entrance === 'true';
      })
      .map((n) => ({
        id: n.id,
        name: n.building_name,
        position: [parseFloat(n.latitude), parseFloat(n.longitude)], // [lat, lng]
        type: n.type || "building",
      }));
  }, [nodes]);


  // Destination position [lat, lng]
  const destPos = useMemo(() => {
    if (route && route.length > 0) return route[route.length - 1];
    if (destination?.position) return destination.position;
    if (selectedLocation?.position) return selectedLocation.position;
    return null;
  }, [route, destination, selectedLocation]);

  // Route Flow Arrows
  const routeArrows = useMemo(() => {
    return generateRouteArrows(route);
  }, [route]);

  // Initialize MapLibre GL Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: MOBILE_SAFE_MAP_STYLE,
      center: CAMPUS_CENTER_LNG_LAT,
      zoom: 16.5,
      minZoom: 15,
      maxZoom: 22,
      pitch: 30, // 3D Camera tilt like Google Maps
      bearing: 180, // Default south-facing — campus is best viewed from south
      trackResize: true,
      attributionControl: false,
    });

    // Intercept missing sprite icons dynamically to silence console warnings
    map.on("styleimagemissing", (e) => {
      const id = e.id;
      if (id && !map.hasImage(id)) {
        map.addImage(id, {
          width: 1,
          height: 1,
          data: new Uint8Array(4),
        });
      }
    });

    const initLayers = () => {
      // Add GeoJSON Route Source & Vector Layers safely inside style load callback
      if (!map.getSource("route-source")) {
        map.addSource("route-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [],
            },
          },
        });
      }

      if (!map.getLayer("route-casing")) {
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#1d4ed8",
            "line-width": 9,
            "line-opacity": 0.95,
          },
        });
      }

      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 5,
            "line-opacity": 1,
          },
        });
      }

      // Add GeoJSON Debug Edges Source & Vector Layer safely inside style load callback
      if (!map.getSource("debug-edges-source")) {
        map.addSource("debug-edges-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      if (!map.getLayer("debug-edges-layer")) {
        map.addLayer({
          id: "debug-edges-layer",
          type: "line",
          source: "debug-edges-source",
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#9333ea",
            "line-width": 2,
            "line-dasharray": [2, 3],
            "line-opacity": 0.7,
          },
        });
      }

      setMapLoaded(true);
      setTimeout(() => map.resize(), 100);
    };

    if (map.isStyleLoaded() || map.loaded()) {
      initLayers();
    } else {
      map.on("load", initLayers);
    }

    const handleResize = () => map.resize();
    window.addEventListener("resize", handleResize);

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Route Vector Data Layer & Auto-Fit Preview Bounds (Only when selecting a new destination)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let source = map.getSource("route-source");
    if (!source && (map.isStyleLoaded() || map.loaded())) {
      if (!map.getSource("route-source")) {
        map.addSource("route-source", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          },
        });
      }
      if (!map.getLayer("route-casing")) {
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-source",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#1d4ed8", "line-width": 9, "line-opacity": 0.95 },
        });
      }
      if (!map.getLayer("route-line")) {
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-source",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#3b82f6", "line-width": 5, "line-opacity": 1 },
        });
      }
      source = map.getSource("route-source");
    }

    if (!source) return;

    if (route && Array.isArray(route) && route.length >= 2) {
      // MapLibre expects [lng, lat] coordinates
      const lngLatCoords = route
        .filter((pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
        .map((pt) => [parseFloat(pt[1]), parseFloat(pt[0])]);

      if (lngLatCoords.length >= 2) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: lngLatCoords,
          },
        });

        // Route Preview Auto-Fit: Fit full route bounds ONLY when route changes in Preview mode (!isNavigating)
        if (!isNavigating && lastPreviewRouteRef.current !== route) {
          lastPreviewRouteRef.current = route;
          const bounds = new LngLatBounds();
          lngLatCoords.forEach((coord) => bounds.extend(coord));

          // Compute bearing from user (first point) → destination (last point).
          // Rotating the map to this bearing makes the route run straight up the screen
          // from the user's position toward the destination — exactly like Google Maps.
          const startPt = lngLatCoords[0];                         // [lng, lat]
          const endPt   = lngLatCoords[lngLatCoords.length - 1];   // [lng, lat]
          const routeBearing = calculateBearing(
            startPt[1], startPt[0],  // lat1, lng1
            endPt[1],   endPt[0]     // lat2, lng2
          );

          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 160, left: 50, right: 50 },
            bearing: routeBearing, // rotate so path points straight up
            maxZoom: 17.5,
            duration: 1200,
          });

          // Keep compass rose in sync with the new bearing
          setMapBearing(routeBearing);
        }
      }
    } else {
      lastPreviewRouteRef.current = null;
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      });
    }
  }, [route, isNavigating, mapLoaded]);

  // Render User Location Marker & Torch Flashlight Cone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !currentLocation || !Array.isArray(currentLocation)) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    const [lat, lng] = currentLocation;

    // Movement bearing fallback: only compute when no compass heading available at all.
    // (heading prop is already synced to headingRef via the dedicated heading effect above;
    //  this fallback only covers the case where the device has no compass/orientation sensor.)
    if ((heading === null || heading === undefined) && prevLocRef.current) {
      const [prevLat, prevLng] = prevLocRef.current;
      const dist = calculateHaversineDistance(prevLat, prevLng, lat, lng);
      if (dist > 2.0) {
        // Only update from movement if user moved >2m (reduces jitter from GPS noise)
        const calcHdg = calculateBearing(prevLat, prevLng, lat, lng);
        headingRef.current = Math.round(calcHdg);
      }
    }

    prevLocRef.current = currentLocation;

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-location-marker-container";
      el.style.cssText = "width:120px;height:120px;display:flex;align-items:center;justify-content:center;pointer-events:none;";

      el.innerHTML = `
        <div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center;pointer-events:none;">

          <!-- Direction cone — rotates around dot center (60,60).
               Default SVG points UP = North on screen = correct when effectiveRotation=0.
               Transform-origin must exactly match the dot center in the 120x120 space. -->
          <div class="user-torch-cone-wrapper" style="
            position:absolute;
            inset:0;
            width:120px;
            height:120px;
            pointer-events:none;
            transform-origin:60px 60px;
            transition:opacity 0.3s ease;
            will-change:transform;
            z-index:1;
          ">
            <svg width="120" height="120" viewBox="0 0 120 120" style="overflow:visible;pointer-events:none;">
              <defs>
                <radialGradient id="coneGrad" cx="60" cy="60" r="55" fx="60" fy="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stop-color="#2563eb" stop-opacity="0.9"/>
                  <stop offset="40%"  stop-color="#3b82f6" stop-opacity="0.5"/>
                  <stop offset="80%"  stop-color="#60a5fa" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#93c5fd" stop-opacity="0"/>
                </radialGradient>
                <filter id="coneGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <!-- 75° cone pointing UP from center (60,60) extending 52px.
                   Points: center → top-left → arc → top-right → back.
                   angle=37.5° each side from 12-o-clock. -->
              <path
                d="M 60 60 L 25.4 17.8 A 52 52 0 0 1 94.6 17.8 Z"
                fill="url(#coneGrad)"
                filter="url(#coneGlow)"
              />
            </svg>
          </div>

          <!-- Pulsing accuracy halo -->
          <div style="
            position:absolute;
            width:34px;height:34px;
            background:rgba(37,99,235,0.2);
            border-radius:50%;
            animation:pulse-ring 2s ease-out infinite;
            z-index:2;
            pointer-events:none;
          "></div>

          <!-- Solid blue user dot -->
          <div style="
            position:relative;
            width:18px;height:18px;
            background:#2563eb;
            border:3px solid #ffffff;
            border-radius:50%;
            box-shadow:0 2px 8px rgba(37,99,235,0.6);
            z-index:3;
            pointer-events:none;
          "></div>
        </div>
      `;

      userConeElRef.current = el.querySelector(".user-torch-cone-wrapper");

      userMarkerRef.current = new Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([lng, lat]);
    }

    updateHeadlightRotation();
  }, [currentLocation, heading, mapLoaded, updateHeadlightRotation]);

  // Render Destination Pin Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !destPos || !Array.isArray(destPos)) {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      return;
    }

    const [lat, lng] = destPos;

    if (!destMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "destination-marker-container";
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.cursor = "pointer";

      el.innerHTML = `
        <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="
            background: #ef4444;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45);
            border: 2px solid #ffffff;
          ">
            <div style="transform: rotate(45deg); color: #fff; font-weight: bold; font-size: 14px;">📍</div>
          </div>
        </div>
      `;

      destMarkerRef.current = new Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      destMarkerRef.current.setLngLat([lng, lat]);
    }
  }, [destPos, mapLoaded]);

  // Render Venue Location Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Clear existing venue markers
    venueMarkersRef.current.forEach((m) => m.remove());
    venueMarkersRef.current = [];

    mapMarkers.forEach((loc) => {
      if (!loc.position || !Array.isArray(loc.position)) return;
      const [lat, lng] = loc.position;
      const isSelected = selectedLocation?.name === loc.name || destination?.name === loc.name;
      const { bg, svg } = getCategoryIconAndColor(loc.name, loc.type);
      const iconBg = isSelected ? "#ef4444" : bg;
      const size = isSelected ? 38 : 32;

      const el = document.createElement("div");
      el.className = "venue-marker-container";
      el.style.cursor = "pointer";
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      el.innerHTML = `
        <div style="
          background: ${iconBg};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: ${isSelected ? "0 6px 18px rgba(239, 68, 68, 0.5)" : "0 4px 10px rgba(0,0,0,0.25)"};
          border: ${isSelected ? "3px solid #ffffff" : "2px solid #ffffff"};
          color: #ffffff;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        ">
          ${svg}
        </div>
      `;

      el.addEventListener("click", () => {
        if (onSelectLocation) onSelectLocation(loc);
      });

      const marker = new Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map);

      venueMarkersRef.current.push(marker);
    });
  }, [mapMarkers, selectedLocation, destination, onSelectLocation, mapLoaded]);

  // ─── Building Name Labels (zoom-aware) ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Create one label marker per building
    BUILDING_LABELS.forEach((b) => {
      const el = document.createElement('div');
      el.className = 'building-name-label';
      el.style.cssText = `
        background: rgba(255,255,255,0.92);
        color: #1e3a5f;
        font-family: 'Inter', 'Outfit', sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
        padding: 3px 8px;
        border-radius: 20px;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        border: 1px solid rgba(30,58,95,0.15);
        transition: opacity 0.25s ease;
        user-select: none;
      `;
      el.textContent = b.name;

      const marker = new Marker({ element: el, anchor: 'top' })
        .setLngLat([b.lng, b.lat])
        .addTo(map);

      buildingLabelMarkersRef.current.push(marker);
    });

    // Show/hide based on current zoom
    const updateLabelVisibility = () => {
      const zoom = map.getZoom();
      buildingLabelMarkersRef.current.forEach((m) => {
        m.getElement().style.opacity = zoom >= LABEL_SHOW_ZOOM ? '1' : '0';
      });
    };

    updateLabelVisibility();
    map.on('zoom', updateLabelVisibility);

    return () => {
      map.off('zoom', updateLabelVisibility);
      buildingLabelMarkersRef.current.forEach((m) => m.remove());
      buildingLabelMarkersRef.current = [];
    };
  }, [mapLoaded]);
  // ──────────────────────────────────────────────────────────────────────────

  // Render Route Flow Arrow Markers (Optimized Marker Reuse to prevent DOM thrashing & rAF lag)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const currentMarkers = arrowMarkersRef.current;
    const targetCount = routeArrows.length;

    // Prune excess markers
    while (currentMarkers.length > targetCount) {
      const m = currentMarkers.pop();
      if (m) m.remove();
    }

    const updateArrowRotation = (el, worldBearing) => {
      const map = mapRef.current;
      const mapBearing = map ? map.getBearing() : 0;
      // Arrow must compensate for map rotation so it always points the correct world direction
      const visualBearing = (worldBearing - mapBearing + 360) % 360;
      const rotateEl = el ? el.querySelector(".route-arrow-inner") : null;
      if (rotateEl) rotateEl.style.transform = `rotate(${visualBearing}deg)`;
    };

    const buildArrowHTML = (arrow) => {
      const mapB = mapRef.current ? mapRef.current.getBearing() : 0;
      const vb   = (arrow.bearing - mapB + 360) % 360;
      const ta   = arrow.turnAngle ?? 0;
      return `<div class="route-arrow-inner" style="
        width:20px;height:20px;
        display:flex;align-items:center;justify-content:center;
        transform:rotate(${vb}deg);
        pointer-events:none;
      ">${getArrowSVG(ta)}</div>`;
    };

    routeArrows.forEach((arrow, idx) => {
      if (idx < currentMarkers.length) {
        const marker = currentMarkers[idx];
        marker.setLngLat([arrow.lng, arrow.lat]);
        // Refresh SVG in case turn angle changed
        marker.getElement().innerHTML = buildArrowHTML(arrow);
      } else {
        const el = document.createElement('div');
        el.className      = 'route-arrow-marker';
        el.style.pointerEvents = 'none';
        el.style.width    = '20px';
        el.style.height   = '20px';
        el.style.zIndex   = '10';
        el.innerHTML      = buildArrowHTML(arrow);

        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat([arrow.lng, arrow.lat])
          .addTo(map);
        currentMarkers.push(marker);
      }
    });

    // Re-sync arrow rotations when map rotates
    const syncArrows = () => {
      const markers = arrowMarkersRef.current;
      routeArrows.forEach((arrow, idx) => {
        if (idx < markers.length) {
          updateArrowRotation(markers[idx].getElement(), arrow.bearing);
        }
      });
    };

    map.on('rotate', syncArrows);
    return () => {
      if (mapRef.current) mapRef.current.off('rotate', syncArrows);
    };
  }, [routeArrows, mapLoaded]);

  // Render Outdoor Debug Nodes & Edges (When ENABLE_NODE_DEBUGGER is active)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    debugMarkersRef.current.forEach((m) => m.remove());
    debugMarkersRef.current = [];

    const edgeSource = map.getSource("debug-edges-source");

    if (showDebugNodes) {
      // 1. Render Edges
      const nodeMap = {};
      nodes.forEach((n) => {
        if (n && n.id && n.latitude !== undefined && n.longitude !== undefined) {
          nodeMap[n.id] = [parseFloat(n.longitude), parseFloat(n.latitude)];
        }
      });

      const features = (edges || [])
        .map((edge) => {
          let a, b;
          if (Array.isArray(edge)) {
            [a, b] = edge;
          } else if (edge && (edge.start_node || edge.node_a) && (edge.end_node || edge.node_b)) {
            a = edge.start_node || edge.node_a;
            b = edge.end_node || edge.node_b;
          }
          if (a && b && nodeMap[a] && nodeMap[b]) {
            return {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [nodeMap[a], nodeMap[b]],
              },
            };
          }
          return null;
        })
        .filter(Boolean);

      if (edgeSource) {
        edgeSource.setData({
          type: "FeatureCollection",
          features,
        });
      }

      // 2. Render Nodes with Interactive Name Popup on Click
      nodes.forEach((node) => {
        if (!node || node.latitude === undefined || node.longitude === undefined) return;
        const lat = parseFloat(node.latitude);
        const lng = parseFloat(node.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const displayName = node.building_name || node.name || `Node ${node.id}`;
        const nodeType = node.type ? ` (${node.type})` : "";

        const el = document.createElement("div");
        el.className = "debug-node-marker";
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.cursor = "pointer";

        el.innerHTML = `
          <div style="
            background: #9333ea;
            color: #ffffff;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transition: transform 0.15s ease;
          "></div>
        `;

        const popup = new Popup({
          offset: 14,
          closeButton: true,
          closeOnClick: false,
          focusAfterOpen: false,
        }).setHTML(`
          <div style="
            padding: 8px 12px;
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.35);
            border: 1px solid #334155;
            min-width: 140px;
          ">
            <div style="font-weight: 700; font-size: 13px; color: #c084fc; display: flex; align-items: center; gap: 4px;">
              <span>📍</span> <span>${displayName}${nodeType}</span>
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; font-family: monospace;">
              Node ID: <span style="color: #60a5fa;">${node.id}</span>
            </div>
            <div style="font-size: 10px; color: #cbd5e1; margin-top: 2px; font-family: monospace;">
              ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </div>
          </div>
        `);

        const marker = new Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);

        debugMarkersRef.current.push(marker);
      });
    } else {
      if (edgeSource) {
        edgeSource.setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }
  }, [showDebugNodes, nodes, edges, mapLoaded]);

  // Floating Control Stack Handlers
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleRecenter = () => {
    if (currentLocation && Array.isArray(currentLocation) && currentLocation.length === 2 && mapRef.current) {
      let targetBearing = mapRef.current.getBearing();

      if (isNavigating && route && route.length >= 2) {
        // Navigation mode: rotate to face the next route node ahead
        const userLat = currentLocation[0];
        const userLng = currentLocation[1];
        const nextIdx = Math.min(nextNodeIndexRef.current || 1, route.length - 1);
        const nextLat = parseFloat(route[nextIdx][0]);
        const nextLng = parseFloat(route[nextIdx][1]);
        targetBearing = calculateBearing(userLat, userLng, nextLat, nextLng);
        headingRef.current = targetBearing;
        updateHeadlightRotation(targetBearing);
      } else if (heading !== null && heading !== undefined && !isNaN(heading)) {
        // Non-navigation mode: rotate map to match the user's live compass heading
        // so whatever the user physically faces is at the top of the screen.
        targetBearing = heading;
        headingRef.current = heading;
        updateHeadlightRotation(heading);
      }

      // easeTo: pans + rotates smoothly WITHOUT changing zoom level.
      // flyTo would force a zoom jump — we keep whatever zoom the user is at.
      mapRef.current.easeTo({
        center: [currentLocation[1], currentLocation[0]],
        bearing: targetBearing,
        pitch: isNavigating ? 50 : mapRef.current.getPitch(),
        duration: 800,
        easing: (t) => t * (2 - t), // ease-out curve — decelerates smoothly
      });

      // Re-engage follow mode when user taps recenter during navigation
      if (isNavigating) {
        followModeRef.current = true;
        setIsFollowing(true);
      }
    }
  };

  const handleResetNorth = () => {
    if (mapRef.current) {
      // Snap map to true North (0°). Disables follow mode so the view stays locked north.
      followModeRef.current = false;
      setIsFollowing(false);

      mapRef.current.easeTo({
        bearing: 0,
        pitch: 30,
        duration: 800,
      });

      setMapBearing(0);
    }
  };

  const handleFitRoute = () => {
    if (route && Array.isArray(route) && route.length >= 2 && mapRef.current) {
      const bounds = new LngLatBounds();
      route.forEach((pt) => bounds.extend([pt[1], pt[0]]));

      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 160, left: 50, right: 50 },
        maxZoom: 16.5,
        duration: 1200,
      });
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {/* Native WebGL MapLibre GL Container */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Guaranteed High-Precision SVG Polyline Path Overlay (Renders under white flow arrows, above basemap) */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
          overflow: "visible",
        }}
      >
        {/* Dashed Off-Route Connector: user GPS → nearest path point (Google Maps style) */}
        <path
          ref={svgConnectorRef}
          d=""
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="6 5"
          opacity="0.85"
        />
        {/* Outer Dark Blue Casing Line */}
        <path
          ref={svgCasingRef}
          d=""
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        {/* Inner Vibrant Blue Main Route Line */}
        <path
          ref={svgPathRef}
          d=""
          fill="none"
          stroke="#3b82f6"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="1"
        />
      </svg>

      {/* Floating Action Controls Stack */}
      <div className="absolute bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-3 sm:right-4 z-[400] flex flex-col gap-2.5 pointer-events-auto items-end">
        {/* Show / Hide Outdoor Nodes Toggle (Controlled by ENABLE_NODE_DEBUGGER) */}
        {ENABLE_NODE_DEBUGGER && (
          <button
            onClick={() => setShowDebugNodes((prev) => !prev)}
            className={`px-3 py-2 text-xs font-bold rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border transition-all flex items-center gap-1.5 active:scale-95 ${
              showDebugNodes
                ? "bg-purple-600 text-white border-purple-500 hover:bg-purple-700"
                : "bg-white text-gray-700 border-gray-100 hover:bg-gray-50"
            }`}
            title="Toggle Outdoor Graph Nodes & Edges Visibility"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12h3M18 12h3M12 3v3M12 18v2" />
            </svg>
            <span>{showDebugNodes ? "Hide Nodes" : "Show Nodes"}</span>
          </button>
        )}

        {/* Compass Rose Button — always resets map to face true North (0°) */}
        <button
          onClick={handleResetNorth}
          className="w-11 h-11 bg-white hover:bg-gray-50 rounded-full shadow-[0_4px_18px_rgba(0,0,0,0.18)] border border-gray-100 flex items-center justify-center transition-all active:scale-95 overflow-hidden"
          title="Align map to North"
          aria-label="Reset map to face North"
        >
          {/* Compass rose SVG — rotates so the red N tip always points toward true north on screen */}
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            style={{
              transform: `rotate(${-mapBearing}deg)`,
              transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "block",
            }}
            aria-hidden="true"
          >
            {/* Outer bezel ring */}
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Cardinal tick marks at N / E / S / W */}
            <line x1="18" y1="3"  x2="18" y2="6"  stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="33" y1="18" x2="30" y2="18" stroke="#94a3b8" strokeWidth="1"   strokeLinecap="round" />
            <line x1="18" y1="33" x2="18" y2="30" stroke="#94a3b8" strokeWidth="1"   strokeLinecap="round" />
            <line x1="3"  y1="18" x2="6"  y2="18" stroke="#94a3b8" strokeWidth="1"   strokeLinecap="round" />

            {/* North needle — red, points up (toward 0° / true north) */}
            <polygon
              points="18,4 21,18 18,16 15,18"
              fill="#ef4444"
              stroke="#dc2626"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />

            {/* South needle — white/slate, points down */}
            <polygon
              points="18,32 21,18 18,20 15,18"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />

            {/* Center pivot dot */}
            <circle cx="18" cy="18" r="2" fill="#1e293b" />

            {/* "N" label near the tip of the north needle */}
            <text
              x="18"
              y="13.5"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="5"
              fontWeight="700"
              fontFamily="system-ui, sans-serif"
              fill="#ef4444"
              letterSpacing="0"
            >N</text>
          </svg>
        </button>

        {/* Fit Route Button */}
        {route && route.length >= 2 && (
          <button
            onClick={handleFitRoute}
            className="w-10 h-10 bg-white hover:bg-gray-50 text-blue-600 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center transition-all active:scale-95"
            title="Fit Full Route on Screen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </button>
        )}

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className={`w-10 h-10 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border flex items-center justify-center transition-all active:scale-95 ${
            isNavigating && !isFollowing
              ? "bg-blue-600 text-white border-blue-500 animate-pulse ring-2 ring-blue-400"
              : "bg-white hover:bg-gray-50 text-blue-600 border-gray-100"
          }`}
          title={isNavigating && !isFollowing
            ? "Re-align and Resume Navigation Track"
            : heading !== null && heading !== undefined && !isNaN(heading)
              ? "Center on my location and rotate to my heading direction"
              : "Recenter on My Location"
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isNavigating && !isFollowing ? "#ffffff" : "#2563eb"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill={isNavigating && !isFollowing ? "#ffffff" : "#2563eb"} />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>

        {/* Zoom Controls Stack */}
        <div className="flex flex-col rounded-2xl bg-white shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 hover:bg-gray-50 text-gray-700 font-bold text-lg flex items-center justify-center border-b border-gray-100 active:scale-95 transition-all"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 hover:bg-gray-50 text-gray-700 font-bold text-lg flex items-center justify-center active:scale-95 transition-all"
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}

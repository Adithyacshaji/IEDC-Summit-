import { useEffect, useState, useMemo, useRef } from "react";
import { config, Map, Marker, LngLatBounds } from "maplibre-gl";
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

/**
 * Generates route flow arrow markers positioned along polyline segments.
 */
function generateRouteArrows(route = []) {
  if (!route || !Array.isArray(route) || route.length < 2) return [];

  const arrows = [];
  const STEP_METERS = 22; // Spacing between consecutive arrows along a segment

  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];

    if (!start || !end || start.length < 2 || end.length < 2) continue;

    const lat1 = start[0];
    const lng1 = start[1];
    const lat2 = end[0];
    const lng2 = end[1];

    const distMeters = calculateHaversineDistance(lat1, lng1, lat2, lng2);
    if (distMeters < 4) continue;

    const bearing = calculateBearing(lat1, lng1, lat2, lng2);
    const count = Math.max(1, Math.floor(distMeters / STEP_METERS));

    for (let k = 1; k <= count; k++) {
      const t = k / (count + 1);
      const arrowLat = lat1 + (lat2 - lat1) * t;
      const arrowLng = lng1 + (lng2 - lng1) * t;

      arrows.push({
        lat: arrowLat,
        lng: arrowLng,
        bearing: Math.round(bearing),
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
  heading,
  route = [],
  destination,
  isNavigating = false,
  onSelectLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { nodes = [], edges = [] } = useDatabase();
  const [showDebugNodes, setShowDebugNodes] = useState(ENABLE_NODE_DEBUGGER);

  // Track initial auto-focus & navigation transition state
  const initialCenteredRef = useRef(false);
  const lastPreviewRouteRef = useRef(null);
  const wasNavigatingRef = useRef(false);

  // Markers Refs
  const userMarkerRef = useRef(null);
  const userConeElRef = useRef(null);
  const destMarkerRef = useRef(null);
  const venueMarkersRef = useRef([]);
  const arrowMarkersRef = useRef([]);
  const debugMarkersRef = useRef([]);
  const svgPathRef = useRef(null);
  const svgCasingRef = useRef(null);

  // 1. Initial Load Auto-Focus (Fly to User Location once on map open)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || initialCenteredRef.current) return;

    if (currentLocation && Array.isArray(currentLocation) && currentLocation.length === 2 && !isNaN(currentLocation[0]) && !isNaN(currentLocation[1])) {
      map.flyTo({
        center: [currentLocation[1], currentLocation[0]],
        zoom: 18.8,
        pitch: 30,
        duration: 1000,
      });
      initialCenteredRef.current = true;
    }
  }, [currentLocation, mapLoaded]);

  // 2. Start Navigation Focus (Fly close-up to User Location once when 'Start Navigation' is clicked)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (isNavigating && !wasNavigatingRef.current) {
      wasNavigatingRef.current = true;
      if (currentLocation && Array.isArray(currentLocation) && currentLocation.length === 2 && !isNaN(currentLocation[0]) && !isNaN(currentLocation[1])) {
        map.flyTo({
          center: [currentLocation[1], currentLocation[0]],
          zoom: 19.5,
          pitch: 45,
          duration: 1200,
        });
      }
    } else if (!isNavigating) {
      wasNavigatingRef.current = false;
    }
  }, [isNavigating, currentLocation, mapLoaded]);

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

  // Derive map markers dynamically from DB nodes
  const mapMarkers = useMemo(() => {
    return nodes
      .filter((n) => n.building_name && n.latitude !== undefined && n.longitude !== undefined)
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
      zoom: 18.5,
      minZoom: 14,
      maxZoom: 22,
      pitch: 30, // 3D Camera tilt like Google Maps
      bearing: 0,
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

        // 3. Route Preview Auto-Fit: Fit full route bounds ONLY when route changes in Preview mode (!isNavigating)
        if (!isNavigating && lastPreviewRouteRef.current !== route) {
          lastPreviewRouteRef.current = route;
          const bounds = new LngLatBounds();
          lngLatCoords.forEach((coord) => bounds.extend(coord));

          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 160, left: 50, right: 50 },
            maxZoom: 19.5,
            duration: 1200,
          });
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

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "user-location-marker-container";
      el.style.width = "120px";
      el.style.height = "120px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.pointerEvents = "none";

      el.innerHTML = `
        <div style="position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <!-- Google Maps Spotlight Direction Cone (Rotates from exact dot center 60px, 60px) -->
          <div class="user-torch-cone-wrapper" style="
            position: absolute;
            inset: 0;
            width: 120px;
            height: 120px;
            pointer-events: none;
            transform-origin: 60px 60px;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 1;
            display: block;
          ">
            <svg width="120" height="120" viewBox="0 0 120 120" style="overflow: visible; pointer-events: none;">
              <defs>
                <radialGradient id="googleMapsBeamGrad" cx="60" cy="60" r="60" fx="60" fy="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#2563eb" stop-opacity="0.85" />
                  <stop offset="35%" stop-color="#3b82f6" stop-opacity="0.5" />
                  <stop offset="70%" stop-color="#60a5fa" stop-opacity="0.2" />
                  <stop offset="100%" stop-color="#93c5fd" stop-opacity="0" />
                </radialGradient>
                <filter id="headlightGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <!-- 60° Direction sector cone originating from center (60, 60) extending 55px forward -->
              <path d="M 60 60 L 32.5 12.4 A 55 55 0 0 1 87.5 12.4 Z" fill="url(#googleMapsBeamGrad)" filter="url(#headlightGlow)" />
            </svg>
          </div>

          <!-- Pulsing Halo Ring (z-index 2) -->
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            background: rgba(37, 99, 235, 0.25);
            border-radius: 50%;
            animation: pulse-ring 2s infinite;
            z-index: 2;
            pointer-events: none;
          "></div>

          <!-- Solid Blue Core User Location Dot (z-index 3) -->
          <div style="
            position: relative;
            width: 18px;
            height: 18px;
            background: #2563eb;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(37,99,235,0.55);
            z-index: 3;
            pointer-events: none;
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

    // Rotate Headlight Cone to Heading (Google Maps-style direction indicator)
    if (userConeElRef.current) {
      const activeHeading = (heading !== null && heading !== undefined && !isNaN(heading)) ? Math.round(heading) : 0;
      userConeElRef.current.style.display = "block";
      userConeElRef.current.style.transform = `rotate(${activeHeading}deg)`;
    }
  }, [currentLocation, heading, mapLoaded]);

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
            background: #2563eb;
            width: 36px;
            height: 36px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
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
      const iconBg = isSelected ? "#1d4ed8" : bg;
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
          box-shadow: ${isSelected ? "0 6px 18px rgba(37, 99, 235, 0.5)" : "0 4px 10px rgba(0,0,0,0.25)"};
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

    routeArrows.forEach((arrow, idx) => {
      if (idx < currentMarkers.length) {
        const marker = currentMarkers[idx];
        marker.setLngLat([arrow.lng, arrow.lat]);
        const el = marker.getElement();
        const rotateEl = el ? el.querySelector(".route-arrow-inner") : null;
        if (rotateEl) {
          rotateEl.style.transform = `rotate(${arrow.bearing}deg)`;
        }
      } else {
        const el = document.createElement("div");
        el.className = "route-arrow-marker";
        el.style.pointerEvents = "none";
        el.style.width = "20px";
        el.style.height = "20px";

        el.innerHTML = `
          <div class="route-arrow-inner" style="
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${arrow.bearing}deg);
            pointer-events: none;
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 1.5px 3px rgba(0,0,0,0.6));">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </div>
        `;

        const marker = new Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([arrow.lng, arrow.lat])
          .addTo(map);

        currentMarkers.push(marker);
      }
    });
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

      // 2. Render Nodes
      nodes.forEach((node) => {
        if (!node || node.latitude === undefined || node.longitude === undefined) return;
        const lat = parseFloat(node.latitude);
        const lng = parseFloat(node.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const el = document.createElement("div");
        el.className = "debug-node-marker";
        el.style.width = "14px";
        el.style.height = "14px";
        el.style.cursor = "pointer";

        el.innerHTML = `
          <div style="
            background: #9333ea;
            color: #ffffff;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `;

        const marker = new Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([lng, lat])
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
      mapRef.current.flyTo({
        center: [currentLocation[1], currentLocation[0]],
        zoom: 19.25,
        duration: 1000,
      });
    }
  };

  const handleResetNorth = () => {
    if (mapRef.current) {
      mapRef.current.easeTo({
        bearing: 0,
        pitch: 30,
        duration: 800,
      });
    }
  };

  const handleFitRoute = () => {
    if (route && Array.isArray(route) && route.length >= 2 && mapRef.current) {
      const bounds = new LngLatBounds();
      route.forEach((pt) => bounds.extend([pt[1], pt[0]]));

      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 160, left: 50, right: 50 },
        maxZoom: 19.5,
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

        {/* Compass / 3D Rotation Reset Button */}
        <button
          onClick={handleResetNorth}
          className="w-10 h-10 bg-white hover:bg-gray-50 text-gray-700 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center transition-all active:scale-95"
          title="Reset Map Rotation (North Up)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2" fill="#ef4444" stroke="#dc2626" />
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
          className="w-10 h-10 bg-white hover:bg-gray-50 text-blue-600 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center transition-all active:scale-95"
          title="Recenter on My Location"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" fill="#2563eb" />
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

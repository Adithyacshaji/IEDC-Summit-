/**
 * buildingPolygons.js
 *
 * Provides building-footprint polygons for Chavara Block and St. Mary's Block
 * derived from the existing ImageOverlay calibration bounds already in the
 * codebase (CHAVARA_BOUNDS_G and LOCKED_INDOOR_BOUNDS_RAW).
 *
 * Uses a lightweight ray-casting point-in-polygon algorithm so that we never
 * need @turf/turf.
 */

// ─── Building boundary polygons ───────────────────────────────────────────────
// Derived from the ImageOverlay bounds in floorImages.js / indoorGrid.js.
// Each polygon is an array of [lat, lng] corners in order (closed implicitly).

/**
 * Chavara Block indoor-detection zone — matches the "lawn-chavara-side" polygon
 * drawn on the campus map. If the user's GPS falls inside this area we ask
 * whether they are inside Chavara Block.
 */
export const CHAVARA_POLYGON = [
  [10.355565, 76.212459],
  [10.35557,  76.212711],
  [10.356272, 76.212716],
  [10.356282, 76.212443],
];

/**
 * St. Mary's Block indoor-detection zone — matches the "lawn-north" polygon
 * drawn on the campus map. If the user's GPS falls inside this area we ask
 * whether they are inside St. Mary's Block.
 */
export const ST_MARYS_POLYGON = [
  [10.35756,  76.212521],
  [10.357661, 76.212843],
  [10.357808, 76.212982],
  [10.358008, 76.21292 ],
  [10.358076, 76.212748],
  [10.357992, 76.212367],
];

// ─── Ray-casting point-in-polygon ────────────────────────────────────────────

/**
 * Returns true if the point (lat, lng) lies inside the given polygon.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {[number, number][]} polygon  Array of [lat, lng] corner pairs.
 * @returns {boolean}
 */
export function isInsidePolygon(lat, lng, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    
    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
      
    if (intersect) inside = !inside;
  }
  return inside;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether a GPS coordinate is inside (or very close to) one of the two
 * mapped buildings.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {"chavara" | "stmarys" | null}
 */
export function detectNearbyBuilding(lat, lng) {
  if (!lat || !lng) return null;

  if (isInsidePolygon(lat, lng, CHAVARA_POLYGON)) return "chavara";
  if (isInsidePolygon(lat, lng, ST_MARYS_POLYGON)) return "stmarys";

  return null;
}

/**
 * Human-readable display name for a building key.
 * @param {"chavara"|"stmarys"|string} key
 */
export function getBuildingDisplayName(key) {
  if (!key) return "the building";
  if (key === "chavara") return "Chavara Block";
  if (key === "stmarys") return "St. Mary's Block";
  return key;
}

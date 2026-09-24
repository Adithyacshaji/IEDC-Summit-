import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Polygon definitions ───────────────────────────────────────────────────────
// [lat, lng] corners. These match buildingPolygons.js in the client.

const CHAVARA_POLYGON: [number, number][] = [
  [10.355565, 76.212459],
  [10.355570, 76.212711],
  [10.356272, 76.212716],
  [10.356282, 76.212443],
];

const ST_MARYS_POLYGON: [number, number][] = [
  [10.357560, 76.212521],
  [10.357661, 76.212843],
  [10.357808, 76.212982],
  [10.358008, 76.212920],
  [10.358076, 76.212748],
  [10.357992, 76.212367],
];

// Approximate campus outer boundary
const CAMPUS_POLYGON: [number, number][] = [
  [10.354000, 76.211800],
  [10.354000, 76.213200],
  [10.358400, 76.213200],
  [10.358400, 76.211800],
];

// ── Ray-casting point-in-polygon ─────────────────────────────────────────────
function isInsidePolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
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

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { lat, lng } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ error: "lat and lng must be numbers" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    let zone: string | null = null;
    let displayName: string | null = null;

    if (isInsidePolygon(lat, lng, CHAVARA_POLYGON)) {
      zone = "chavara";
      displayName = "Chavara Block";
    } else if (isInsidePolygon(lat, lng, ST_MARYS_POLYGON)) {
      zone = "stmarys";
      displayName = "St. Mary's Block";
    } else if (isInsidePolygon(lat, lng, CAMPUS_POLYGON)) {
      zone = "campus";
      displayName = "Campus (Outdoor)";
    }
    // null = outside all known zones — no "offcampus" value

    return new Response(
      JSON.stringify({ zone, displayName, confidence: "high" }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

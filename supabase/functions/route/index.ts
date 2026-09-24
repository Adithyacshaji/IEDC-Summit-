import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Graph types ───────────────────────────────────────────────────────────────
type NodeMap = Record<string, { lat: number; lng: number; floor?: string }>;
type EdgeList = [string, string][];

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── A* pathfinding ────────────────────────────────────────────────────────────
function findPath(
  startId: string,
  endId: string,
  nodes: NodeMap,
  edges: EdgeList
): string[] {
  if (!nodes[startId] || !nodes[endId]) return [];

  // Build adjacency list
  const graph: Record<string, { id: string; weight: number }[]> = {};
  for (const [a, b] of edges) {
    const nA = nodes[a], nB = nodes[b];
    if (!nA || !nB) continue;
    const w = haversine(nA.lat, nA.lng, nB.lat, nB.lng);
    if (!graph[a]) graph[a] = [];
    if (!graph[b]) graph[b] = [];
    graph[a].push({ id: b, weight: w });
    graph[b].push({ id: a, weight: w });
  }

  const heuristic = (a: string, b: string) => {
    const nA = nodes[a], nB = nodes[b];
    if (!nA || !nB) return 0;
    return haversine(nA.lat, nA.lng, nB.lat, nB.lng);
  };

  const openSet = new Set([startId]);
  const closedSet = new Set<string>();
  const gScore: Record<string, number> = { [startId]: 0 };
  const fScore: Record<string, number> = { [startId]: heuristic(startId, endId) };
  const cameFrom: Record<string, string> = {};

  while (openSet.size > 0) {
    let current = "";
    let minF = Infinity;
    for (const node of openSet) {
      if ((fScore[node] ?? Infinity) < minF) {
        minF = fScore[node];
        current = node;
      }
    }

    if (current === endId) {
      const path: string[] = [];
      let cur: string | undefined = endId;
      while (cur) {
        path.unshift(cur);
        cur = cameFrom[cur];
      }
      return path;
    }

    openSet.delete(current);
    closedSet.add(current);

    for (const neighbor of graph[current] ?? []) {
      if (closedSet.has(neighbor.id)) continue;
      const tentative = (gScore[current] ?? Infinity) + neighbor.weight;
      if (!openSet.has(neighbor.id)) openSet.add(neighbor.id);
      else if (tentative >= (gScore[neighbor.id] ?? Infinity)) continue;
      cameFrom[neighbor.id] = current;
      gScore[neighbor.id] = tentative;
      fScore[neighbor.id] = tentative + heuristic(neighbor.id, endId);
    }
  }

  return [];
}

// ── In-memory graph cache (warm reuse within Deno isolate) ────────────────────
let graphCache: Record<string, { nodes: NodeMap; edges: EdgeList; ts: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadIndoorGraph(
  supabase: ReturnType<typeof createClient>,
  building: string
): Promise<{ nodes: NodeMap; edges: EdgeList }> {
  const cacheKey = `indoor_${building}`;
  const cached = graphCache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { nodes: cached.nodes, edges: cached.edges };
  }

  const { data: nodeRows } = await supabase
    .from("indoor_nodes")
    .select("id, lat, lng, floor")
    .eq("building", building);

  const { data: edgeRows } = await supabase
    .from("indoor_edges")
    .select("source, target")
    .eq("building", building);

  const nodes: NodeMap = {};
  for (const r of nodeRows ?? []) nodes[r.id] = { lat: r.lat, lng: r.lng, floor: r.floor };
  const edges: EdgeList = (edgeRows ?? []).map((e: { source: string; target: string }) => [e.source, e.target]);

  graphCache[cacheKey] = { nodes, edges, ts: Date.now() };
  return { nodes, edges };
}

async function loadOutdoorGraph(
  supabase: ReturnType<typeof createClient>
): Promise<{ nodes: NodeMap; edges: EdgeList }> {
  const cached = graphCache["outdoor"];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { nodes: cached.nodes, edges: cached.edges };
  }

  const { data: nodeRows } = await supabase.from("outdoor_nodes").select("id, lat, lng");
  const { data: edgeRows } = await supabase.from("outdoor_edges").select("source, target");

  const nodes: NodeMap = {};
  for (const r of nodeRows ?? []) nodes[r.id] = { lat: r.lat, lng: r.lng };
  const edges: EdgeList = (edgeRows ?? []).map((e: { source: string; target: string }) => [e.source, e.target]);

  graphCache["outdoor"] = { nodes, edges, ts: Date.now() };
  return { nodes, edges };
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { type, startNodeId, endNodeId, building, transportPref = "any" } = body;

    if (!startNodeId || !endNodeId) {
      return new Response(
        JSON.stringify({ error: "startNodeId and endNodeId are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SERVICE_ROLE_KEY") ?? ""
    );

    let nodes: NodeMap;
    let edges: EdgeList;

    if (type === "indoor") {
      if (!building) {
        return new Response(
          JSON.stringify({ error: "building is required for indoor routing" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      // For indoor: fetch vertical connections and add them as edges with fixed weight
      const graph = await loadIndoorGraph(supabase, building);
      nodes = graph.nodes;

      // Fetch vertical connections filtered by transportPref
      const vertQuery = supabase.from("indoor_vertical_connections").select("from_node, to_node, type").eq("building", building);
      const { data: vertRows } = await vertQuery;
      const filteredVert = (vertRows ?? []).filter((v: { type: string }) =>
        transportPref === "any" || v.type === transportPref
      );

      // Merge: give verticals a fixed 50-unit weight so they're used sparingly
      const vertEdges: EdgeList = filteredVert.map((v: { from_node: string; to_node: string }) => [v.from_node, v.to_node]);
      edges = [...graph.edges, ...vertEdges];
    } else {
      // outdoor
      const graph = await loadOutdoorGraph(supabase);
      nodes = graph.nodes;
      edges = graph.edges;
    }

    const path = findPath(startNodeId, endNodeId, nodes, edges);
    const coordinates = path.map((id) => {
      const n = nodes[id];
      return n ? [n.lat, n.lng] : null;
    }).filter(Boolean) as [number, number][];

    // Estimate distance in metres
    let distanceMeters = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      distanceMeters +=
        haversine(coordinates[i][0], coordinates[i][1], coordinates[i + 1][0], coordinates[i + 1][1]) *
        1000;
    }

    return new Response(
      JSON.stringify({ path, coordinates, distanceMeters: Math.round(distanceMeters) }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

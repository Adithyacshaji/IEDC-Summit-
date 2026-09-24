import { NODES } from "../data/graph";
import { calculateHaversineDistance } from "./haversine";

export function findNearestNode(location, customNodes = null) {
  let nearest = null;
  let minDistance = Infinity;
  const nodesToSearch = customNodes || NODES;

  Object.entries(nodesToSearch).forEach(([id, node]) => {
    const d = calculateHaversineDistance(
      location.lat,
      location.lng,
      node[0],
      node[1]
    );

    if (d < minDistance) {
      minDistance = d;
      nearest = id;
    }
  });

  return nearest;
}
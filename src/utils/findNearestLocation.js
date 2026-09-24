import { LOCATION_POINTS } from "../data/locationPoints";
import { calculateHaversineDistance } from "./haversine";

export function findNearestLocation(position, customPoints = null) {
  let nearest = null;
  let min = Infinity;
  const pointsToSearch = customPoints || LOCATION_POINTS;

  pointsToSearch.forEach((point) => {
    const d = calculateHaversineDistance(
      position.lat,
      position.lng,
      point.position[0],
      point.position[1]
    );

    if (d < min) {
      min = d;
      nearest = point;
    }
  });

  return nearest;
}
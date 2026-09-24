/**
 * Calculates the closest point on a polyline (route) to a given location,
 * and returns the snapped coordinate, the index of the segment, and the distance in meters.
 * Equirectangular coordinates are used as they are accurate at campus scale.
 * 
 * @param {Array} route - Array of [lat, lng] coordinates representing the path.
 * @param {Object} location - The user's GPS location {lat, lng}.
 * @returns {Object} { point, distanceMeters, segmentIndex }
 */
export function getDistanceToRoute(route, location) {
  if (!location || !route || route.length < 2) {
    return { point: route ? route[0] : null, distanceMeters: Infinity, segmentIndex: 0 };
  }

  const latScale = 111320; // roughly meters per degree latitude
  const lngScale = latScale * Math.cos(location.lat * Math.PI / 180);
  const userPoint = [location.lat, location.lng];
  
  let closest = { distanceSquared: Infinity, segment: 0, point: route[0] };

  for (let index = 0; index < route.length - 1; index += 1) {
    const start = route[index];
    const end = route[index + 1];
    
    const dx = (end[1] - start[1]) * lngScale;
    const dy = (end[0] - start[0]) * latScale;
    const lengthSquared = dx * dx + dy * dy;
    
    // t is the projection scalar (0 <= t <= 1)
    const t = lengthSquared 
      ? Math.max(0, Math.min(1, (((userPoint[1] - start[1]) * lngScale * dx) + ((userPoint[0] - start[0]) * latScale * dy)) / lengthSquared)) 
      : 0;
      
    const projected = [
      start[0] + (end[0] - start[0]) * t, 
      start[1] + (end[1] - start[1]) * t
    ];
    
    const distanceSquared = ((userPoint[1] - projected[1]) * lngScale) ** 2 + ((userPoint[0] - projected[0]) * latScale) ** 2;
    
    if (distanceSquared < closest.distanceSquared) {
      closest = { distanceSquared, segment: index, point: projected };
    }
  }

  return {
    point: closest.point,
    distanceMeters: Math.sqrt(closest.distanceSquared),
    segmentIndex: closest.segment
  };
}

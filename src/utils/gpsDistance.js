/**
 * Haversine distance in meters between two coordinates (array [lat, lng] or object { lat, lng }).
 */
export function gpsDistanceMeters(a, b) {
  if (!a || !b) return Infinity;

  const getLat = (p) => (Array.isArray(p) ? p[0] : (p.lat ?? p.latitude));
  const getLng = (p) => (Array.isArray(p) ? p[1] : (p.lng ?? p.longitude));

  const lat1 = getLat(a);
  const lng1 = getLng(a);
  const lat2 = getLat(b);
  const lng2 = getLng(b);

  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null || isNaN(lat1) || isNaN(lat2)) {
    return Infinity;
  }

  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
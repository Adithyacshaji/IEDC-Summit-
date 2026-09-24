const CAMPUS = {
  minLat: 10.35290,
  maxLat: 10.36020,
  minLng: 76.21070,
  maxLng: 76.21480,
};

export function isInsideCampus(location) {
  if (!location) return false;

  const MARGIN = 0.0002;

  return (
    location.lat >= CAMPUS.minLat - MARGIN &&
    location.lat <= CAMPUS.maxLat + MARGIN &&
    location.lng >= CAMPUS.minLng - MARGIN &&
    location.lng <= CAMPUS.maxLng + MARGIN
  );
}
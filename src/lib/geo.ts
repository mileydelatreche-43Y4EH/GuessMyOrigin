const EARTH_RADIUS_KM = 6371;
const MAX_SCORE = 5000;
/** Distance (km) at which score approaches ~0 — roughly antipode scale */
const SCORE_DECAY_KM = 2500;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** GeoGuessr-style: closer → nearer to 5000 */
export function scoreFromDistanceKm(distanceKm: number): number {
  const raw = MAX_SCORE * Math.exp(-distanceKm / SCORE_DECAY_KM);
  return Math.max(0, Math.round(raw));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

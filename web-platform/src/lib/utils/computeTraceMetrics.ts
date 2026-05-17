/**
 * Distancia haversine entre dos puntos GPS (lng, lat) en kilómetros.
 */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371; // radio Tierra km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distancia total de un LineString sumando consecutivos. */
export function totalDistanceKm(points: number[][]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    sum += haversineKm(points[i - 1] as [number, number], points[i] as [number, number]);
  }
  return Math.round(sum * 100) / 100;
}

/** Duración aproximada en minutos entre primer y último timestamp. */
export function durationMin(startedAt: Date, endedAt: Date | undefined): number {
  if (!endedAt) return 0;
  const ms = endedAt.getTime() - startedAt.getTime();
  return Math.max(0, Math.round(ms / 60_000));
}

/** Conteo de paradas visitadas (no skipped). */
export function countVisited(
  waypointsVisited: Array<{ skipped?: boolean }> | undefined
): { visited: number; skipped: number } {
  if (!waypointsVisited) return { visited: 0, skipped: 0 };
  let visited = 0;
  let skipped = 0;
  for (const w of waypointsVisited) {
    if (w.skipped) skipped += 1;
    else visited += 1;
  }
  return { visited, skipped };
}

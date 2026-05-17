import type { IRouteTrace } from '@/lib/models/RouteTrace';

/**
 * Elige la traza con mayor cobertura (más paradas visitadas y menos saltadas).
 * Devuelve null si no hay candidatas.
 */
export function selectByMostComplete(traces: IRouteTrace[]): IRouteTrace | null {
  if (!traces.length) return null;
  const scored = traces.map((t) => {
    const total = t.waypointsVisited + t.waypointsSkipped;
    const ratio = total > 0 ? t.waypointsVisited / total : 0;
    // Score: ratio de completitud * 100 + bonus por más visitadas en absoluto.
    return { t, score: ratio * 100 + t.waypointsVisited * 0.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].t;
}

/**
 * Elige la traza con más confirmaciones ciudadanas. Si empate, la más reciente.
 */
export function selectByMostConfirmed(traces: IRouteTrace[]): IRouteTrace | null {
  if (!traces.length) return null;
  const sorted = [...traces].sort((a, b) => {
    if (b.communityConfirmations !== a.communityConfirmations) {
      return b.communityConfirmations - a.communityConfirmations;
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  return sorted[0];
}

/**
 * Calcula una traza sintética como mediana de N trazas reales.
 *
 * Re-muestrea cada traza a una cantidad fija de puntos equiespaciados
 * (`samples`), y para cada índice toma la mediana del lng y lat de las trazas
 * disponibles. Es robusto a outliers (un conductor que se desvió no arrastra
 * la mediana).
 *
 * Devuelve coordenadas en formato [lng, lat][].
 */
export function medianTrace(traces: IRouteTrace[], samples = 64): number[][] {
  if (traces.length === 0) return [];
  if (traces.length === 1) return traces[0].points.coordinates;

  const resampled: number[][][] = traces.map((t) =>
    resampleLineString(t.points.coordinates, samples)
  );

  const median: number[][] = [];
  for (let i = 0; i < samples; i += 1) {
    const lngs: number[] = [];
    const lats: number[] = [];
    for (const traceSamples of resampled) {
      const pt = traceSamples[i];
      if (pt) {
        lngs.push(pt[0]);
        lats.push(pt[1]);
      }
    }
    if (lngs.length === 0) continue;
    median.push([medianOf(lngs), medianOf(lats)]);
  }
  return median;
}

/** Re-muestrea una polilínea a N puntos equiespaciados a lo largo de su longitud. */
function resampleLineString(coords: number[][], n: number): number[][] {
  if (coords.length < 2) return coords;
  const result: number[][] = [];
  // distancias acumuladas
  const acc: number[] = [0];
  for (let i = 1; i < coords.length; i += 1) {
    const d = euclid(coords[i - 1], coords[i]);
    acc.push(acc[i - 1] + d);
  }
  const totalLen = acc[acc.length - 1];
  if (totalLen === 0) return [coords[0]];
  for (let k = 0; k < n; k += 1) {
    const target = (totalLen * k) / (n - 1);
    // localizar segmento que contiene target
    let lo = 0;
    let hi = acc.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (acc[mid] < target) lo = mid;
      else hi = mid;
    }
    const segLen = acc[lo + 1] - acc[lo] || 1;
    const t = (target - acc[lo]) / segLen;
    const x = coords[lo][0] + t * (coords[lo + 1][0] - coords[lo][0]);
    const y = coords[lo][1] + t * (coords[lo + 1][1] - coords[lo][1]);
    result.push([x, y]);
  }
  return result;
}

function euclid(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

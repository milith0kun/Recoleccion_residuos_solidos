import type { RouteStatus } from '@/lib/models/Route';

export type { RouteStatus };

export const VALID_STATUSES: RouteStatus[] = [
  'draft',
  'pending',
  'active',
  'completed',
  'inactive',
];

export interface WaypointInput {
  order: number;
  name: string;
  location: { type?: 'Point'; coordinates: [number, number] };
  estimatedArrival?: string;
}

export interface PathInput {
  type?: 'LineString';
  coordinates: number[][];
}

/**
 * Verifies that a route can transition to "active". Returns an error message
 * (string) if invalid, or null when the transition is allowed.
 *
 * Rules: must have at least one waypoint AND a path (LineString) with at
 * least two coordinate pairs.
 */
export function validateActiveTransition(
  waypoints: WaypointInput[] | undefined,
  path: PathInput | undefined
): string | null {
  if (!waypoints || waypoints.length === 0) {
    return 'Para activar una ruta debes definir al menos un waypoint';
  }
  if (!path || !Array.isArray(path.coordinates) || path.coordinates.length < 2) {
    return 'Para activar una ruta el path (LineString) debe tener al menos dos coordenadas';
  }
  return null;
}

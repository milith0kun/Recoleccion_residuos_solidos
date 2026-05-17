import type { ZoneRef } from '../context/AuthContext';

type ZoneInput = string | ZoneRef | null | undefined;

export function getZoneId(zone: ZoneInput): string | null {
  if (!zone) return null;
  if (typeof zone === 'string') return zone;
  return zone._id ?? null;
}

export function getZoneName(zone: ZoneInput): string | null {
  if (!zone) return null;
  if (typeof zone === 'string') return null;
  return zone.name ?? null;
}

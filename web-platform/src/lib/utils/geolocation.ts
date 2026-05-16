import Zone from '@/lib/models/Zone';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'SRSS-Cusco/1.0 (academic-mvp)';
const TIMEOUT_MS = 5000;

interface NominatimResult {
  lat: string;
  lon: string;
}

export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!address || !address.trim()) return null;

  const url = `${NOMINATIM_URL}?format=json&q=${encodeURIComponent(address)}&countrycodes=pe&limit=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'es' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return [lng, lat];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function findZoneContaining(lng: number, lat: number) {
  return Zone.findOne({
    isActive: true,
    geometry: { $geoIntersects: { $geometry: { type: 'Point', coordinates: [lng, lat] } } },
  });
}

export interface AssignZoneResult {
  location: { type: 'Point'; coordinates: [number, number] } | null;
  zone: unknown | null;
}

export async function assignZoneByAddress(address: string): Promise<AssignZoneResult> {
  const coords = await geocodeAddress(address);
  if (!coords) return { location: null, zone: null };
  const zone = await findZoneContaining(coords[0], coords[1]);
  return {
    location: { type: 'Point', coordinates: coords },
    zone: zone?._id ?? null,
  };
}

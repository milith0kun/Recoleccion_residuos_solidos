import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { findZoneContaining, geocodeAddress } from '@/lib/utils/geolocation';

export async function POST(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const { address, lat, lng } = body as {
      address?: string;
      lat?: number;
      lng?: number;
    };

    let coords: [number, number] | null = null;

    if (typeof lat === 'number' && typeof lng === 'number') {
      coords = [lng, lat];
    } else if (address) {
      coords = await geocodeAddress(address);
    } else {
      return errorResponse('Debe proporcionar address o (lat,lng)', 400);
    }

    if (!coords) {
      return successResponse(
        { location: null, zone: null, matched: false },
        'No se pudo geolocalizar'
      );
    }

    const zone = await findZoneContaining(coords[0], coords[1]);

    return successResponse(
      {
        location: { type: 'Point', coordinates: coords },
        zone: zone
          ? {
              _id: zone._id,
              name: zone.name,
              district: zone.district,
              color: zone.color,
            }
          : null,
        matched: !!zone,
      },
      zone ? 'Zona detectada' : 'Sin zona asignada para esta ubicación'
    );
  } catch (err) {
    console.error('Zone detect error:', err);
    return errorResponse('Error al detectar zona', 500);
  }
}

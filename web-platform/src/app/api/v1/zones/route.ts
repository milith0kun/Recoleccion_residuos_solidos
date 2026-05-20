import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Zone from '@/lib/models/Zone';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function GET(request: NextRequest) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const filter = includeInactive ? {} : { isActive: true };
    const zones = await Zone.find(filter).sort({ name: 1 });
    return successResponse(zones);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener zonas', 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const { name, description, district, geometry, color } = body;

    if (!name || !description || !district || !geometry) {
      return errorResponse('Nombre, descripción, distrito y geometría son obligatorios', 400);
    }

    const existing = await Zone.findOne({ name });
    if (existing) {
      return errorResponse('Ya existe una zona con ese nombre', 409);
    }

    // Check overlap
    if (geometry.coordinates && geometry.coordinates.length > 0) {
      const overlap = await Zone.findOne({
        isActive: true,
        geometry: {
          $geoIntersects: {
            $geometry: { type: 'Polygon', coordinates: geometry.coordinates },
          },
        },
      });
      if (overlap) {
        return errorResponse(
          `El polígono se superpone con la zona "${overlap.name}"`,
          409,
          'ZONE_OVERLAP'
        );
      }
    }

    const zone = await Zone.create({
      name,
      description,
      district,
      geometry: { type: 'Polygon', coordinates: geometry.coordinates },
      color: color || '#10B981',
      createdBy: user!.sub,
    });

    return successResponse(zone, 'Zona creada exitosamente', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al crear zona', 500);
  }
}

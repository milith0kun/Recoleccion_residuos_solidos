import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import Zone from '@/lib/models/Zone';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('ID de zona inválido', 400);
    }
    const zone = await Zone.findById(id);
    if (!zone) return errorResponse('Zona no encontrada', 404);
    return successResponse(zone);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener zona', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('ID de zona inválido', 400);
    }

    const body = await request.json();
    const { name, description, district, geometry, color, isActive } = body;

    if (!name || !description || !district || !geometry?.coordinates?.length) {
      return errorResponse('Nombre, descripción, distrito y geometría son obligatorios', 400);
    }

    const existingByName = await Zone.findOne({ name, _id: { $ne: id } });
    if (existingByName) {
      return errorResponse('Ya existe una zona con ese nombre', 409);
    }

    const overlap = await Zone.findOne({
      _id: { $ne: id },
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

    const zone = await Zone.findByIdAndUpdate(
      id,
      {
        name: String(name).trim(),
        description: String(description).trim(),
        district: String(district).trim(),
        geometry: { type: 'Polygon', coordinates: geometry.coordinates },
        color: color || '#10B981',
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      { new: true }
    );
    if (!zone) return errorResponse('Zona no encontrada', 404);
    return successResponse(zone, 'Zona actualizada');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar zona', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('ID de zona inválido', 400);
    }
    const zone = await Zone.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!zone) return errorResponse('Zona no encontrada', 404);
    return successResponse(null, 'Zona desactivada');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al desactivar zona', 500);
  }
}

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

const ALLOWED_FIELDS = ['firstName', 'lastName', 'phone', 'dni', 'zone'] as const;
type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function GET(request: NextRequest) {
  const { user: jwtUser, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const user = await User.findById(jwtUser!.sub)
      .select('-password')
      .populate('zone', 'name color district');
    if (!user) return errorResponse('Usuario no encontrado', 404);
    return successResponse(user);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener perfil', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const { user: jwtUser, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const update: Partial<Record<AllowedField, unknown>> = {};

    for (const key of ALLOWED_FIELDS) {
      if (!(key in body)) continue;
      const value = body[key];
      if (value === undefined) continue;
      update[key] = typeof value === 'string' ? value.trim() : value;
    }

    if ('dni' in update) {
      const dni = update.dni as string;
      if (dni) {
        if (!/^\d{8}$/.test(dni)) {
          return errorResponse('El DNI debe tener exactamente 8 dígitos', 400, 'INVALID_DNI');
        }
        const dup = await User.findOne({ dni, _id: { $ne: jwtUser!.sub } });
        if (dup) return errorResponse('Ya existe otro usuario con ese DNI', 409, 'DNI_TAKEN');
      } else {
        update.dni = null;
      }
    }

    let zoneId: mongoose.Types.ObjectId | null | undefined;
    if ('zone' in update) {
      const raw = update.zone as string | null;
      if (raw) {
        if (!mongoose.Types.ObjectId.isValid(raw)) {
          return errorResponse('Zona inválida', 400, 'INVALID_ZONE');
        }
        const zone = await Zone.findById(raw).select('_id isActive');
        if (!zone) return errorResponse('Zona no encontrada', 404, 'ZONE_NOT_FOUND');
        if (zone.isActive === false) {
          return errorResponse('La zona no está activa', 400, 'ZONE_INACTIVE');
        }
        zoneId = new mongoose.Types.ObjectId(raw);
      } else {
        zoneId = null;
      }
      update.zone = zoneId;
    }

    const current = await User.findById(jwtUser!.sub).select('zone');
    if (!current) return errorResponse('Usuario no encontrado', 404);

    const finalZone = 'zone' in update ? zoneId : current.zone;
    (update as Record<string, unknown>).profileComplete = Boolean(finalZone);

    const updated = await User.findByIdAndUpdate(
      jwtUser!.sub,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('zone', 'name color district');

    if (!updated) return errorResponse('Usuario no encontrado', 404);
    return successResponse(updated, 'Perfil actualizado correctamente');
  } catch (err) {
    console.error('PATCH /users/me error:', err);
    return errorResponse('Error al actualizar perfil', 500);
  }
}

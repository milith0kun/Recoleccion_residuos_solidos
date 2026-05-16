import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const { zoneId } = await request.json();

    const user = await User.findById(id);
    if (!user) return errorResponse('Usuario no encontrado', 404);

    if (zoneId === null || zoneId === undefined || zoneId === '') {
      user.zone = undefined;
      await user.save();
      const populated = await User.findById(user._id)
        .select('-password')
        .populate('zone', 'name color district');
      return successResponse(populated, 'Zona desasignada');
    }

    const zone = await Zone.findById(zoneId);
    if (!zone || !zone.isActive) {
      return errorResponse('Zona no encontrada o inactiva', 404);
    }

    user.zone = zone._id;
    await user.save();

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('zone', 'name color district');

    return successResponse(populated, 'Zona asignada correctamente');
  } catch (err) {
    console.error('Assign zone error:', err);
    return errorResponse('Error al asignar zona', 500);
  }
}

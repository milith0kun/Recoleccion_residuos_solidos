import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import Notification from '@/lib/models/Notification';
import ZoneAssignmentAudit from '@/lib/models/ZoneAssignmentAudit';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: authUser, error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const { zoneId, reason } = await request.json();

    const user = await User.findById(id);
    if (!user) return errorResponse('Usuario no encontrado', 404);

    const previousZoneId = user.zone ? user.zone.toString() : null;

    if (zoneId === null || zoneId === undefined || zoneId === '') {
      user.zone = undefined;
      await user.save();

      await ZoneAssignmentAudit.create({
        user: user._id,
        changedBy: authUser!.sub,
        previousZone: previousZoneId || undefined,
        newZone: undefined,
        reason: String(reason || '').trim() || 'Ajuste manual por administrador',
      });

      await Notification.create({
        recipient: user._id,
        kind: 'system',
        title: 'Asignación de zona actualizada',
        body: 'Un administrador retiró tu zona de recolección. Queda pendiente de revisión.',
        data: { type: 'zone_assignment', status: 'pending' },
      });

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

    await ZoneAssignmentAudit.create({
      user: user._id,
      changedBy: authUser!.sub,
      previousZone: previousZoneId || undefined,
      newZone: zone._id,
      reason: String(reason || '').trim() || 'Ajuste manual por administrador',
    });

    await Notification.create({
      recipient: user._id,
      kind: 'system',
      title: 'Zona de recolección asignada',
      body: `Un administrador te asignó la zona ${zone.name}.`,
      data: { type: 'zone_assignment', zoneId: zone._id.toString(), zoneName: zone.name },
    });

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('zone', 'name color district');

    return successResponse(populated, 'Zona asignada correctamente');
  } catch (err) {
    console.error('Assign zone error:', err);
    return errorResponse('Error al asignar zona', 500);
  }
}

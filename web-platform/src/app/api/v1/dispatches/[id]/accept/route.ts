import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Dispatch from '@/lib/models/Dispatch';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToUser } from '@/lib/utils/push';

void User;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'driver', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const dispatch = await Dispatch.findById(id);
    if (!dispatch) return errorResponse('Salida no encontrada', 404);
    if (String(dispatch.driver) !== user!.sub && user!.role !== 'admin') {
      return errorResponse('Esta salida no te pertenece', 403);
    }
    if (dispatch.status !== 'pending') {
      return errorResponse(
        `No se puede aceptar una salida en estado "${dispatch.status}"`,
        409,
        'STATUS_LOCKED'
      );
    }

    dispatch.status = 'accepted';
    dispatch.acceptedAt = new Date();
    await dispatch.save();

    // Cargar nombre del conductor para mensaje informativo.
    const driver = await User.findById(dispatch.driver)
      .select('firstName lastName')
      .lean<{ firstName?: string; lastName?: string }>();
    const driverName = driver
      ? `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() || 'el conductor'
      : 'el conductor';

    pushToUser(dispatch.assignedBy, {
      title: 'Salida aceptada',
      body: `${driverName} aceptó la salida ${dispatch.code}. Se iniciará en el horario programado.`,
      channelId: 'dispatches',
      priority: 'high',
      data: {
        url: '/(planner)/dispatches',
        kind: 'dispatch_accepted',
        dispatchId: String(dispatch._id),
      },
    }).catch((e) => console.warn('[push] dispatch_accepted failed', e));

    return successResponse(dispatch, 'Salida aceptada');
  } catch (err) {
    console.error('PATCH /dispatches/[id]/accept error:', err);
    return errorResponse('Error al aceptar salida', 500);
  }
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Dispatch from '@/lib/models/Dispatch';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToUser } from '@/lib/utils/push';

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
    if (dispatch.status !== 'pending' && dispatch.status !== 'accepted') {
      return errorResponse(
        `No se puede rechazar una salida en estado "${dispatch.status}"`,
        409,
        'STATUS_LOCKED'
      );
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const reason = body.reason?.trim();
    if (!reason || reason.length < 3) {
      return errorResponse('Indicá el motivo del rechazo (mín. 3 caracteres)', 400);
    }

    dispatch.status = 'rejected';
    dispatch.rejectedAt = new Date();
    dispatch.rejectReason = reason;
    await dispatch.save();

    pushToUser(dispatch.assignedBy, {
      title: 'Salida rechazada',
      body: `${dispatch.code} fue rechazada. Motivo: ${reason.slice(0, 80)}`,
      data: {
        url: '/(planner)/dispatches',
        kind: 'dispatch_rejected',
        dispatchId: String(dispatch._id),
      },
    }).catch((e) => console.warn('[push] dispatch_rejected failed', e));

    return successResponse(dispatch, 'Salida rechazada');
  } catch (err) {
    console.error('PATCH /dispatches/[id]/reject error:', err);
    return errorResponse('Error al rechazar salida', 500);
  }
}

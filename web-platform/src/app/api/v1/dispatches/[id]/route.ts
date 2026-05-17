import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Dispatch from '@/lib/models/Dispatch';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToUser } from '@/lib/utils/push';

interface PatchBody {
  scheduledFor?: string;
  vehicle?: string | null;
  notes?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const dispatch = await Dispatch.findById(id)
      .populate('route', 'name zone waypoints schedule path')
      .populate('driver', 'firstName lastName email phone')
      .populate('assignedBy', 'firstName lastName email')
      .populate('vehicle', 'plate type');
    if (!dispatch) return errorResponse('Salida no encontrada', 404);

    // Driver puro solo ve las suyas.
    if (
      user!.role === 'driver' &&
      String(dispatch.driver._id ?? dispatch.driver) !== user!.sub
    ) {
      return errorResponse('Sin permisos', 403);
    }
    return successResponse(dispatch);
  } catch (err) {
    console.error('GET /dispatches/[id] error:', err);
    return errorResponse('Error al obtener salida', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const dispatch = await Dispatch.findById(id);
    if (!dispatch) return errorResponse('Salida no encontrada', 404);

    if (dispatch.status === 'in_progress' || dispatch.status === 'completed') {
      return errorResponse('No se puede editar una salida ya iniciada', 409, 'STATUS_LOCKED');
    }

    const body = (await request.json()) as PatchBody;
    if (body.scheduledFor) {
      const d = new Date(body.scheduledFor);
      if (Number.isNaN(d.getTime())) return errorResponse('scheduledFor inválido', 400);
      dispatch.scheduledFor = d;
    }
    if ('vehicle' in body) {
      dispatch.vehicle = (body.vehicle as never) || undefined;
    }
    if (typeof body.notes === 'string') {
      dispatch.notes = body.notes.trim();
    }
    await dispatch.save();

    return successResponse(dispatch, 'Salida actualizada');
  } catch (err) {
    console.error('PATCH /dispatches/[id] error:', err);
    return errorResponse('Error al actualizar salida', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const dispatch = await Dispatch.findById(id);
    if (!dispatch) return errorResponse('Salida no encontrada', 404);
    if (dispatch.status === 'in_progress' || dispatch.status === 'completed') {
      return errorResponse('No se puede cancelar una salida ya iniciada', 409);
    }

    const body = await request.json().catch(() => ({}));
    dispatch.status = 'cancelled';
    dispatch.cancelledAt = new Date();
    dispatch.cancelReason = (body as { reason?: string }).reason?.trim();
    await dispatch.save();

    pushToUser(dispatch.driver, {
      title: `Salida cancelada: ${dispatch.code}`,
      body: dispatch.cancelReason
        ? `El operador canceló la salida. Motivo: ${dispatch.cancelReason.slice(0, 100)}`
        : 'El operador canceló esta salida. Revisá la app para más detalles.',
      channelId: 'dispatches',
      priority: 'high',
      data: {
        url: '/(driver)/jornada',
        kind: 'dispatch_cancelled',
        dispatchId: String(dispatch._id),
      },
    }).catch((e) => console.warn('[push] dispatch_cancelled failed', e));

    return successResponse({ _id: id, status: dispatch.status }, 'Salida cancelada');
  } catch (err) {
    console.error('DELETE /dispatches/[id] error:', err);
    return errorResponse('Error al cancelar salida', 500);
  }
}

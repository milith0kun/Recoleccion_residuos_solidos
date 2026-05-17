import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Notification from '@/lib/models/Notification';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

/** Marca una notificación como leída (o no leída si body.read=false). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { read?: boolean };
    const read = body.read !== false; // default true (marcar como leída)

    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipient: user!.sub },
      read ? { read: true, readAt: new Date() } : { read: false, readAt: null },
      { new: true }
    );
    if (!notif) return errorResponse('Notificación no encontrada', 404);
    return successResponse(notif);
  } catch (err) {
    console.error('PATCH /notifications/[id] error:', err);
    return errorResponse('Error al actualizar notificación', 500);
  }
}

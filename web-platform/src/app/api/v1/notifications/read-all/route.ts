import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Notification from '@/lib/models/Notification';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

/** Marca todas las notificaciones del usuario como leídas. */
export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const result = await Notification.updateMany(
      { recipient: user!.sub, read: false },
      { read: true, readAt: new Date() }
    );
    return successResponse({ updated: result.modifiedCount });
  } catch (err) {
    console.error('POST /notifications/read-all error:', err);
    return errorResponse('Error al marcar notificaciones', 500);
  }
}

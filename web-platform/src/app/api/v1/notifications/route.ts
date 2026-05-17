import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Notification from '@/lib/models/Notification';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

/**
 * Lista las notificaciones del usuario autenticado (las más recientes).
 * Query params:
 *   - `unread=1`  → sólo no leídas
 *   - `limit=N`   → tope de resultados (default 30, max 100)
 */
export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const unread = searchParams.get('unread') === '1';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '30', 10) || 30, 1), 100);

    const filter: Record<string, unknown> = { recipient: user!.sub };
    if (unread) filter.read = false;

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ recipient: user!.sub, read: false }),
    ]);

    return successResponse({ items, unreadCount });
  } catch (err) {
    console.error('GET /notifications error:', err);
    return errorResponse('Error al obtener notificaciones', 500);
  }
}

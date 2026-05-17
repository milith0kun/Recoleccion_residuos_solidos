import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteTrace from '@/lib/models/RouteTrace';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

void User;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const traces = await RouteTrace.find({ route: id })
      .populate('driver', 'firstName lastName')
      .sort({ date: -1 })
      .limit(50)
      // No mandar el array completo de puntos en el listado (puede ser largo).
      .select('-points');
    return successResponse(traces);
  } catch (err) {
    console.error('GET /routes/[id]/traces error:', err);
    return errorResponse('Error al obtener trazas', 500);
  }
}

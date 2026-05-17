import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteTrace from '@/lib/models/RouteTrace';
import User from '@/lib/models/User';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
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
    const trace = await RouteTrace.findById(id)
      .populate('driver', 'firstName lastName')
      .populate('route', 'name zone')
      .lean();
    if (!trace) return errorResponse('Traza no encontrada', 404);
    return successResponse(trace);
  } catch (err) {
    console.error('GET /traces/[id] error:', err);
    return errorResponse('Error al obtener traza', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const trace = await RouteTrace.findById(id);
    if (!trace) return errorResponse('Traza no encontrada', 404);
    if (trace.isOfficial) {
      return errorResponse('No se puede eliminar la traza oficial vigente', 409);
    }
    await trace.deleteOne();
    return successResponse({ _id: id }, 'Traza eliminada');
  } catch (err) {
    console.error('DELETE /traces/[id] error:', err);
    return errorResponse('Error al eliminar traza', 500);
  }
}

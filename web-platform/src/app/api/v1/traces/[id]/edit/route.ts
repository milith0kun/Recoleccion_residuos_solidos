import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteTrace from '@/lib/models/RouteTrace';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { totalDistanceKm } from '@/lib/utils/computeTraceMetrics';

interface EditBody {
  /** Nuevo LineString [[lng,lat], ...] que reemplaza al actual. */
  points?: number[][];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const trace = await RouteTrace.findById(id);
    if (!trace) return errorResponse('Traza no encontrada', 404);

    const body = (await request.json()) as EditBody;
    if (!Array.isArray(body.points) || body.points.length < 2) {
      return errorResponse('points debe ser un array con al menos 2 coordenadas', 400);
    }
    for (const p of body.points) {
      if (
        !Array.isArray(p) ||
        p.length !== 2 ||
        typeof p[0] !== 'number' ||
        typeof p[1] !== 'number'
      ) {
        return errorResponse('Cada punto debe ser [lng, lat] numérico', 400);
      }
    }

    trace.points = { type: 'LineString', coordinates: body.points };
    trace.totalDistanceKm = totalDistanceKm(body.points);
    trace.isSynthetic = true; // editar manualmente la marca como sintética
    await trace.save();

    return successResponse(trace, 'Traza editada');
  } catch (err) {
    console.error('PATCH /traces/[id]/edit error:', err);
    return errorResponse('Error al editar traza', 500);
  }
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteTrace, {
  TRACE_SELECTION_METHODS,
  type TraceSelectionMethod,
} from '@/lib/models/RouteTrace';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import {
  selectByMostComplete,
  selectByMostConfirmed,
  medianTrace,
} from '@/lib/utils/traceSelection';
import { totalDistanceKm } from '@/lib/utils/computeTraceMetrics';

interface AutoSelectBody {
  method?: TraceSelectionMethod;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = (await request.json()) as AutoSelectBody;
    const method = body.method;
    if (!method || !TRACE_SELECTION_METHODS.includes(method)) {
      return errorResponse(
        `method debe ser uno de: ${TRACE_SELECTION_METHODS.join(', ')}`,
        400
      );
    }

    const traces = await RouteTrace.find({ route: id, isSynthetic: { $ne: true } });
    if (traces.length === 0) {
      return errorResponse('No hay trazas históricas para esta ruta', 404);
    }

    // Quitar oficial vigente.
    await RouteTrace.updateMany({ route: id, isOfficial: true }, { $set: { isOfficial: false } });

    if (method === 'median') {
      // Borrar sintética anterior si existe, generar una nueva.
      await RouteTrace.deleteMany({ route: id, isSynthetic: true });
      const coords = medianTrace(traces);
      const synthetic = await RouteTrace.create({
        route: id,
        date: new Date(),
        points: { type: 'LineString', coordinates: coords },
        totalDistanceKm: totalDistanceKm(coords),
        durationMin: Math.round(
          traces.reduce((s, t) => s + (t.durationMin ?? 0), 0) / traces.length
        ),
        waypointsVisited: Math.round(
          traces.reduce((s, t) => s + t.waypointsVisited, 0) / traces.length
        ),
        waypointsSkipped: 0,
        communityConfirmations: traces.reduce((s, t) => s + t.communityConfirmations, 0),
        isOfficial: true,
        isSynthetic: true,
        selectionMethod: 'median',
        selectedBy: user!.sub,
        selectedAt: new Date(),
      });
      return successResponse(synthetic, 'Traza mediana creada y promovida a oficial');
    }

    const winner =
      method === 'most_complete'
        ? selectByMostComplete(traces)
        : selectByMostConfirmed(traces);
    if (!winner) return errorResponse('No se pudo elegir traza', 500);

    winner.isOfficial = true;
    winner.selectionMethod = method;
    winner.selectedBy = user!.sub as never;
    winner.selectedAt = new Date();
    await winner.save();

    return successResponse(winner, 'Traza promovida a oficial');
  } catch (err) {
    console.error('POST /routes/[id]/traces/auto-select error:', err);
    return errorResponse('Error al auto-seleccionar traza', 500);
  }
}

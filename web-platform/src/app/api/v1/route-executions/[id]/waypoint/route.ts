import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteExecution from '@/lib/models/RouteExecution';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

interface WaypointArrivalBody {
  waypoint: number;
  skipped?: boolean;
  skipReason?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'driver', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const execution = await RouteExecution.findById(id);
    if (!execution) return errorResponse('Ejecución no encontrada', 404);

    if (user!.role !== 'admin' && String(execution.operator) !== user!.sub) {
      return errorResponse('Sin permisos para esta ejecución', 403);
    }

    if (execution.status !== 'in_progress') {
      return errorResponse('La ejecución no está en progreso', 400);
    }

    const body = (await request.json()) as WaypointArrivalBody;
    if (typeof body.waypoint !== 'number') {
      return errorResponse('waypoint (order) es obligatorio y debe ser número', 400);
    }

    execution.waypointsVisited.push({
      waypoint: body.waypoint,
      arrivedAt: new Date(),
      skipped: !!body.skipped,
      skipReason: body.skipReason,
    });

    await execution.save();

    return successResponse(
      { waypointsVisited: execution.waypointsVisited },
      'Waypoint registrado',
      201
    );
  } catch (err) {
    console.error(err);
    return errorResponse('Error al registrar waypoint', 500);
  }
}

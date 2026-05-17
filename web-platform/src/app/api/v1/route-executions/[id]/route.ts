import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Route from '@/lib/models/Route';
import RouteExecution from '@/lib/models/RouteExecution';
import Vehicle from '@/lib/models/Vehicle';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToZone } from '@/lib/utils/push';

void Vehicle;

const VALID_PATCH_STATUSES = ['in_progress', 'completed', 'cancelled', 'delayed'] as const;
type PatchStatus = (typeof VALID_PATCH_STATUSES)[number];

interface CollectionDataInput {
  organicKg?: number;
  recyclableKg?: number;
  nonRecyclableKg?: number;
  observations?: string;
}

interface WaypointVisitedInput {
  waypoint: number;
  arrivedAt?: string | Date;
  skipped?: boolean;
  skipReason?: string;
}

interface PatchBody {
  status?: PatchStatus;
  endedAt?: string | Date;
  collectionData?: CollectionDataInput;
  waypointsVisited?: WaypointVisitedInput[];
  delayMinutes?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const execution = await RouteExecution.findById(id)
      .populate('route', 'name zone status waypoints path')
      .populate('vehicle', 'plate type capacity')
      .populate('operator', 'firstName lastName email');
    if (!execution) return errorResponse('Ejecución no encontrada', 404);
    return successResponse(execution);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener ejecución', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const execution = await RouteExecution.findById(id);
    if (!execution) return errorResponse('Ejecución no encontrada', 404);

    if (user!.role !== 'admin' && String(execution.operator) !== user!.sub) {
      return errorResponse('Sin permisos para modificar esta ejecución', 403);
    }

    const body = (await request.json()) as PatchBody;

    const previousStatus = execution.status;
    if (typeof body.status !== 'undefined') {
      if (!VALID_PATCH_STATUSES.includes(body.status)) {
        return errorResponse(
          `Estado inválido. Permitidos: ${VALID_PATCH_STATUSES.join(', ')}`,
          400
        );
      }
      execution.status = body.status;
    }

    if (typeof body.endedAt !== 'undefined') {
      const endedAt = new Date(body.endedAt);
      if (Number.isNaN(endedAt.getTime())) {
        return errorResponse('endedAt inválido', 400);
      }
      execution.endedAt = endedAt;
    }

    if (typeof body.collectionData !== 'undefined') {
      const cd = body.collectionData;
      execution.collectionData = {
        organicKg:
          typeof cd.organicKg === 'number' ? cd.organicKg : execution.collectionData.organicKg,
        recyclableKg:
          typeof cd.recyclableKg === 'number'
            ? cd.recyclableKg
            : execution.collectionData.recyclableKg,
        nonRecyclableKg:
          typeof cd.nonRecyclableKg === 'number'
            ? cd.nonRecyclableKg
            : execution.collectionData.nonRecyclableKg,
        observations:
          typeof cd.observations === 'string'
            ? cd.observations
            : execution.collectionData.observations,
      };
    }

    if (Array.isArray(body.waypointsVisited)) {
      execution.waypointsVisited = body.waypointsVisited.map((wp) => ({
        waypoint: wp.waypoint,
        arrivedAt: wp.arrivedAt ? new Date(wp.arrivedAt) : new Date(),
        skipped: !!wp.skipped,
        skipReason: wp.skipReason,
      }));
    }

    if (typeof body.delayMinutes === 'number') {
      execution.delayMinutes = body.delayMinutes;
    }

    // If transitioning out of in_progress, autoset endedAt and update Route
    const closing =
      typeof body.status !== 'undefined' &&
      (body.status === 'completed' || body.status === 'cancelled');

    if (closing && !execution.endedAt) {
      execution.endedAt = new Date();
    }

    await execution.save();

    if (closing) {
      const route = await Route.findById(execution.route);
      if (route) {
        // Only clear pointer if this is still the current execution
        if (
          route.currentExecution &&
          String(route.currentExecution) === String(execution._id)
        ) {
          route.currentExecution = null;
        }
        route.status = body.status === 'completed' ? 'completed' : 'inactive';
        await route.save();
      }
    }

    // Avisar a los ciudadanos cuando el estado cambia a "delayed" por primera vez.
    if (
      body.status === 'delayed' &&
      previousStatus !== 'delayed' &&
      typeof body.delayMinutes === 'number' &&
      body.delayMinutes > 0
    ) {
      const route = await Route.findById(execution.route).select('zone name');
      if (route?.zone) {
        pushToZone(route.zone, {
          title: 'Retraso en la recolección',
          body: `${route.name} tiene un retraso aproximado de ${body.delayMinutes} min.`,
          data: { url: '/(tabs)/map', kind: 'route_delayed', routeId: String(execution.route) },
        }).catch((e) => console.warn('[push] route_delayed failed', e));
      }
    }

    const populated = await RouteExecution.findById(execution._id)
      .populate('route', 'name zone status waypoints path')
      .populate('vehicle', 'plate type capacity')
      .populate('operator', 'firstName lastName email');

    return successResponse(populated, 'Ejecución actualizada');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar ejecución', 500);
  }
}

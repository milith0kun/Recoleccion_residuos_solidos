import { NextRequest } from 'next/server';
import type mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import Route from '@/lib/models/Route';
import RouteExecution from '@/lib/models/RouteExecution';
import Vehicle from '@/lib/models/Vehicle';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToZone } from '@/lib/utils/push';
import GpsTrack from '@/lib/models/GpsTrack';
import RouteTrace from '@/lib/models/RouteTrace';
import Dispatch from '@/lib/models/Dispatch';
import { totalDistanceKm, durationMin, countVisited } from '@/lib/utils/computeTraceMetrics';

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

      // Si quedó "completed", guardamos la traza histórica real con los puntos
      // GPS que el conductor transmitió durante la jornada (RouteTrace).
      if (body.status === 'completed') {
        try {
          await maybeCreateRouteTrace(execution, route);
        } catch (e) {
          console.warn('[trace] no se pudo crear RouteTrace:', e);
        }
      }

      // Si esta execution vino de un Dispatch, marcarlo como completed.
      try {
        await Dispatch.findOneAndUpdate(
          { execution: execution._id },
          {
            $set: {
              status: body.status === 'completed' ? 'completed' : 'cancelled',
              endedAt: execution.endedAt ?? new Date(),
            },
          }
        );
      } catch (e) {
        console.warn('[dispatch] no se pudo actualizar:', e);
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
          body: `${route.name} tiene un retraso de ~${body.delayMinutes} min. El camión está demorado pero va a pasar.`,
          channelId: 'routes',
          priority: 'high',
          data: {
            url: '/(tabs)/map',
            kind: 'route_delayed',
            routeId: String(execution.route),
            routeName: route.name,
            delayMinutes: body.delayMinutes,
          },
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

interface ExecLite {
  _id: mongoose.Types.ObjectId | string;
  route: mongoose.Types.ObjectId | string;
  operator: mongoose.Types.ObjectId | string;
  startedAt: Date;
  endedAt?: Date;
  waypointsVisited?: Array<{ skipped?: boolean }>;
}
interface RouteLite {
  _id: mongoose.Types.ObjectId;
}

/**
 * Crea una `RouteTrace` a partir de los GpsTrack de esta execution.
 * Si es la primera traza completada de la ruta, se marca como oficial
 * automáticamente.
 */
async function maybeCreateRouteTrace(
  execution: ExecLite,
  route: RouteLite | null
): Promise<void> {
  if (!route) return;
  // Si ya existe traza para esta execution, no crear duplicado.
  const existing = await RouteTrace.findOne({ execution: execution._id }).lean();
  if (existing) return;

  const tracks = await GpsTrack.find({ routeExecution: execution._id })
    .sort({ timestamp: 1 })
    .lean<Array<{ location: { coordinates: [number, number] }; timestamp: Date }>>();

  if (!tracks.length) return; // sin puntos GPS no tiene sentido guardar traza

  const coordinates: number[][] = tracks.map((t) => t.location.coordinates);
  const distance = totalDistanceKm(coordinates);
  const duration = durationMin(execution.startedAt, execution.endedAt);
  const { visited, skipped } = countVisited(execution.waypointsVisited);

  // Si es la primera traza de la ruta → será oficial.
  const previousCount = await RouteTrace.countDocuments({ route: route._id });
  const isFirst = previousCount === 0;

  await RouteTrace.create({
    route: route._id,
    execution: execution._id,
    driver: execution.operator,
    date: execution.startedAt,
    points: { type: 'LineString', coordinates },
    totalDistanceKm: distance,
    durationMin: duration,
    waypointsVisited: visited,
    waypointsSkipped: skipped,
    communityConfirmations: 0,
    isOfficial: isFirst,
    selectionMethod: isFirst ? 'manual' : undefined,
  });
}

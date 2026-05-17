import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Dispatch from '@/lib/models/Dispatch';
import Route from '@/lib/models/Route';
import RouteExecution from '@/lib/models/RouteExecution';
import Vehicle from '@/lib/models/Vehicle';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToZone } from '@/lib/utils/push';

void Vehicle;

/**
 * Inicia una salida (Dispatch) previamente aceptada.
 * Crea la `RouteExecution` técnica y vincula `Dispatch.execution`.
 * Replica la lógica de POST /route-executions para garantizar que no haya
 * dos ejecuciones simultáneas en la misma ruta.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'driver', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const dispatch = await Dispatch.findById(id);
    if (!dispatch) return errorResponse('Salida no encontrada', 404);
    if (String(dispatch.driver) !== user!.sub && user!.role !== 'admin') {
      return errorResponse('Esta salida no te pertenece', 403);
    }
    if (dispatch.status !== 'accepted') {
      return errorResponse(
        `Solo se puede iniciar una salida aceptada (estado actual: ${dispatch.status})`,
        409,
        'STATUS_LOCKED'
      );
    }

    const route = await Route.findById(dispatch.route);
    if (!route) return errorResponse('Ruta asociada no encontrada', 404);

    // No iniciar si otra execution está en curso para esta ruta.
    const inProgress = await RouteExecution.findOne({
      route: route._id,
      status: 'in_progress',
    });
    if (inProgress) {
      return errorResponse(
        'Ya existe una ejecución en progreso para esta ruta',
        409,
        'ROUTE_IN_PROGRESS'
      );
    }

    const effectiveVehicle = dispatch.vehicle || route.vehicle;
    if (!effectiveVehicle) {
      return errorResponse('No hay vehículo asignado a la salida ni a la ruta', 400);
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const execution = await RouteExecution.create({
      route: route._id,
      operator: dispatch.driver,
      vehicle: effectiveVehicle,
      date: today,
      startedAt: now,
      status: 'in_progress',
      waypointsVisited: [],
      collectionData: {
        organicKg: 0,
        recyclableKg: 0,
        nonRecyclableKg: 0,
        observations: '',
      },
      delayMinutes: 0,
    });

    route.currentExecution = execution._id;
    route.status = 'active';
    await route.save();

    dispatch.status = 'in_progress';
    dispatch.startedAt = now;
    dispatch.execution = execution._id;
    await dispatch.save();

    if (route.zone) {
      pushToZone(route.zone, {
        title: 'Camión en ruta',
        body: `El camión de ${route.name} salió a recolectar. Mirá el mapa para seguirlo.`,
        data: { url: '/(tabs)/map', kind: 'route_started', routeId: String(route._id) },
      }).catch((e) => console.warn('[push] route_started failed', e));
    }

    const populated = await RouteExecution.findById(execution._id)
      .populate('route', 'name zone status waypoints path')
      .populate('vehicle', 'plate type capacity')
      .populate('operator', 'firstName lastName email');

    return successResponse({ dispatch, execution: populated }, 'Salida iniciada', 201);
  } catch (err) {
    console.error('POST /dispatches/[id]/start error:', err);
    return errorResponse('Error al iniciar salida', 500);
  }
}

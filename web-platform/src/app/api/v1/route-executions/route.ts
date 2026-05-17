import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Route from '@/lib/models/Route';
import RouteExecution from '@/lib/models/RouteExecution';
import Vehicle from '@/lib/models/Vehicle';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToZone } from '@/lib/utils/push';

// Ensure Vehicle model is registered for populate
void Vehicle;

const VALID_EXEC_STATUSES = ['in_progress', 'completed', 'cancelled', 'delayed'] as const;
type ExecStatus = (typeof VALID_EXEC_STATUSES)[number];

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get('route');
    const operatorId = searchParams.get('operator');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const filter: Record<string, unknown> = {};
    if (routeId) filter.route = routeId;
    if (status) {
      if (!VALID_EXEC_STATUSES.includes(status as ExecStatus)) {
        return errorResponse(
          `Estado inválido. Permitidos: ${VALID_EXEC_STATUSES.join(', ')}`,
          400
        );
      }
      filter.status = status;
    }
    if (date) {
      const day = new Date(date);
      if (Number.isNaN(day.getTime())) {
        return errorResponse('Fecha inválida. Formato YYYY-MM-DD', 400);
      }
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (user!.role === 'driver') {
      filter.operator = user!.sub;
    } else if (operatorId) {
      filter.operator = operatorId;
    }

    const executions = await RouteExecution.find(filter)
      .populate('route', 'name zone status waypoints path')
      .populate('vehicle', 'plate type capacity')
      .populate('operator', 'firstName lastName email')
      .sort({ startedAt: -1 });

    return successResponse(executions);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener ejecuciones de ruta', 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = requireRole(request, 'driver', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = (await request.json()) as { routeId?: string; vehicleId?: string };
    const { routeId, vehicleId } = body;

    if (!routeId) {
      return errorResponse('routeId es obligatorio', 400);
    }

    const route = await Route.findById(routeId);
    if (!route) return errorResponse('Ruta no encontrada', 404);

    // Driver can only start their own routes; admin can start any
    if (user!.role === 'driver' && String(route.operator) !== user!.sub) {
      return errorResponse('No puedes iniciar una ruta que no te pertenece', 403);
    }

    if (route.status !== 'active' && route.status !== 'pending') {
      return errorResponse(
        'Solo puedes iniciar ejecuciones para rutas en estado active o pending',
        400
      );
    }

    // 409 if there's already an in-progress execution for this route
    const inProgress = await RouteExecution.findOne({
      route: route._id,
      status: 'in_progress',
    });
    if (inProgress) {
      return errorResponse('Ya existe una ejecución en progreso para esta ruta', 409);
    }

    const effectiveVehicle = vehicleId || String(route.vehicle);
    if (!effectiveVehicle) {
      return errorResponse('La ruta no tiene vehículo asignado y no se proporcionó vehicleId', 400);
    }

    const vehicle = await Vehicle.findById(effectiveVehicle);
    if (!vehicle) return errorResponse('Vehículo no encontrado', 404);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const execution = await RouteExecution.create({
      route: route._id,
      operator: user!.sub,
      vehicle: vehicle._id,
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

    // Notificar a los ciudadanos de la zona que el camión salió.
    // Fire-and-forget: si Expo Push tarda, no bloqueamos al operador.
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

    return successResponse(populated, 'Ejecución iniciada', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al iniciar ejecución de ruta', 500);
  }
}

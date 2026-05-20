import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Route from '@/lib/models/Route';
import RouteAuditLog from '@/lib/models/RouteAuditLog';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { VALID_STATUSES, validateActiveTransition, RouteStatus } from '@/lib/utils/routeValidation';

type RouteForConflict = {
  _id: string;
  name: string;
  operator: unknown;
  vehicle: unknown;
  schedule: { dayOfWeek?: number[]; startTime?: string; estimatedDuration?: number };
};

function toMinutes(hhmm?: string): number | null {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function hasOverlap(
  a: { dayOfWeek: number[]; startTime: string; estimatedDuration: number },
  b: { dayOfWeek: number[]; startTime: string; estimatedDuration: number }
): boolean {
  const daysA = new Set(a.dayOfWeek || []);
  const shareDay = (b.dayOfWeek || []).some((d) => daysA.has(d));
  if (!shareDay) return false;

  const startA = toMinutes(a.startTime);
  const startB = toMinutes(b.startTime);
  if (startA === null || startB === null) return false;
  const endA = startA + (a.estimatedDuration || 0);
  const endB = startB + (b.estimatedDuration || 0);

  return startA < endB && startB < endA;
}

async function validateScheduleConflict(input: {
  operator: string;
  vehicle: string;
  schedule: { dayOfWeek: number[]; startTime: string; estimatedDuration: number };
  excludeId?: string;
}) {
  const filter: Record<string, unknown> = {
    _id: input.excludeId ? { $ne: input.excludeId } : { $exists: true },
    status: { $ne: 'inactive' },
    $or: [{ operator: input.operator }, { vehicle: input.vehicle }],
  };

  const candidates = (await Route.find(filter)
    .select('name operator vehicle schedule')
    .lean()) as unknown as RouteForConflict[];

  for (const c of candidates) {
    if (
      c.schedule?.dayOfWeek &&
      c.schedule?.startTime &&
      typeof c.schedule?.estimatedDuration === 'number' &&
      hasOverlap(input.schedule, {
        dayOfWeek: c.schedule.dayOfWeek,
        startTime: c.schedule.startTime,
        estimatedDuration: c.schedule.estimatedDuration,
      })
    ) {
      const operatorConflict = String(c.operator) === String(input.operator);
      return {
        conflict: true,
        message: operatorConflict
          ? `Conflicto de horario: el operador ya está asignado a la ruta "${c.name}".`
          : `Conflicto de horario: el vehículo ya está asignado a la ruta "${c.name}".`,
      };
    }
  }

  return { conflict: false };
}

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zone');
    const status = searchParams.get('status');

    const filter: Record<string, unknown> = {};
    if (zoneId) filter.zone = zoneId;
    if (status) {
      if (!VALID_STATUSES.includes(status as RouteStatus)) {
        return errorResponse(`Estado inválido. Permitidos: ${VALID_STATUSES.join(', ')}`, 400);
      }
      filter.status = status;
    }

    const routes = await Route.find(filter)
      .populate('zone', 'name district color geometry')
      .populate('vehicle', 'plate type')
      .populate('operator', 'firstName lastName email')
      .populate('wasteTypes', 'name category colorCode')
      .sort({ name: 1 });

    return successResponse(routes);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener rutas', 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const {
      name,
      zone,
      vehicle,
      operator,
      wasteTypes,
      schedule,
      waypoints,
      path,
      status,
      templateFrom,
    } = body;

    if (templateFrom) {
      const base = await Route.findById(templateFrom).lean();
      if (!base) return errorResponse('Ruta plantilla no encontrada', 404);

      const clonedName = String(name || `${base.name} (copia)`).trim();
      const clonedSchedule = schedule || base.schedule;
      const clonedVehicle = vehicle || String(base.vehicle);
      const clonedOperator = operator || String(base.operator);

      const conflict = await validateScheduleConflict({
        operator: clonedOperator,
        vehicle: clonedVehicle,
        schedule: clonedSchedule,
      });
      if (conflict.conflict) return errorResponse(conflict.message || 'Conflicto de horario', 409);

      const clonedRoute = await Route.create({
        name: clonedName,
        zone: zone || String(base.zone),
        vehicle: clonedVehicle,
        operator: clonedOperator,
        wasteTypes: wasteTypes || base.wasteTypes || [],
        schedule: clonedSchedule,
        waypoints: waypoints || base.waypoints || [],
        path: path || base.path || { type: 'LineString', coordinates: [] },
        status: status || 'draft',
        createdBy: user!.sub,
      });

      await RouteAuditLog.create({
        route: clonedRoute._id,
        changedBy: user!.sub,
        action: 'duplicate',
        details: { templateFrom },
      });

      const populatedClone = await Route.findById(clonedRoute._id)
        .populate('zone', 'name district color geometry')
        .populate('vehicle', 'plate type')
        .populate('operator', 'firstName lastName email')
        .populate('wasteTypes', 'name category colorCode');

      return successResponse(populatedClone, 'Ruta duplicada exitosamente', 201);
    }

    if (!name || !zone || !vehicle || !operator || !schedule) {
      return errorResponse('Nombre, zona, vehículo, operador y horario son obligatorios', 400);
    }

    if (status && !VALID_STATUSES.includes(status as RouteStatus)) {
      return errorResponse(`Estado inválido. Permitidos: ${VALID_STATUSES.join(', ')}`, 400);
    }

    if (status === 'active') {
      const err = validateActiveTransition(waypoints, path);
      if (err) return errorResponse(err, 400);
    }

    const conflict = await validateScheduleConflict({
      operator,
      vehicle,
      schedule,
    });
    if (conflict.conflict) return errorResponse(conflict.message || 'Conflicto de horario', 409);

    const route = await Route.create({
      name, zone, vehicle, operator,
      wasteTypes: wasteTypes || [],
      schedule,
      waypoints: waypoints || [],
      path: path || { type: 'LineString', coordinates: [] },
      status: status || 'draft',
      createdBy: user!.sub,
    });

    const populated = await Route.findById(route._id)
      .populate('zone', 'name district color geometry')
      .populate('vehicle', 'plate type')
      .populate('operator', 'firstName lastName email')
      .populate('wasteTypes', 'name category colorCode');

    await RouteAuditLog.create({
      route: route._id,
      changedBy: user!.sub,
      action: 'create',
      details: { status: route.status },
    });

    return successResponse(populated, 'Ruta creada exitosamente', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al crear ruta', 500);
  }
}

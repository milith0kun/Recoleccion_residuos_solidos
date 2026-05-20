import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Route from '@/lib/models/Route';
import RouteAuditLog from '@/lib/models/RouteAuditLog';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import {
  VALID_STATUSES,
  validateActiveTransition,
  RouteStatus,
} from '@/lib/utils/routeValidation';

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
  id: string;
  operator: string;
  vehicle: string;
  schedule: { dayOfWeek: number[]; startTime: string; estimatedDuration: number };
}) {
  const candidates = await Route.find({
    _id: { $ne: input.id },
    status: { $ne: 'inactive' },
    $or: [{ operator: input.operator }, { vehicle: input.vehicle }],
  })
    .select('name operator vehicle schedule')
    .lean();

  for (const c of candidates as Array<Record<string, unknown>>) {
    const cSchedule = c.schedule as {
      dayOfWeek?: number[];
      startTime?: string;
      estimatedDuration?: number;
    };
    if (
      cSchedule?.dayOfWeek &&
      cSchedule?.startTime &&
      typeof cSchedule?.estimatedDuration === 'number' &&
      hasOverlap(input.schedule, {
        dayOfWeek: cSchedule.dayOfWeek,
        startTime: cSchedule.startTime,
        estimatedDuration: cSchedule.estimatedDuration,
      })
    ) {
      const operatorConflict = String(c.operator) === String(input.operator);
      return {
        conflict: true,
        message: operatorConflict
          ? `Conflicto de horario: el operador ya está asignado a la ruta "${String(c.name)}".`
          : `Conflicto de horario: el vehículo ya está asignado a la ruta "${String(c.name)}".`,
      };
    }
  }

  return { conflict: false };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin', 'operator');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const route = await Route.findById(id)
      .populate('zone', 'name district color geometry')
      .populate('vehicle', 'plate type capacity')
      .populate('operator', 'firstName lastName email')
      .populate('wasteTypes', 'name category colorCode');
    if (!route) return errorResponse('Ruta no encontrada', 404);
    return successResponse(route);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener ruta', 500);
  }
}

async function applyUpdate(id: string, body: Record<string, unknown>, actorId: string) {
  const existing = await Route.findById(id);
  if (!existing) return { error: errorResponse('Ruta no encontrada', 404) };

  const nextSchedule = (body.schedule as { dayOfWeek: number[]; startTime: string; estimatedDuration: number } | undefined) ||
    (existing.schedule as { dayOfWeek: number[]; startTime: string; estimatedDuration: number });
  const nextOperator = String(body.operator || existing.operator);
  const nextVehicle = String(body.vehicle || existing.vehicle);

  const conflict = await validateScheduleConflict({
    id,
    operator: nextOperator,
    vehicle: nextVehicle,
    schedule: nextSchedule,
  });
  if (conflict.conflict) {
    return { error: errorResponse(conflict.message || 'Conflicto de horario', 409) };
  }

  if (typeof body.status !== 'undefined') {
    const nextStatus = body.status as RouteStatus;
    if (!VALID_STATUSES.includes(nextStatus)) {
      return {
        error: errorResponse(
          `Estado inválido. Permitidos: ${VALID_STATUSES.join(', ')}`,
          400
        ),
      };
    }

    if (nextStatus === 'active') {
      const waypoints = (body.waypoints as never) || existing.waypoints;
      const path = (body.path as never) || existing.path;
      const validation = validateActiveTransition(waypoints, path);
      if (validation) return { error: errorResponse(validation, 400) };
    }
  }

  const route = await Route.findByIdAndUpdate(
    id,
    { $set: body },
    { new: true, runValidators: true }
  )
    .populate('zone', 'name district color geometry')
    .populate('vehicle', 'plate type')
    .populate('operator', 'firstName lastName email')
    .populate('wasteTypes', 'name category colorCode');

  if (route) {
    const prevStatus = existing.status;
    const nextStatus = (body.status as RouteStatus | undefined) || existing.status;
    await RouteAuditLog.create({
      route: route._id,
      changedBy: actorId,
      action: prevStatus !== nextStatus ? 'status_change' : 'update',
      details: { prevStatus, nextStatus },
    });
  }

  return { route };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireRole(request, 'admin');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const result = await applyUpdate(id, body, user!.sub);
    if (result.error) return result.error;
    return successResponse(result.route, 'Ruta actualizada correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar ruta', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'admin');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const result = await applyUpdate(id, body, user!.sub);
    if (result.error) return result.error;
    return successResponse(result.route, 'Ruta actualizada correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar ruta', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireRole(request, 'admin');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const route = await Route.findById(id);

    if (!route) {
      return errorResponse('Ruta no encontrada', 404);
    }

    const prevStatus = route.status;
    route.status = 'inactive';
    await route.save();

    await RouteAuditLog.create({
      route: route._id,
      changedBy: user!.sub,
      action: 'deactivate',
      details: { prevStatus, nextStatus: 'inactive' },
    });

    return successResponse(null, 'Ruta desactivada correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al eliminar ruta', 500);
  }
}

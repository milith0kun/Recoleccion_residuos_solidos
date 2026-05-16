import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Route from '@/lib/models/Route';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import {
  VALID_STATUSES,
  validateActiveTransition,
  RouteStatus,
} from '@/lib/utils/routeValidation';

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

async function applyUpdate(id: string, body: Record<string, unknown>) {
  const existing = await Route.findById(id);
  if (!existing) return { error: errorResponse('Ruta no encontrada', 404) };

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

  return { route };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const result = await applyUpdate(id, body);
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
  const { error } = requireRole(request, 'admin');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const result = await applyUpdate(id, body);
    if (result.error) return result.error;
    return successResponse(result.route, 'Ruta actualizada correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar ruta', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;
  try {
    await connectDB();
    const { id } = await params;
    const route = await Route.findById(id);

    if (!route) {
      return errorResponse('Ruta no encontrada', 404);
    }

    route.status = 'inactive';
    await route.save();

    return successResponse(null, 'Ruta desactivada correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al eliminar ruta', 500);
  }
}

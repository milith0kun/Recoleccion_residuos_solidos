import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import Dispatch, { DISPATCH_STATUSES, type DispatchStatus } from '@/lib/models/Dispatch';
import Route from '@/lib/models/Route';
import User from '@/lib/models/User';
import Vehicle from '@/lib/models/Vehicle';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToUser } from '@/lib/utils/push';

void User;
void Vehicle;

async function generateCode(): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await Dispatch.countDocuments({ createdAt: { $gte: start, $lt: end } });
  return `DSP-${year}-${String(count + 1).padStart(4, '0')}`;
}

interface CreateBody {
  routeId?: string;
  driverId?: string;
  scheduledFor?: string;
  vehicleId?: string;
  notes?: string;
}

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const driverParam = searchParams.get('driver');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filter: Record<string, unknown> = {};

    // Driver puro solo ve las suyas. Planner/admin ven todo.
    if (user!.role === 'driver') {
      filter.driver = user!.sub;
    } else if (driverParam) {
      filter.driver = driverParam === 'me' ? user!.sub : driverParam;
    }

    if (status && DISPATCH_STATUSES.includes(status as DispatchStatus)) {
      filter.status = status;
    }

    if (from || to) {
      const scheduledFor: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) scheduledFor.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) scheduledFor.$lte = d;
      }
      if (Object.keys(scheduledFor).length) filter.scheduledFor = scheduledFor;
    }

    const items = await Dispatch.find(filter)
      .populate('route', 'name zone waypoints schedule')
      .populate('driver', 'firstName lastName email phone')
      .populate('assignedBy', 'firstName lastName email')
      .populate('vehicle', 'plate type')
      .sort({ scheduledFor: -1 })
      .limit(200);

    return successResponse(items);
  } catch (err) {
    console.error('GET /dispatches error:', err);
    return errorResponse('Error al obtener salidas', 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = (await request.json()) as CreateBody;
    const { routeId, driverId, scheduledFor, vehicleId, notes } = body;

    if (!routeId || !driverId || !scheduledFor) {
      return errorResponse('routeId, driverId y scheduledFor son obligatorios', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(routeId)) return errorResponse('routeId inválido', 400);
    if (!mongoose.Types.ObjectId.isValid(driverId)) return errorResponse('driverId inválido', 400);

    const scheduledDate = new Date(scheduledFor);
    if (Number.isNaN(scheduledDate.getTime())) {
      return errorResponse('scheduledFor inválido', 400);
    }

    const [route, driver] = await Promise.all([
      Route.findById(routeId).select('_id name vehicle'),
      User.findById(driverId).select('_id role pushToken isActive'),
    ]);
    if (!route) return errorResponse('Ruta no encontrada', 404);
    if (!driver) return errorResponse('Conductor no encontrado', 404);
    if (driver.role !== 'driver' && driver.role !== 'operator' && driver.role !== 'admin') {
      return errorResponse('El usuario asignado no es conductor', 400);
    }

    const code = await generateCode();
    const dispatch = await Dispatch.create({
      code,
      route: route._id,
      driver: driver._id,
      assignedBy: user!.sub,
      scheduledFor: scheduledDate,
      vehicle: vehicleId || route.vehicle,
      notes,
      status: 'pending',
    });

    // Push al conductor: nueva asignación.
    const scheduledLabel = scheduledDate.toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    pushToUser(driver._id, {
      title: `Nueva salida: ${route.name}`,
      body: `${code} · programada para ${scheduledLabel}. Tocá para aceptar o rechazar.`,
      channelId: 'dispatches',
      priority: 'high',
      data: {
        url: '/(driver)/jornada',
        kind: 'dispatch_assigned',
        dispatchId: String(dispatch._id),
        routeName: route.name,
        scheduledFor: scheduledDate.toISOString(),
      },
    }).catch((e) => console.warn('[push] dispatch_assigned failed', e));

    const populated = await Dispatch.findById(dispatch._id)
      .populate('route', 'name zone waypoints schedule')
      .populate('driver', 'firstName lastName email phone')
      .populate('assignedBy', 'firstName lastName email')
      .populate('vehicle', 'plate type');

    return successResponse(populated, 'Salida asignada', 201);
  } catch (err) {
    console.error('POST /dispatches error:', err);
    return errorResponse('Error al asignar salida', 500);
  }
}

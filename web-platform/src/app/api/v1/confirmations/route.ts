import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import RouteConfirmation from '@/lib/models/RouteConfirmation';
import RouteTrace from '@/lib/models/RouteTrace';
import Route from '@/lib/models/Route';
import User from '@/lib/models/User';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

void User;
void Route;

interface CreateBody {
  routeId?: string;
  lng?: number;
  lat?: number;
  comment?: string;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const body = (await request.json()) as CreateBody;
    const { routeId, lng, lat, comment } = body;

    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return errorResponse('lng y lat son obligatorios', 400);
    }
    if (routeId && !mongoose.Types.ObjectId.isValid(routeId)) {
      return errorResponse('routeId inválido', 400);
    }

    const dayKey = todayKey();

    // Resolver la traza oficial vigente de esa ruta (si la hay) para sumar
    // communityConfirmations atómicamente.
    let officialTraceId: mongoose.Types.ObjectId | undefined;
    if (routeId) {
      const t = await RouteTrace.findOne({ route: routeId, isOfficial: true })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>();
      if (t?._id) officialTraceId = t._id;
    }

    let confirmation;
    try {
      confirmation = await RouteConfirmation.create({
        citizen: user!.sub,
        route: routeId,
        trace: officialTraceId,
        location: { type: 'Point', coordinates: [lng, lat] },
        comment: comment?.trim() || undefined,
        dayKey,
      });
    } catch (err) {
      // Choque con el índice único: ya confirmó hoy esta ruta.
      if ((err as { code?: number }).code === 11000) {
        return errorResponse('Ya confirmaste el paso de esta ruta hoy', 409);
      }
      throw err;
    }

    if (officialTraceId) {
      // Incrementa el contador de confirmaciones de la traza oficial.
      RouteTrace.updateOne(
        { _id: officialTraceId },
        { $inc: { communityConfirmations: 1 } }
      ).catch((e) => console.warn('[confirmations] inc failed', e));
    }

    return successResponse(confirmation, 'Confirmación registrada', 201);
  } catch (err) {
    console.error('POST /confirmations error:', err);
    return errorResponse('Error al registrar confirmación', 500);
  }
}

export async function GET(request: NextRequest) {
  const { error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const routeId = searchParams.get('route');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const filter: Record<string, unknown> = {};
    if (routeId) {
      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        return errorResponse('route inválido', 400);
      }
      filter.route = routeId;
    }
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) createdAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) createdAt.$lte = d;
      }
      if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    }

    const items = await RouteConfirmation.find(filter)
      .populate('citizen', 'firstName lastName email')
      .populate('route', 'name zone')
      .sort({ createdAt: -1 })
      .limit(500);

    return successResponse(items);
  } catch (err) {
    console.error('GET /confirmations error:', err);
    return errorResponse('Error al obtener confirmaciones', 500);
  }
}

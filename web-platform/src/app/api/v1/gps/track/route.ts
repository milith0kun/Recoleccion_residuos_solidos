import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import GpsTrack from '@/lib/models/GpsTrack';
import RouteExecution from '@/lib/models/RouteExecution';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

interface TrackPostBody {
  routeExecutionId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp?: string | Date;
}

export async function POST(request: NextRequest) {
  const { user, error } = requireRole(request, 'driver', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = (await request.json()) as TrackPostBody;
    const { routeExecutionId, lat, lng, speed, heading, accuracy, timestamp } = body;

    if (!routeExecutionId || typeof lat !== 'number' || typeof lng !== 'number') {
      return errorResponse('routeExecutionId, lat y lng son obligatorios', 400);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return errorResponse('Coordenadas fuera de rango', 400);
    }

    const execution = await RouteExecution.findById(routeExecutionId);
    if (!execution) return errorResponse('Ejecución no encontrada', 404);

    if (user!.role !== 'admin' && String(execution.operator) !== user!.sub) {
      return errorResponse('La ejecución no te pertenece', 403);
    }
    if (execution.status !== 'in_progress') {
      return errorResponse('La ejecución no está en progreso', 400);
    }

    const ts = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(ts.getTime())) {
      return errorResponse('timestamp inválido', 400);
    }

    await GpsTrack.create({
      routeExecution: execution._id,
      operator: execution.operator,
      location: { type: 'Point', coordinates: [lng, lat] },
      speed: typeof speed === 'number' ? speed : 0,
      heading: typeof heading === 'number' ? heading : 0,
      accuracy: typeof accuracy === 'number' ? accuracy : 0,
      timestamp: ts,
    });

    return successResponse({ ok: true }, 'Tracking registrado', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al registrar GPS', 500);
  }
}

interface GpsPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
}

interface RouteWithCurrentExecution {
  _id: unknown;
  currentExecution?: unknown;
}

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    let executionId = searchParams.get('routeExecution');
    const routeId = searchParams.get('route');

    if (!executionId && routeId) {
      const RouteModel = (await import('@/lib/models/Route')).default;
      const route = (await RouteModel.findById(routeId)
        .select('currentExecution')
        .lean()) as RouteWithCurrentExecution | null;
      if (route?.currentExecution) {
        executionId = String(route.currentExecution);
      } else {
        const inProg = await RouteExecution.findOne({
          route: routeId,
          status: 'in_progress',
        })
          .select('_id')
          .lean();
        if (inProg) executionId = String((inProg as { _id: unknown })._id);
      }
    }

    if (!executionId) {
      return errorResponse(
        'routeExecution o route es obligatorio (o no hay ejecución activa)',
        400
      );
    }

    const tracks = await GpsTrack.find({ routeExecution: executionId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    const points: GpsPoint[] = tracks.map((t) => {
      const doc = t as unknown as {
        location: { coordinates: [number, number] };
        speed: number;
        heading: number;
        accuracy: number;
        timestamp: Date;
      };
      return {
        lng: doc.location.coordinates[0],
        lat: doc.location.coordinates[1],
        speed: doc.speed,
        heading: doc.heading,
        accuracy: doc.accuracy,
        timestamp: doc.timestamp,
      };
    });

    const lastSeenAt = points.length > 0 ? points[0].timestamp : null;

    return successResponse({
      routeExecution: executionId,
      points,
      lastSeenAt,
    });
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener tracking GPS', 500);
  }
}

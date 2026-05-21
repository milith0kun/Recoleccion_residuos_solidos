import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import GpsTrack from '@/lib/models/GpsTrack';
import RouteExecution from '@/lib/models/RouteExecution';
import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToUser } from '@/lib/utils/push';

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

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

    const executionWithRoute = await RouteExecution.findById(execution._id)
      .populate('route', 'zone name')
      .lean();
    const routeZone = (executionWithRoute as { route?: { zone?: string; name?: string } })?.route?.zone;
    const routeName = (executionWithRoute as { route?: { zone?: string; name?: string } })?.route?.name || 'tu zona';

    if (routeZone) {
      const citizens = await User.find({
        role: 'citizen',
        isActive: true,
        zone: routeZone,
        notificationsEnabled: { $ne: false },
        location: { $exists: true },
      })
        .select('_id location nearAlertRadiusMeters')
        .lean();

      for (const c of citizens as Array<{
        _id: string;
        location?: { coordinates?: [number, number] };
        nearAlertRadiusMeters?: number;
      }>) {
        const coords = c.location?.coordinates;
        if (!coords) continue;
        const dist = haversineMeters(coords[1], coords[0], lat, lng);
        const radius = c.nearAlertRadiusMeters || 500;
        if (dist > radius) continue;

        const alreadySent = await Notification.exists({
          recipient: c._id,
          'data.kind': 'truck_nearby',
          'data.executionId': String(execution._id),
        });
        if (alreadySent) continue;

        pushToUser(c._id, {
          title: 'El camión está cerca',
          body: `Tu recolección de ${routeName} está a ~${Math.round(dist)} m.`,
          channelId: 'routes',
          priority: 'high',
          data: {
            kind: 'truck_nearby',
            executionId: String(execution._id),
            routeExecutionId: String(execution._id),
            distanceMeters: Math.round(dist),
            url: '/(tabs)/map',
          },
        }).catch((e) => console.warn('[push] truck_nearby failed', e));
      }
    }

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

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import RouteExecution from '@/lib/models/RouteExecution';
import GpsTrack from '@/lib/models/GpsTrack';
import User from '@/lib/models/User';
import Vehicle from '@/lib/models/Vehicle';
import Route from '@/lib/models/Route';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

// keep models registered for populate
void Vehicle;
void Route;
void User;

const STALE_THRESHOLD_MS = 30 * 1000;

interface PopulatedRoute {
  _id: mongoose.Types.ObjectId;
  name: string;
  zone?: mongoose.Types.ObjectId;
}

interface PopulatedVehicle {
  _id: mongoose.Types.ObjectId;
  plate: string;
  type: string;
}

interface PopulatedOperator {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
}

interface PopulatedExecution {
  _id: mongoose.Types.ObjectId;
  route: PopulatedRoute | null;
  vehicle: PopulatedVehicle | null;
  operator: PopulatedOperator | null;
  startedAt: Date;
}

interface GpsTrackLean {
  _id: mongoose.Types.ObjectId;
  routeExecution: mongoose.Types.ObjectId;
  location: { type: 'Point'; coordinates: [number, number] };
  speed: number;
  timestamp: Date;
}

interface ActiveItem {
  executionId: string;
  routeId: string;
  routeName: string;
  operatorName: string;
  vehicle: { plate: string; type: string } | null;
  lastLocation: { lng: number; lat: number; timestamp: Date; speed?: number } | null;
  lastSeenAt: Date | null;
  isStale: boolean;
  startedAt: Date;
}

interface CitizenUser {
  _id: mongoose.Types.ObjectId;
  zone?: mongoose.Types.ObjectId | null;
}

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();

    const filter: Record<string, unknown> = { status: 'in_progress' };

    if (user!.role === 'citizen') {
      const citizen = (await User.findById(user!.sub)
        .select('zone')
        .lean()) as CitizenUser | null;
      if (!citizen?.zone) {
        return successResponse({ data: [] });
      }
      // Routes inside the citizen's zone
      const routesInZone = await Route.find({ zone: citizen.zone })
        .select('_id')
        .lean();
      const routeIds = routesInZone.map((r) => (r as { _id: mongoose.Types.ObjectId })._id);
      if (routeIds.length === 0) {
        return successResponse({ data: [] });
      }
      filter.route = { $in: routeIds };
    }

    const executionsRaw = await RouteExecution.find(filter)
      .populate('route', 'name zone')
      .populate('vehicle', 'plate type')
      .populate('operator', 'firstName lastName')
      .sort({ startedAt: -1 })
      .lean();

    const executions = executionsRaw as unknown as PopulatedExecution[];

    if (executions.length === 0) {
      return successResponse({ data: [] });
    }

    const executionIds = executions.map((e) => e._id);

    // Get last GPS point per execution using aggregation
    const lastTracksAgg = await GpsTrack.aggregate([
      { $match: { routeExecution: { $in: executionIds } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$routeExecution',
          doc: { $first: '$$ROOT' },
        },
      },
    ]);

    const lastTrackByExec = new Map<string, GpsTrackLean>();
    for (const row of lastTracksAgg as { _id: mongoose.Types.ObjectId; doc: GpsTrackLean }[]) {
      lastTrackByExec.set(String(row._id), row.doc);
    }

    const now = Date.now();
    const data: ActiveItem[] = executions.map((exec) => {
      const lastTrack = lastTrackByExec.get(String(exec._id)) || null;
      const lastLocation = lastTrack
        ? {
            lng: lastTrack.location.coordinates[0],
            lat: lastTrack.location.coordinates[1],
            timestamp: lastTrack.timestamp,
            speed: lastTrack.speed,
          }
        : null;
      const lastSeenAt = lastTrack ? lastTrack.timestamp : null;
      const isStale = lastSeenAt
        ? now - new Date(lastSeenAt).getTime() > STALE_THRESHOLD_MS
        : true;

      const operatorName = exec.operator
        ? `${exec.operator.firstName} ${exec.operator.lastName}`.trim()
        : 'Operador';

      return {
        executionId: String(exec._id),
        routeId: exec.route ? String(exec.route._id) : '',
        routeName: exec.route?.name || 'Ruta',
        operatorName,
        vehicle: exec.vehicle
          ? { plate: exec.vehicle.plate, type: exec.vehicle.type }
          : null,
        lastLocation,
        lastSeenAt,
        isStale,
        startedAt: exec.startedAt,
      };
    });

    return successResponse({ data });
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener ejecuciones activas', 500);
  }
}

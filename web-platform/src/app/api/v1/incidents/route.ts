import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Incident, {
  INCIDENT_TYPES,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  type IncidentType,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/lib/models/Incident';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { findZoneContaining } from '@/lib/utils/geolocation';
import { pushToUser } from '@/lib/utils/push';

void User;
void Zone;

interface CreateIncidentBody {
  title?: string;
  description?: string;
  type?: IncidentType;
  severity?: IncidentSeverity;
  address?: string;
  lat?: number;
  lng?: number;
}

const TYPE_LABELS: Record<IncidentType, string> = {
  accumulation: 'Acumulación de residuos',
  damaged_container: 'Contenedor dañado',
  missed_collection: 'Recolección no realizada',
  other: 'Otro',
};

async function generateCode(): Promise<string> {
  const year = new Date().getFullYear();
  // Count this year's incidents + 1 → padded a 4 dígitos
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await Incident.countDocuments({
    createdAt: { $gte: start, $lt: end },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `INC-${year}-${seq}`;
}

export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};

    // Citizens only see their own incidents; admin/operator ven todo.
    if (user!.role === 'citizen') {
      filter.reportedBy = user!.sub;
    }

    if (status && INCIDENT_STATUS.includes(status as IncidentStatus)) {
      filter.status = status;
    }
    if (type && INCIDENT_TYPES.includes(type as IncidentType)) {
      filter.type = type;
    }
    if (severity && INCIDENT_SEVERITY.includes(severity as IncidentSeverity)) {
      filter.severity = severity;
    }
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ title: re }, { description: re }, { code: re }];
    }

    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'firstName lastName email')
      .populate('zone', 'name color district')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(200);

    return successResponse(incidents);
  } catch (err) {
    console.error('GET /incidents error:', err);
    return errorResponse('Error al obtener incidencias', 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const body = (await request.json()) as CreateIncidentBody;
    const { title, description, type, severity, address, lat, lng } = body;

    if (!description || description.trim().length < 5) {
      return errorResponse('La descripción es obligatoria (mín. 5 caracteres)', 400);
    }
    const incidentType: IncidentType =
      type && INCIDENT_TYPES.includes(type) ? type : 'other';
    const incidentSeverity: IncidentSeverity =
      severity && INCIDENT_SEVERITY.includes(severity) ? severity : 'medium';

    let coords: [number, number] | undefined;
    if (typeof lat === 'number' && typeof lng === 'number') {
      coords = [lng, lat];
    }

    // Si tenemos coords, intentamos detectar zona automáticamente.
    let zoneId: string | undefined;
    if (coords) {
      const zone = await findZoneContaining(coords[0], coords[1]);
      if (zone) zoneId = String(zone._id);
    }

    const code = await generateCode();
    const incident = await Incident.create({
      code,
      title: title?.trim() || TYPE_LABELS[incidentType],
      description: description.trim(),
      type: incidentType,
      severity: incidentSeverity,
      status: 'open',
      address: address?.trim(),
      location: coords ? { type: 'Point', coordinates: coords } : undefined,
      zone: zoneId,
      reportedBy: user!.sub,
    });

    // Push de confirmación al ciudadano que reportó.
    pushToUser(user!.sub, {
      title: 'Reporte registrado',
      body: `${code} · ${TYPE_LABELS[incidentType]}. Te avisaremos cuando haya novedades.`,
      data: { url: '/(tabs)/profile', kind: 'incident_created', incidentId: String(incident._id) },
    }).catch((e) => console.warn('[push] incident_created failed', e));

    const populated = await Incident.findById(incident._id)
      .populate('reportedBy', 'firstName lastName email')
      .populate('zone', 'name color district');
    return successResponse(populated, 'Incidencia reportada', 201);
  } catch (err) {
    console.error('POST /incidents error:', err);
    return errorResponse('Error al reportar incidencia', 500);
  }
}

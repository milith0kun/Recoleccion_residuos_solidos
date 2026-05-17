import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Incident, {
  INCIDENT_STATUS,
  INCIDENT_SEVERITY,
  type IncidentStatus,
  type IncidentSeverity,
} from '@/lib/models/Incident';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { pushToUser } from '@/lib/utils/push';

void User;
void Zone;

interface PatchBody {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  assignedTo?: string | null;
  resolutionNote?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const incident = await Incident.findById(id)
      .populate('reportedBy', 'firstName lastName email')
      .populate('zone', 'name color district')
      .populate('assignedTo', 'firstName lastName');
    if (!incident) return errorResponse('Incidencia no encontrada', 404);

    if (user!.role === 'citizen' && String(incident.reportedBy._id ?? incident.reportedBy) !== user!.sub) {
      return errorResponse('Sin permisos', 403);
    }
    return successResponse(incident);
  } catch (err) {
    console.error('GET /incidents/[id] error:', err);
    return errorResponse('Error al obtener incidencia', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'operator', 'admin', 'driver');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const incident = await Incident.findById(id);
    if (!incident) return errorResponse('Incidencia no encontrada', 404);

    const body = (await request.json()) as PatchBody;
    const previousStatus = incident.status;

    if (body.status && INCIDENT_STATUS.includes(body.status)) {
      incident.status = body.status;
      if (body.status === 'resolved' && !incident.resolvedAt) {
        incident.resolvedAt = new Date();
      }
    }
    if (body.severity && INCIDENT_SEVERITY.includes(body.severity)) {
      incident.severity = body.severity;
    }
    if ('assignedTo' in body) {
      incident.assignedTo = (body.assignedTo as never) || undefined;
    }
    if (typeof body.resolutionNote === 'string') {
      incident.resolutionNote = body.resolutionNote.trim();
    }

    await incident.save();

    // Notificar al ciudadano si el estado cambió (no por primera carga).
    if (body.status && body.status !== previousStatus) {
      const msg =
        body.status === 'in_progress'
          ? 'Estamos trabajando en tu reporte.'
          : body.status === 'resolved'
            ? 'Tu reporte fue resuelto. ¡Gracias por avisar!'
            : 'Tu reporte fue reabierto.';
      pushToUser(incident.reportedBy, {
        title: `Reporte ${incident.code}: ${
          body.status === 'in_progress'
            ? 'en proceso'
            : body.status === 'resolved'
              ? 'resuelto'
              : 'reabierto'
        }`,
        body: msg,
        channelId: 'incidents',
        priority: 'high',
        data: {
          url: '/(tabs)/incidents',
          kind: 'incident_status',
          incidentId: String(incident._id),
          status: body.status,
        },
      }).catch((e) => console.warn('[push] incident_status failed', e));
    }

    const populated = await Incident.findById(incident._id)
      .populate('reportedBy', 'firstName lastName email')
      .populate('zone', 'name color district')
      .populate('assignedTo', 'firstName lastName');

    return successResponse(populated, 'Incidencia actualizada');
  } catch (err) {
    console.error('PATCH /incidents/[id] error:', err);
    return errorResponse('Error al actualizar incidencia', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const incident = await Incident.findByIdAndDelete(id);
    if (!incident) return errorResponse('Incidencia no encontrada', 404);
    return successResponse({ _id: id }, 'Incidencia eliminada');
  } catch (err) {
    console.error('DELETE /incidents/[id] error:', err);
    return errorResponse('Error al eliminar incidencia', 500);
  }
}

// Solo user (citizen) puede eliminar su propio reporte si sigue "open"? Para
// el MVP dejamos delete solo a admin. Lo demás se gestiona desde el dashboard.

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteTrace from '@/lib/models/RouteTrace';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireRole(request, 'operator', 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const trace = await RouteTrace.findById(id);
    if (!trace) return errorResponse('Traza no encontrada', 404);

    await RouteTrace.updateMany(
      { route: trace.route, isOfficial: true },
      { $set: { isOfficial: false } }
    );

    trace.isOfficial = true;
    trace.selectionMethod = 'manual';
    trace.selectedBy = user!.sub as never;
    trace.selectedAt = new Date();
    await trace.save();

    return successResponse(trace, 'Traza promovida a oficial');
  } catch (err) {
    console.error('PATCH /traces/[id]/promote error:', err);
    return errorResponse('Error al promover traza', 500);
  }
}

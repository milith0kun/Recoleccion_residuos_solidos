import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import RouteTrace from '@/lib/models/RouteTrace';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const trace = await RouteTrace.findOne({ route: id, isOfficial: true }).lean();
    return successResponse(trace ?? null);
  } catch (err) {
    console.error('GET /routes/[id]/traces/official error:', err);
    return errorResponse('Error al obtener traza oficial', 500);
  }
}

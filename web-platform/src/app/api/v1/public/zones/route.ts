import { connectDB } from '@/lib/db/connection';
import Zone from '@/lib/models/Zone';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function GET() {
  try {
    await connectDB();
    const zones = await Zone.find({ isActive: true })
      .select('_id name district color')
      .sort({ district: 1, name: 1 });

    return successResponse(zones);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener zonas públicas', 500);
  }
}

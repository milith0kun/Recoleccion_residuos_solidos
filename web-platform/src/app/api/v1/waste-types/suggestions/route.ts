import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import WasteSuggestion from '@/lib/models/WasteSuggestion';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { name, notes } = await request.json();
    const normalizedName = String(name || '').trim().replace(/\s+/g, ' ');

    if (!normalizedName) {
      return errorResponse('El nombre del residuo sugerido es obligatorio', 400);
    }

    const suggestion = await WasteSuggestion.create({
      name: normalizedName,
      notes: String(notes || '').trim() || undefined,
      suggestedBy: user!.sub,
      status: 'pending',
    });

    return successResponse(suggestion, 'Sugerencia enviada. Gracias por contribuir.', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al registrar sugerencia', 500);
  }
}

export async function GET(request: NextRequest) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const suggestions = await WasteSuggestion.find({})
      .populate('suggestedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(200);
    return successResponse(suggestions);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener sugerencias', 500);
  }
}

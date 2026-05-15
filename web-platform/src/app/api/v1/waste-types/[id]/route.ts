import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import WasteType from '@/lib/models/WasteType';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    // Check if updating name to an existing one
    if (body.name) {
      const existing = await WasteType.findOne({ name: body.name, _id: { $ne: id } });
      if (existing) {
        return errorResponse('Ya existe otro tipo de residuo con ese nombre', 409);
      }
    }

    const wasteType = await WasteType.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!wasteType) {
      return errorResponse('Tipo de residuo no encontrado', 404);
    }

    return successResponse(wasteType, 'Tipo de residuo actualizado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar tipo de residuo', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const wasteType = await WasteType.findById(id);
    
    if (!wasteType) {
      return errorResponse('Tipo de residuo no encontrado', 404);
    }

    // Instead of hard delete, we can deactivate it
    wasteType.isActive = false;
    await wasteType.save();

    return successResponse(null, 'Tipo de residuo desactivado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al eliminar tipo de residuo', 500);
  }
}

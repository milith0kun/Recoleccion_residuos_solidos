import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import Vehicle from '@/lib/models/Vehicle';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin', 'operator');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return errorResponse('Vehículo no encontrado', 404);
    return successResponse(vehicle);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener vehículo', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    // Check if updating plate to an existing one
    if (body.plate) {
      const existing = await Vehicle.findOne({ plate: body.plate.toUpperCase(), _id: { $ne: id } });
      if (existing) {
        return errorResponse('Ya existe otro vehículo con esa placa', 409);
      }
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return errorResponse('Vehículo no encontrado', 404);
    }

    return successResponse(vehicle, 'Vehículo actualizado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar vehículo', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const vehicle = await Vehicle.findById(id);
    
    if (!vehicle) {
      return errorResponse('Vehículo no encontrado', 404);
    }

    // Soft delete
    vehicle.isActive = false;
    vehicle.status = 'inactive';
    await vehicle.save();

    return successResponse(null, 'Vehículo desactivado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al eliminar vehículo', 500);
  }
}

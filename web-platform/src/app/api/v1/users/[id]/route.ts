import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id).populate('zone', 'name district');
    if (!user) return errorResponse('Usuario no encontrado', 404);
    return successResponse(user);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener usuario', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    delete body.password; // do not update password via this generic route
    delete body.email;    // do not update email directly if logic requires complex check, or we can check below

    // Check if updating DNI to an existing one
    if (body.dni) {
      const existing = await User.findOne({ dni: body.dni, _id: { $ne: id } });
      if (existing) {
        return errorResponse('Ya existe otro usuario con ese DNI', 409);
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate('zone', 'name district');

    if (!user) {
      return errorResponse('Usuario no encontrado', 404);
    }

    return successResponse(user, 'Usuario actualizado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar usuario', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id);
    
    if (!user) {
      return errorResponse('Usuario no encontrado', 404);
    }

    user.isActive = false;
    await user.save();

    return successResponse(null, 'Usuario desactivado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al eliminar usuario', 500);
  }
}

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

const ALLOWED_PATCH_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'address',
  'role',
  'isActive',
] as const;

type PatchField = (typeof ALLOWED_PATCH_FIELDS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id)
      .select('-password')
      .populate('zone', 'name color district');
    if (!user) return errorResponse('Usuario no encontrado', 404);
    return successResponse(user);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener usuario', 500);
  }
}

async function updateUser(
  id: string,
  body: Record<string, unknown>,
  { strict }: { strict: boolean }
) {
  const update: Partial<Record<PatchField, unknown>> = {};

  if (strict) {
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in body) update[key] = body[key];
    }
  } else {
    const clone = { ...body };
    delete clone.password;
    delete clone.email;
    if (clone.dni) {
      const dup = await User.findOne({ dni: clone.dni, _id: { $ne: id } });
      if (dup) {
        return { error: errorResponse('Ya existe otro usuario con ese DNI', 409) };
      }
    }
    Object.assign(update, clone);
  }

  if (update.role && !['citizen', 'operator', 'admin'].includes(update.role as string)) {
    return { error: errorResponse('Rol inválido', 400) };
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('zone', 'name color district');

  if (!user) return { error: errorResponse('Usuario no encontrado', 404) };
  return { user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const result = await updateUser(id, body, { strict: true });
    if (result.error) return result.error;
    return successResponse(result.user, 'Usuario actualizado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar usuario', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const result = await updateUser(id, body, { strict: false });
    if (result.error) return result.error;
    return successResponse(result.user, 'Usuario actualizado correctamente');
  } catch (err) {
    console.error(err);
    return errorResponse('Error al actualizar usuario', 500);
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

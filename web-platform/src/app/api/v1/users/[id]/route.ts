import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import Route from '@/lib/models/Route';
import RouteExecution from '@/lib/models/RouteExecution';
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

const NULLABLE_OPTIONAL_FIELDS = new Set<PatchField>(['phone', 'address']);

function handleMongoError(err: unknown, fallback: string) {
  if (err instanceof mongoose.Error.ValidationError) {
    const first = Object.values(err.errors)[0];
    const msg = first?.message ?? 'Datos inválidos';
    return errorResponse(msg, 400, 'VALIDATION_ERROR');
  }
  if (err instanceof mongoose.Error.CastError) {
    return errorResponse(`Valor inválido para ${err.path}`, 400, 'CAST_ERROR');
  }
  console.error(err);
  return errorResponse(fallback, 500);
}

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

  for (const key of Object.keys(update) as PatchField[]) {
    const value = update[key];
    if (value === undefined) {
      delete update[key];
      continue;
    }
    if (typeof value === 'string' && value.trim() === '' && NULLABLE_OPTIONAL_FIELDS.has(key)) {
      delete update[key];
    }
  }

  if (update.role && !['citizen', 'operator', 'admin'].includes(update.role as string)) {
    return { error: errorResponse('Rol inválido', 400) };
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true, context: 'query' }
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
    return handleMongoError(err, 'Error al actualizar usuario');
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
    return handleMongoError(err, 'Error al actualizar usuario');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user: actor, error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('ID de usuario inválido', 400, 'INVALID_ID');
    }

    if (actor!.sub === id) {
      return errorResponse(
        'No podés eliminar tu propia cuenta',
        400,
        'SELF_DELETE_BLOCKED',
      );
    }

    const target = await User.findById(id);
    if (!target) {
      return errorResponse('Usuario no encontrado', 404);
    }

    if (target.role === 'operator') {
      const activeRoute = await Route.findOne({
        operator: id,
        status: 'active',
      }).select('_id name');
      if (activeRoute) {
        return errorResponse(
          'No se puede eliminar: el operador tiene rutas activas asignadas',
          409,
          'OPERATOR_HAS_ROUTES',
        );
      }
      const inProgress = await RouteExecution.findOne({
        operator: id,
        status: { $in: ['scheduled', 'in_progress'] },
      }).select('_id status');
      if (inProgress) {
        return errorResponse(
          'No se puede eliminar: el operador tiene ejecuciones de ruta en curso',
          409,
          'OPERATOR_HAS_EXECUTIONS',
        );
      }
    }

    await User.findByIdAndDelete(id);
    return successResponse(null, 'Usuario eliminado permanentemente');
  } catch (err) {
    console.error('DELETE /users/[id] error:', err);
    return errorResponse('Error al eliminar usuario', 500);
  }
}

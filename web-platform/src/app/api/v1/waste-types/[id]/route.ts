import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import WasteType from '@/lib/models/WasteType';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';

const IMAGE_MIME_REGEX = /^data:(image\/png|image\/jpeg);base64,/i;

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function validateIcon(iconUrl?: string): { ok: boolean; mimeType?: 'image/png' | 'image/jpeg' } {
  if (!iconUrl) return { ok: true };
  const trimmed = iconUrl.trim();
  if (IMAGE_MIME_REGEX.test(trimmed)) {
    const mime = trimmed.toLowerCase().startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
    return { ok: true, mimeType: mime };
  }
  if (/\.(png)$/i.test(trimmed)) return { ok: true, mimeType: 'image/png' };
  if (/\.(jpg|jpeg)$/i.test(trimmed)) return { ok: true, mimeType: 'image/jpeg' };
  return { ok: false };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const nextName = body.name ? normalizeName(String(body.name)) : undefined;

    if (body.iconUrl !== undefined) {
      const iconValidation = validateIcon(body.iconUrl);
      if (!iconValidation.ok) {
        return errorResponse('El ícono debe estar en formato PNG o JPG', 400);
      }
      body.iconMimeType = iconValidation.mimeType;
    }
    
    // Check if updating name to an existing one
    if (nextName) {
      const existing = await WasteType.findOne({
        name: new RegExp(`^${nextName}$`, 'i'),
        _id: { $ne: id },
      });
      if (existing) {
        return errorResponse('Ya existe otro tipo de residuo con ese nombre', 409);
      }
      body.name = nextName;
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

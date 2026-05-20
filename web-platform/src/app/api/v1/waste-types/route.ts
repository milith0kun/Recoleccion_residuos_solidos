import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import WasteType from '@/lib/models/WasteType';
import { requireAuth, requireRole } from '@/lib/middleware/auth';
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

export async function GET(request: NextRequest) {
  const { error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search') || searchParams.get('q');
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const autocomplete = searchParams.get('autocomplete') === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10), 1), 50);

    const filter: Record<string, unknown> = includeInactive ? {} : { isActive: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { examples: { $regex: search, $options: 'i' } },
      ];
    }

    const query = WasteType.find(filter).sort({ category: 1, name: 1 });
    if (autocomplete) {
      query.select('name category examples colorCode handlingInstructions handlingInstructionsQuechua iconUrl');
      query.limit(limit);
    }

    const wasteTypes = await query;
    return successResponse(wasteTypes);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener tipos de residuos', 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const {
      name,
      category,
      description,
      descriptionQuechua,
      examples,
      handlingInstructions,
      handlingInstructionsQuechua,
      colorCode,
      iconUrl,
    } = body;

    const normalizedName = normalizeName(String(name || ''));

    if (!normalizedName || !category || !description || !handlingInstructions || !colorCode) {
      return errorResponse('Todos los campos son obligatorios', 400);
    }

    const iconValidation = validateIcon(iconUrl);
    if (!iconValidation.ok) {
      return errorResponse('El ícono debe estar en formato PNG o JPG', 400);
    }

    const existing = await WasteType.findOne({ name: new RegExp(`^${normalizedName}$`, 'i') });
    if (existing) {
      return errorResponse('Ya existe un tipo de residuo con ese nombre', 409);
    }

    const wasteType = await WasteType.create({
      name: normalizedName,
      category,
      description,
      descriptionQuechua,
      examples: examples || [],
      handlingInstructions,
      handlingInstructionsQuechua,
      colorCode,
      iconUrl: iconUrl?.trim() || undefined,
      iconMimeType: iconValidation.mimeType,
    });

    return successResponse(wasteType, 'Tipo de residuo creado', 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Error al crear tipo de residuo', 500);
  }
}

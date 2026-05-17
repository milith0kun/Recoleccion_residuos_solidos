import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { requireRole } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { assignZoneByAddress } from '@/lib/utils/geolocation';

export async function GET(request: NextRequest) {
  // operator (planner) puede listar para asignar salidas; admin gestiona todo.
  const { user, error } = requireRole(request, 'operator', 'admin');
  if (error) return error;
  // Si no es admin, solo puede listar usuarios con role driver/operator
  // (necesario para asignación de salidas). Debe especificarlo explícito.
  const url = new URL(request.url);
  const requestedRole = url.searchParams.get('role');
  if (user!.role !== 'admin') {
    if (!requestedRole || (requestedRole !== 'driver' && requestedRole !== 'operator')) {
      return errorResponse('Indicá role=driver o role=operator', 403);
    }
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
    const role = searchParams.get('role');
    const zone = searchParams.get('zone');
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'active' | 'inactive'

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (zone) filter.zone = zone;
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { dni: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .populate('zone', 'name color district')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return successResponse({
      users,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return errorResponse('Error al obtener usuarios', 500);
  }
}

export async function POST(request: NextRequest) {
  const { error } = requireRole(request, 'admin');
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const {
      email,
      password,
      dni,
      firstName,
      lastName,
      phone,
      address,
      role,
    } = body;

    if (!email || !password || !dni || !firstName || !lastName || !address) {
      return errorResponse('Todos los campos obligatorios deben ser completados', 400);
    }

    if (!/^\d{8}$/.test(dni)) {
      return errorResponse('El DNI debe tener exactamente 8 dígitos', 400);
    }

    if (password.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const finalRole: 'citizen' | 'driver' | 'operator' | 'admin' =
      role === 'admin' || role === 'operator' || role === 'driver' ? role : 'driver';

    const existing = await User.findOne({ $or: [{ email }, { dni }] });
    if (existing) {
      return errorResponse(
        existing.email === email ? 'El correo ya está registrado' : 'El DNI ya está registrado',
        409,
        'DUPLICATE'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { location, zone } = await assignZoneByAddress(address);

    const user = await User.create({
      email,
      password: hashedPassword,
      dni,
      firstName,
      lastName,
      phone,
      address,
      role: finalRole,
      location: location ?? undefined,
      zone: zone ?? undefined,
      isVerified: true,
    });

    const populated = await User.findById(user._id)
      .select('-password')
      .populate('zone', 'name color district');

    return successResponse(populated, 'Usuario creado exitosamente', 201);
  } catch (err) {
    console.error('Create user error:', err);
    return errorResponse('Error al crear usuario', 500);
  }
}

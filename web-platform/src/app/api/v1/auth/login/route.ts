import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/utils/jwt';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return errorResponse('Correo y contraseña son obligatorios', 400);
    }

    const user = await User.findOne({ email: normalizedEmail })
      .select('+password')
      .populate('zone', 'name color district');
    if (!user) {
      return errorResponse('Credenciales incorrectas', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      return errorResponse('Cuenta desactivada. Contacte al administrador.', 403);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return errorResponse(`Cuenta bloqueada. Intente en ${minutes} minutos.`, 423, 'LOCKED');
    }

    if (!user.isVerified) {
      return errorResponse(
        'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.',
        403,
        'EMAIL_NOT_VERIFIED'
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 5;
        await user.save();
        return errorResponse(
          'Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en 15 minutos.',
          423,
          'LOCKED'
        );
      }
      await user.save();
      const remainingAttempts = Math.max(0, 5 - user.failedLoginAttempts);
      return errorResponse(
        `Credenciales incorrectas. Te quedan ${remainingAttempts} intento(s).`,
        401,
        'INVALID_CREDENTIALS'
      );
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      zone: user.zone?.toString(),
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return successResponse({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        dni: user.dni,
        phone: user.phone,
        address: user.address,
        zone: user.zone,
        avatar: user.avatar,
        profileComplete: user.profileComplete,
      },
    }, 'Inicio de sesión exitoso');
  } catch (error: unknown) {
    console.error('Login error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

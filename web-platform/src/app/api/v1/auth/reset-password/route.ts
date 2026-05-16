import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return errorResponse('Token y nueva contraseña son obligatorios', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse('La contraseña debe tener al menos 6 caracteres', 400);
    }

    const user = await User.findOne({ passwordResetToken: token }).select(
      '+passwordResetToken +passwordResetExpires +password'
    );

    if (!user) {
      return errorResponse('Token inválido', 400, 'INVALID_TOKEN');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return errorResponse('El token ha expirado', 400, 'TOKEN_EXPIRED');
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    return successResponse({ reset: true }, 'Contraseña actualizada correctamente');
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

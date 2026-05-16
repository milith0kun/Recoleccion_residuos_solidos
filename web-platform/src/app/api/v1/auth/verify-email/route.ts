import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, code } = await request.json();

    if (!email || !code) {
      return errorResponse('Correo y código son obligatorios', 400);
    }

    const user = await User.findOne({ email }).select(
      '+emailVerificationCode +emailVerificationExpires'
    );
    if (!user) {
      return errorResponse('Usuario no encontrado', 404);
    }

    if (user.isVerified && !user.emailVerificationCode) {
      return successResponse({ alreadyVerified: true }, 'Correo ya verificado');
    }

    if (!user.emailVerificationCode || user.emailVerificationCode !== String(code)) {
      return errorResponse('Código incorrecto', 400, 'INVALID_CODE');
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      return errorResponse(
        'El código ha expirado. Solicita uno nuevo.',
        400,
        'CODE_EXPIRED'
      );
    }

    user.isVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return successResponse({ verified: true }, 'Correo verificado correctamente');
  } catch (error: unknown) {
    console.error('Verify email error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

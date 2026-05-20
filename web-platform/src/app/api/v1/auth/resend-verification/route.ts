import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { sendVerificationEmail } from '@/lib/utils/email';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return errorResponse('Correo es obligatorio', 400);
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return successResponse(
        { sent: true },
        'Si el correo existe, se envió un nuevo código de verificación'
      );
    }

    if (user.isVerified) {
      return successResponse({ sent: false }, 'La cuenta ya está verificada');
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      await User.deleteOne({ _id: user._id });
      return errorResponse(
        'La cuenta temporal expiró y fue eliminada. Debes registrarte nuevamente.',
        400,
        'ACCOUNT_EXPIRED'
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailVerificationCode = code;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(normalizedEmail, code);

    return successResponse({ sent: true }, 'Código de verificación reenviado');
  } catch (error: unknown) {
    console.error('Resend verification error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

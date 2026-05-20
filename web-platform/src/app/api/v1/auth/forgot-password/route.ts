import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { sendPasswordResetEmail } from '@/lib/utils/email';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return errorResponse('Correo es obligatorio', 400);
    }

    const genericMsg =
      'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return successResponse({ sent: true }, genericMsg);
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(normalizedEmail, token);

    return successResponse({ sent: true }, genericMsg);
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

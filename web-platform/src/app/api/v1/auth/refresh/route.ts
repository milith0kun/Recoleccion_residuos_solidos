import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { signAccessToken, verifyRefreshToken } from '@/lib/utils/jwt';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return errorResponse('refreshToken es obligatorio', 400);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return errorResponse('Token inválido o expirado', 401, 'INVALID_REFRESH');
    }

    await connectDB();
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return errorResponse('Usuario no disponible', 401, 'UNAUTHORIZED');
    }

    const accessToken = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      zone: user.zone?.toString(),
    });

    return successResponse({ accessToken }, 'Token renovado');
  } catch (error: unknown) {
    console.error('Refresh error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

import { NextRequest } from 'next/server';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { connectDB } from '@/lib/db/connection';
import User, { type IUser } from '@/lib/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/utils/jwt';
import { successResponse, errorResponse } from '@/lib/utils/response';

const client = new OAuth2Client();

// Las audiences aceptadas deben coincidir con los Client IDs creados en Google Cloud Console
// para cada plataforma (web, Android, iOS).
function getAudiences(): string[] {
  return [
    process.env.GOOGLE_CLIENT_ID_WEB,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
    process.env.GOOGLE_CLIENT_ID_IOS,
  ].filter((id): id is string => Boolean(id));
}

async function verifyGoogleToken(idToken: string): Promise<TokenPayload | undefined> {
  const audience = getAudiences();
  if (audience.length === 0) {
    throw new Error('No Google Client IDs configured');
  }
  const ticket = await client.verifyIdToken({ idToken, audience });
  return ticket.getPayload();
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('idToken' in body)) {
      return errorResponse('idToken es obligatorio', 400);
    }
    const { idToken } = body as { idToken: unknown };
    if (typeof idToken !== 'string' || idToken.length === 0) {
      return errorResponse('idToken es obligatorio', 400);
    }

    let payload: TokenPayload | undefined;
    try {
      payload = await verifyGoogleToken(idToken);
    } catch (verifyError: unknown) {
      console.error('Google token verification failed:', verifyError);
      return errorResponse('Token de Google inválido', 401, 'INVALID_GOOGLE_TOKEN');
    }

    if (!payload || !payload.email_verified || !payload.email || !payload.sub) {
      return errorResponse('Token de Google inválido', 401, 'INVALID_GOOGLE_TOKEN');
    }

    const email = payload.email.toLowerCase();
    const googleId = payload.sub;

    let user: IUser | null = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
        if (payload.picture) {
          user.avatar = payload.picture;
        }
        await user.save();
      }
    } else {
      user = await User.create({
        email,
        googleId,
        provider: 'google',
        firstName: payload.given_name ?? '',
        lastName: payload.family_name ?? '',
        avatar: payload.picture,
        role: 'citizen',
        profileComplete: false,
        isVerified: true,
      });
    }

    if (!user) {
      return errorResponse('No se pudo crear o recuperar el usuario', 500);
    }

    if (!user.isActive) {
      return errorResponse('Cuenta desactivada. Contacte al administrador.', 403);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return errorResponse(`Cuenta bloqueada. Intente en ${minutes} minutos.`, 423, 'LOCKED');
    }

    const tokenPayload = {
      sub: (user._id as { toString(): string }).toString(),
      email: user.email,
      role: user.role,
      zone: user.zone?.toString(),
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    return successResponse(
      {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          dni: user.dni,
          zone: user.zone,
          avatar: user.avatar,
          profileComplete: user.profileComplete,
        },
      },
      'Inicio de sesión con Google exitoso'
    );
  } catch (error: unknown) {
    console.error('Google auth error:', error);
    return errorResponse('Error interno del servidor', 500);
  }
}

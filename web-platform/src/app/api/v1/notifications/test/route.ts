import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import { requireAuth } from '@/lib/middleware/auth';
import { successResponse, errorResponse } from '@/lib/utils/response';
import { sendExpoPush } from '@/lib/utils/push';

/**
 * Diagnóstico de push end-to-end:
 *   POST /api/v1/notifications/test
 *
 * Envía un push de prueba al usuario autenticado.
 * - Si no tiene `pushToken` guardado → 409 con mensaje claro (el móvil
 *   nunca registró el token, hay que verificar permisos / dispositivo
 *   físico / projectId).
 * - Si tiene token → llama a Expo Push API y devuelve cuántos tickets
 *   se enviaron/fallaron. El frontend muestra el resultado al usuario.
 *
 * Pensado para que cualquier usuario pueda verificar por sí mismo si su
 * dispositivo está recibiendo notificaciones.
 */
export async function POST(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const dbUser = await User.findById(user!.sub)
      .select('pushToken pushTokenUpdatedAt firstName')
      .lean<{ pushToken?: string | null; pushTokenUpdatedAt?: Date; firstName?: string }>();
    if (!dbUser) return errorResponse('Usuario no encontrado', 404);

    if (!dbUser.pushToken) {
      return errorResponse(
        'No tenés un token de notificaciones registrado. Asegurate de estar en un dispositivo físico (no emulador), haber aceptado los permisos al abrir la app y tener Internet.',
        409,
        'NO_PUSH_TOKEN'
      );
    }

    const result = await sendExpoPush([dbUser.pushToken], {
      title: 'Notificación de prueba',
      body: `Hola ${dbUser.firstName ?? ''}, si ves esto, las notificaciones están funcionando.`,
      data: { url: '/notifications', kind: 'system' },
    });

    if (result.sent === 0) {
      return errorResponse(
        'El servidor envió el push pero Expo lo rechazó. Probablemente el token expiró — reinstalá la app para regenerarlo.',
        502,
        'PUSH_FAILED'
      );
    }

    return successResponse(
      {
        tokenPreview: dbUser.pushToken.slice(0, 24) + '…',
        tokenUpdatedAt: dbUser.pushTokenUpdatedAt,
        ...result,
      },
      'Push de prueba enviado. Si no lo ves en pocos segundos, revisá los permisos del sistema.'
    );
  } catch (err) {
    console.error('POST /notifications/test error:', err);
    return errorResponse('Error al enviar push de prueba', 500);
  }
}

/**
 * GET /api/v1/notifications/test
 * Devuelve el estado del registro de push del usuario actual sin enviar
 * nada — útil para mostrar "Estás registrado / no registrado" en la UI.
 */
export async function GET(request: NextRequest) {
  const { user, error } = requireAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const dbUser = await User.findById(user!.sub)
      .select('pushToken pushTokenUpdatedAt')
      .lean<{ pushToken?: string | null; pushTokenUpdatedAt?: Date }>();
    if (!dbUser) return errorResponse('Usuario no encontrado', 404);

    return successResponse({
      registered: Boolean(dbUser.pushToken),
      tokenPreview: dbUser.pushToken
        ? dbUser.pushToken.slice(0, 24) + '…'
        : null,
      // Token completo: lo devolvemos solo al dueño del token para que
      // pueda copiarlo y probar manualmente desde
      // https://expo.dev/notifications sin necesidad de development build.
      token: dbUser.pushToken ?? null,
      tokenUpdatedAt: dbUser.pushTokenUpdatedAt ?? null,
    });
  } catch (err) {
    console.error('GET /notifications/test error:', err);
    return errorResponse('Error al consultar estado push', 500);
  }
}

import User from '@/lib/models/User';
import mongoose from 'mongoose';

/**
 * Helper para enviar notificaciones push vía el Expo Push API.
 * Doc: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Falla silenciosamente en log si el endpoint rechaza algún token —
 * la lógica de retry / cleanup de tokens inválidos queda fuera del
 * alcance del MVP (se puede agregar después leyendo el `receipts` API).
 */

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body: string;
  /** Datos arbitrarios — la app móvil lee `data.url` para deep-link. */
  data?: Record<string, unknown>;
  /** Sonido del dispositivo (default | null). */
  sound?: 'default' | null;
}

interface ExpoPushPayload extends PushMessage {
  to: string | string[];
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: Array<{ code: string; message: string }>;
}

/**
 * Envía una notificación a un set de Expo Push Tokens. El Expo API
 * acepta un array de mensajes (uno por destinatario o broadcast).
 *
 * @param tokens — lista de `ExponentPushToken[...]`. Se filtran los vacíos.
 * @param message — payload común (mismo title/body/data para todos).
 */
export async function sendExpoPush(
  tokens: (string | null | undefined)[],
  message: PushMessage
): Promise<{ sent: number; failed: number }> {
  const clean = tokens.filter(
    (t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken[')
  );
  if (clean.length === 0) return { sent: 0, failed: 0 };

  const payload: ExpoPushPayload[] = clean.map((to) => ({
    to,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: message.sound === null ? null : 'default',
  }));

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('[push] Expo API HTTP', res.status, await res.text());
      return { sent: 0, failed: clean.length };
    }

    const data = (await res.json()) as ExpoPushResponse;
    const tickets = Array.isArray(data.data) ? data.data : data.data ? [data.data] : [];
    const sent = tickets.filter((t) => t.status === 'ok').length;
    const failed = clean.length - sent;
    if (failed > 0) {
      const reasons = tickets
        .filter((t) => t.status === 'error')
        .map((t) => t.message || t.details?.error || 'unknown');
      console.warn('[push] tickets con error:', reasons);
    }
    return { sent, failed };
  } catch (err) {
    console.warn('[push] error al llamar Expo API:', err);
    return { sent: 0, failed: clean.length };
  }
}

/**
 * Helper: trae los push tokens de todos los ciudadanos de una zona
 * (que tengan token activo) y manda un push.
 */
export async function pushToZone(
  zoneId: string | mongoose.Types.ObjectId,
  message: PushMessage
): Promise<{ sent: number; failed: number }> {
  const users = await User.find({
    zone: zoneId,
    role: 'citizen',
    pushToken: { $ne: null },
    isActive: true,
  })
    .select('pushToken')
    .lean<{ pushToken?: string }[]>();
  return sendExpoPush(
    users.map((u) => u.pushToken),
    message
  );
}

/**
 * Helper: push a un user específico por su ID.
 */
export async function pushToUser(
  userId: string | mongoose.Types.ObjectId,
  message: PushMessage
): Promise<{ sent: number; failed: number }> {
  const user = await User.findById(userId).select('pushToken').lean<{ pushToken?: string }>();
  return sendExpoPush([user?.pushToken], message);
}

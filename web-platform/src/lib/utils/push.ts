import User from '@/lib/models/User';
import Notification, { type NotificationKind } from '@/lib/models/Notification';
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

/** Canal Android. La app debe haber creado un channel con este id al
 *  arrancar (ver mobile-app/src/hooks/usePushToken.ts). */
export type PushChannelId = 'default' | 'dispatches' | 'routes' | 'incidents';

export interface PushMessage {
  title: string;
  body: string;
  /** Datos arbitrarios — la app móvil lee `data.url` para deep-link.
   *  Si incluye `kind`, se usa para persistir la notificación en DB. */
  data?: Record<string, unknown>;
  /** Sonido del dispositivo (default | null). */
  sound?: 'default' | null;
  /** Canal Android. Por defecto 'default'. Usar canales especializados
   *  permite al usuario silenciar/activar por tipo desde Configuración. */
  channelId?: PushChannelId;
  /** Prioridad de entrega. 'high' = heads-up banner inmediato. */
  priority?: 'default' | 'high';
}

/**
 * Persiste registros de Notification en DB para que el destinatario los vea
 * en la pantalla de historial aunque el push del SO no haya llegado.
 * Falla silencioso — la mensajería ya se intentó por Expo.
 */
async function persistNotifications(
  userIds: (string | mongoose.Types.ObjectId)[],
  message: PushMessage
) {
  if (userIds.length === 0) return;
  const kind = ((message.data?.kind as string) || 'system') as NotificationKind;
  try {
    await Notification.insertMany(
      userIds.map((uid) => ({
        recipient: uid,
        kind,
        title: message.title,
        body: message.body,
        data: message.data ?? {},
        read: false,
      })),
      { ordered: false }
    );
  } catch (err) {
    console.warn('[push] no se pudo persistir Notification:', err);
  }
}

interface ExpoPushPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
  priority?: 'default' | 'high';
  // iOS — interruption level (active = banner sin molestar, time-sensitive
  // = bypassa modo silencio para alertas urgentes).
  interruptionLevel?: 'active' | 'critical' | 'passive' | 'time-sensitive';
  // Badge en iOS / Android Oreo+.
  badge?: number;
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

  const priority = message.priority ?? 'high';
  const payload: ExpoPushPayload[] = clean.map((to) => ({
    to,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
    sound: message.sound === null ? null : 'default',
    channelId: message.channelId ?? 'default',
    priority,
    // Para que en iOS aparezca el banner como heads-up también.
    interruptionLevel: priority === 'high' ? 'time-sensitive' : 'active',
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
    isActive: true,
  })
    .select('_id pushToken')
    .lean<{ _id: mongoose.Types.ObjectId; pushToken?: string }[]>();

  // Persistir para todos los destinatarios (incluso si no tienen pushToken
  // ahora — el día que se logueen lo verán en su historial).
  await persistNotifications(
    users.map((u) => u._id),
    message
  );

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
  await persistNotifications([userId], message);
  const user = await User.findById(userId).select('pushToken').lean<{ pushToken?: string }>();
  return sendExpoPush([user?.pushToken], message);
}

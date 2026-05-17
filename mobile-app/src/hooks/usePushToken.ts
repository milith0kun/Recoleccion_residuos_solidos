import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import api from '../api/client';

const PUSH_TOKEN_KEY = 'expoPushToken';

/**
 * Comportamiento de notificaciones cuando la app está en primer plano:
 * mostrar banner + reproducir sonido + actualizar badge.
 * Se setea una sola vez al cargar el módulo.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Canales Android. Se crean al primer arranque. Cada canal aparece como
 * una sub-opción en Configuración → SRSS Cusco → Notificaciones, así el
 * usuario puede activar/silenciar por tipo sin perder los demás.
 *
 * Todos en importancia HIGH para que aparezcan como heads-up (banner
 * pop-up en la pantalla) en lugar del comportamiento silencioso de
 * DEFAULT. Es el comportamiento esperado para alertas operativas.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  const channels: {
    id: string;
    name: string;
    description: string;
    importance: Notifications.AndroidImportance;
    vibrationPattern: number[];
  }[] = [
    {
      id: 'default',
      name: 'General',
      description: 'Avisos generales y de prueba.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    },
    {
      id: 'dispatches',
      name: 'Asignaciones de salida',
      description: 'Cuando te asignan una salida o cambia su estado.',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
    },
    {
      id: 'routes',
      name: 'Recolección en tu zona',
      description: 'Inicio, retrasos y cierre de la recolección.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 150, 200],
    },
    {
      id: 'incidents',
      name: 'Reportes ciudadanos',
      description: 'Actualizaciones de tus reportes y nuevos casos cercanos.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150, 100, 150],
    },
  ];
  for (const c of channels) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      description: c.description,
      importance: c.importance,
      vibrationPattern: c.vibrationPattern,
      lightColor: '#00684A',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableLights: true,
      enableVibrate: true,
    });
  }
}

/**
 * Pide permisos, obtiene el Expo push token y opcionalmente lo registra
 * en el backend. En emulador (no es Device) devuelve null sin pedir nada
 * (los emuladores no reciben pushes reales).
 */
export type PushRegisterError =
  | 'emulator'
  | 'permission_denied'
  | 'no_project_id'
  | 'token_failed';

export interface PushRegisterResult {
  token: string | null;
  error?: PushRegisterError;
  message?: string;
}

export async function registerForPushNotifications(): Promise<PushRegisterResult> {
  if (!Device.isDevice) {
    const message =
      'Estás usando un emulador. Las notificaciones push solo funcionan en dispositivos físicos.';
    console.warn('[push]', message);
    return { token: null, error: 'emulator', message };
  }

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') {
    const message =
      'No diste permisos de notificaciones. Activalos desde Configuración → Apps → SRSS Cusco → Notificaciones.';
    console.warn('[push]', message);
    return { token: null, error: 'permission_denied', message };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  if (!projectId) {
    const message = 'Falta projectId en app.json (extra.eas.projectId).';
    console.warn('[push]', message);
    return { token: null, error: 'no_project_id', message };
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    if (__DEV__) console.log('[push] token obtenido:', tokenData.data.slice(0, 24) + '…');
    return { token: tokenData.data };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'No se pudo obtener el token. Verificá que tengas Google Play Services (Android) o iCloud configurado (iOS).';
    console.warn('[push] error obteniendo token', err);
    return { token: null, error: 'token_failed', message };
  }
}

/**
 * Guarda el token local y lo registra contra el backend en
 * `PATCH /users/me { pushToken }`. Falla en silencio si el backend
 * todavía no soporta el campo — el token igual queda guardado local
 * para reintento posterior.
 */
export async function syncPushTokenWithBackend(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
  } catch (e) {
    if (__DEV__) console.warn('[push] no se pudo persistir token', e);
  }
  try {
    await api.patch('/users/me', { pushToken: token });
    if (__DEV__) console.log('[push] token registrado en backend');
  } catch (err) {
    if (__DEV__) console.warn('[push] backend rechazó pushToken (¿field no soportado?)', err);
  }
}

/**
 * Hook reactivo: al montar, registra el token (si corresponde) y lo
 * sincroniza con el backend. Devuelve el token actual y el estado.
 */
export function usePushToken(enabled: boolean) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');
  const [error, setError] = useState<PushRegisterError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!enabled) return;
    setStatus('loading');
    setError(null);
    setMessage(null);
    const result = await registerForPushNotifications();
    if (!result.token) {
      setStatus('denied');
      setError(result.error ?? null);
      setMessage(result.message ?? null);
      return;
    }
    setToken(result.token);
    setStatus('ready');
    await syncPushTokenWithBackend(result.token);
  }, [enabled]);

  useEffect(() => {
    register();
  }, [register]);

  return { token, status, error, message, register };
}

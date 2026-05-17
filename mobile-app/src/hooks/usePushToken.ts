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

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00684A',
  });
}

/**
 * Pide permisos, obtiene el Expo push token y opcionalmente lo registra
 * en el backend. En emulador (no es Device) devuelve null sin pedir nada
 * (los emuladores no reciben pushes reales).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    if (__DEV__) console.warn('[push] dispositivo virtual, no se solicita token');
    return null;
  }

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') {
    if (__DEV__) console.warn('[push] permiso denegado');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
  if (!projectId) {
    if (__DEV__) console.warn('[push] no se encontró projectId EAS');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (err) {
    if (__DEV__) console.warn('[push] error obteniendo token', err);
    return null;
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

  const register = useCallback(async () => {
    if (!enabled) return;
    setStatus('loading');
    const t = await registerForPushNotifications();
    if (!t) {
      setStatus('denied');
      return;
    }
    setToken(t);
    setStatus('ready');
    await syncPushTokenWithBackend(t);
  }, [enabled]);

  useEffect(() => {
    register();
  }, [register]);

  return { token, status };
}

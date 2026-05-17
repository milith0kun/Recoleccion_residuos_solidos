import { useCallback, useEffect, useState } from 'react';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

/**
 * `@react-native-google-signin/google-signin` registra un TurboModule nativo
 * que NO está en Expo Go. Si el bundle se carga ahí, todo el árbol que toca
 * este hook revienta con `RNGoogleSignin could not be found`. Cargamos el
 * módulo con require() dentro de try/catch — si falla (Expo Go), seguimos
 * con stub; en development build / producción se carga normal.
 */
type LazyGoogleSignin = {
  GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin;
  statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes;
};

let nativeMod: LazyGoogleSignin | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nativeMod = require('@react-native-google-signin/google-signin');
} catch {
  nativeMod = null;
}

let configured = false;
function ensureConfigured() {
  if (configured || !webClientId || !nativeMod) return;
  nativeMod.GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
  configured = true;
}

export type GoogleSignInOutcome =
  | { type: 'success'; idToken: string }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

export function useGoogleAuth() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!nativeMod) {
      setReady(false);
      return;
    }
    ensureConfigured();
    setReady(!!webClientId);
  }, []);

  const signIn = useCallback(async (): Promise<GoogleSignInOutcome> => {
    if (!nativeMod) {
      return {
        type: 'error',
        message: 'Google Sign-In requiere development build (no funciona en Expo Go).',
      };
    }
    ensureConfigured();
    try {
      await nativeMod.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await nativeMod.GoogleSignin.signIn();
      if (response.type === 'cancelled') return { type: 'cancelled' };
      const idToken = response.data?.idToken;
      if (!idToken) return { type: 'error', message: 'Google no devolvió un idToken' };
      return { type: 'success', idToken };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === nativeMod.statusCodes.SIGN_IN_CANCELLED) return { type: 'cancelled' };
      if (code === nativeMod.statusCodes.IN_PROGRESS) {
        return { type: 'error', message: 'Inicio de sesión en progreso' };
      }
      if (code === nativeMod.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { type: 'error', message: 'Google Play Services no disponible' };
      }
      const message = (err as Error)?.message ?? 'Error al iniciar sesión con Google';
      return { type: 'error', message };
    }
  }, []);

  return { ready, signIn };
}

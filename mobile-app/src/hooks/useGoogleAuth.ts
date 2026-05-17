import { useCallback, useEffect, useState } from 'react';
import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from '@react-native-google-signin/google-signin';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

let configured = false;
function ensureConfigured() {
  if (configured || !webClientId) return;
  GoogleSignin.configure({
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
    ensureConfigured();
    setReady(!!webClientId);
  }, []);

  const signIn = useCallback(async (): Promise<GoogleSignInOutcome> => {
    ensureConfigured();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response: SignInResponse = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return { type: 'cancelled' };
      const idToken = response.data?.idToken;
      if (!idToken) return { type: 'error', message: 'Google no devolvió un idToken' };
      return { type: 'success', idToken };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === statusCodes.SIGN_IN_CANCELLED) return { type: 'cancelled' };
      if (code === statusCodes.IN_PROGRESS) {
        return { type: 'error', message: 'Inicio de sesión en progreso' };
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { type: 'error', message: 'Google Play Services no disponible' };
      }
      const message = (err as Error)?.message ?? 'Error al iniciar sesión con Google';
      return { type: 'error', message };
    }
  }, []);

  return { ready, signIn };
}

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

type GoogleAuthResponse =
  | { type: 'success'; params: { id_token: string } }
  | { type: 'cancel' }
  | { type: 'dismiss' }
  | { type: 'error'; error: { message: string } };

const EXPO_PROXY_REDIRECT = 'https://auth.expo.io/@anonymous/srss-cusco';

function pickClientId(): string | undefined {
  if (Platform.OS === 'android') {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB
    );
  }
  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB
    );
  }
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;
}

function parseFragment(fragment: string): URLSearchParams {
  const clean = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  return new URLSearchParams(clean);
}

function parseIdTokenFromUrl(rawUrl: string): string | null {
  const hashIdx = rawUrl.indexOf('#');
  if (hashIdx === -1) return null;
  const params = parseFragment(rawUrl.slice(hashIdx + 1));
  return params.get('id_token');
}

export function useGoogleAuth() {
  const [response, setResponse] = useState<GoogleAuthResponse | null>(null);
  const clientId = pickClientId();
  const request = clientId ? { clientId } : null;

  const promptAsync = useCallback(async () => {
    if (!clientId) {
      const next: GoogleAuthResponse = {
        type: 'error',
        error: { message: 'Configura EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB en .env' },
      };
      setResponse(next);
      return next;
    }

    const nonceSeed = `${Date.now()}-${Math.random()}`;
    const nonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonceSeed
    );

    const redirectUri = EXPO_PROXY_REDIRECT;
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      'response_type=id_token&' +
      `scope=${encodeURIComponent('openid profile email')}&` +
      `nonce=${encodeURIComponent(nonce)}&` +
      'prompt=select_account';

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && 'url' in result && result.url) {
        const idToken = parseIdTokenFromUrl(result.url);
        const next: GoogleAuthResponse = idToken
          ? { type: 'success', params: { id_token: idToken } }
          : { type: 'error', error: { message: 'Google no devolvió id_token' } };
        setResponse(next);
        return next;
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        const next: GoogleAuthResponse = { type: result.type };
        setResponse(next);
        return next;
      }
      const next: GoogleAuthResponse = {
        type: 'error',
        error: { message: 'No se pudo completar la autenticación' },
      };
      setResponse(next);
      return next;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      const next: GoogleAuthResponse = { type: 'error', error: { message } };
      setResponse(next);
      return next;
    }
  }, [clientId]);

  return { request, response, promptAsync };
}

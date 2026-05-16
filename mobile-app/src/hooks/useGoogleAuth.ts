import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/**
 * Hook que envuelve expo-auth-session/providers/google.
 * - En APK (preview/production): usa Android Client ID con flujo nativo via Chrome Custom Tab.
 * - En Expo Go: usa Web Client ID via proxy.
 * Devuelve siempre `{ request, response, promptAsync }` con la forma esperada por login.tsx.
 */
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    scopes: ['openid', 'profile', 'email'],
  });

  return { request, response, promptAsync };
}

import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as Updates from 'expo-updates';
import * as Notifications from 'expo-notifications';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { usePushToken } from '../src/hooks/usePushToken';

async function checkForOtaUpdate() {
  if (__DEV__) return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    if (__DEV__) console.warn('[ota] check failed', e);
  }
}

/**
 * Subscriptor a notificaciones push.
 * - Solo dispara registro cuando hay sesión activa (`!!user`).
 * - Escucha taps en notificaciones para navegar al destino indicado en
 *   `data.url` (deep-link interno: ej. '/(tabs)/map', '/(operator)/jornada').
 */
function PushSubscription() {
  const { user } = useAuth();
  const router = useRouter();
  usePushToken(!!user);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) {
        router.push(url as never);
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    checkForOtaUpdate();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <PushSubscription />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      />
    </AuthProvider>
  );
}

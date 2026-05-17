import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { AppShell } from '../../src/components/layout/AppShell';
import { colors } from '../../src/theme/tokens';

export default function DriverLayout() {
  const { user, isDriver, isLoading } = useAuth();
  const router = useRouter();

  // Guards: sin sesión → /login. Citizen → /(tabs)/home.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isDriver) {
      router.replace('/(tabs)/home');
    }
  }, [user, isDriver, isLoading]);

  return (
    <AppShell role="driver">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
    </AppShell>
  );
}

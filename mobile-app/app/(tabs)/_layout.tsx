import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { AppShell } from '../../src/components/layout/AppShell';
import { colors } from '../../src/theme/tokens';

export default function CitizenLayout() {
  const { isOperator, isLoading, user } = useAuth();
  const router = useRouter();

  // Guards: sin sesión → /login. Operator/admin → /(operator)/jornada.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (isOperator) {
      router.replace('/(operator)/jornada');
    }
  }, [isOperator, isLoading, user]);

  return (
    <AppShell role="citizen">
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

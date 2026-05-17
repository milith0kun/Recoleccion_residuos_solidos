import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { AppShell } from '../../src/components/layout/AppShell';
import { colors } from '../../src/theme/tokens';

export default function PlannerLayout() {
  const { user, isPlanner, isLoading } = useAuth();
  const router = useRouter();

  // Guards: sin sesión → /login. No-planner (citizen / driver puro) sale.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isPlanner) {
      if (user.role === 'driver') {
        router.replace('/(driver)/jornada');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [user, isPlanner, isLoading]);

  return (
    <AppShell role="planner">
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

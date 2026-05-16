import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, isLoading, isOperator } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (isOperator) {
          router.replace('/(operator)/jornada');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, isOperator]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}

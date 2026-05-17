import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';

export default function TabsLayout() {
  const { isOperator, isLoading, user } = useAuth();
  const router = useRouter();

  // Operators should never see citizen tabs; bounce them to operator group.
  useEffect(() => {
    if (!isLoading && user && isOperator) {
      router.replace('/(operator)/jornada');
    }
  }, [isOperator, isLoading, user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#ECEAE6',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#8A8780',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Feather name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Horarios',
          tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="education"
        options={{
          title: 'Residuos',
          tabBarIcon: ({ color }) => <Feather name="trash-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

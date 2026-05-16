import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function OperatorTabsLayout() {
  const { user, isOperator, isLoading, getActiveExecutionId } = useAuth();
  const router = useRouter();
  const [activeExecution, setActiveExecution] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // Guard: bounce out if a non-operator somehow lands here
  useEffect(() => {
    if (!isLoading && (!user || !isOperator)) {
      router.replace('/');
    }
  }, [user, isOperator, isLoading]);

  const refreshExecution = useCallback(async () => {
    const id = await getActiveExecutionId();
    setActiveExecution(id);
  }, [getActiveExecutionId]);

  useEffect(() => {
    refreshExecution();
    // Poll every 4s so the header badge refreshes when the user changes screens
    const t = setInterval(refreshExecution, 4000);
    return () => clearInterval(t);
  }, [refreshExecution]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const onRoute = !!activeExecution;
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#0F172A' },
        headerShadowVisible: false,
        headerTitleStyle: { color: '#F8FAFC', fontWeight: '800', fontSize: 18 },
        headerTintColor: '#F8FAFC',
        headerRight: () => (
          <View style={[s.badge, onRoute ? s.badgeActive : s.badgeIdle]}>
            <Animated.View
              style={[
                s.dot,
                {
                  backgroundColor: onRoute ? '#10B981' : '#94A3B8',
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
            <Text style={[s.badgeText, { color: onRoute ? '#10B981' : '#94A3B8' }]}>
              {onRoute ? 'EN RUTA' : 'FUERA DE SERVICIO'}
            </Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="jornada"
        options={{
          title: 'Jornada',
          tabBarIcon: ({ color }) => <Feather name="clipboard" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Mi Ruta',
          tabBarIcon: ({ color }) => <Feather name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color }) => <Feather name="check-square" size={22} color={color} />,
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

const s = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 16,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  badgeIdle: {
    backgroundColor: 'rgba(148,163,184,0.1)',
    borderColor: 'rgba(148,163,184,0.3)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

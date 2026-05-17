import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontFamily } from '../../src/theme/tokens';

export default function OperatorTabsLayout() {
  const { user, isOperator, isLoading, getActiveExecutionId } = useAuth();
  const router = useRouter();
  const [activeExecution, setActiveExecution] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // Guards de acceso al grupo operador:
  //  - sin sesión → /login
  //  - sesión sin permisos (citizen) → /(tabs)/home
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isOperator) {
      router.replace('/(tabs)/home');
    }
  }, [user, isOperator, isLoading]);

  const refreshExecution = useCallback(async () => {
    const id = await getActiveExecutionId();
    setActiveExecution(id);
  }, [getActiveExecutionId]);

  useEffect(() => {
    refreshExecution();
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
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: fontFamily.serif,
          fontWeight: '500',
          fontSize: 18,
          color: colors.ink,
        },
        headerTintColor: colors.ink,
        headerRight: () => (
          <View style={[s.badge, onRoute ? s.badgeActive : s.badgeIdle]}>
            <Animated.View
              style={[
                s.dot,
                {
                  backgroundColor: onRoute ? colors.primary : colors.textMuted,
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
            <Text style={[s.badgeText, { color: onRoute ? colors.primaryDark : colors.textSecondary }]}>
              {onRoute ? 'EN RUTA' : 'FUERA DE SERVICIO'}
            </Text>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fontFamily.sansSemibold,
          fontSize: 10.5,
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="jornada"
        options={{
          title: 'Jornada',
          tabBarIcon: ({ color }) => <Feather name="clipboard" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Mi Ruta',
          tabBarIcon: ({ color }) => <Feather name="map" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color }) => <Feather name="check-square" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
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
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 16,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
  },
  badgeIdle: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.border,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9.5,
    letterSpacing: 0.7,
  },
});

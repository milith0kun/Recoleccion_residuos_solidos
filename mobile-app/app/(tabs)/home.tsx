import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/api/client';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { getZoneId } from '../../src/utils/zone';

interface Stats {
  routes: number;
  vehicles: number;
}

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({ routes: 0, vehicles: 0 });

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  const loadData = async () => {
    try {
      const [resRoutes, resVehicles] = await Promise.all([
        api.get('/routes'),
        api.get('/vehicles'),
      ]);
      setStats({
        routes: resRoutes.data?.data?.length || 0,
        vehicles: resVehicles.data?.data?.length || 0,
      });
    } catch (e) {
      if (__DEV__) console.warn('[home] resumen failed', e);
    }
  };

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const needsZone = !getZoneId(user?.zone);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Bienvenido · SRSS Cusco</Text>
            <Text style={s.hello}>
              Hola, <Text style={s.helloName}>{user?.firstName || 'vecino'}</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {needsZone ? (
          <TouchableOpacity
            style={s.onboardingCard}
            onPress={() => router.push('/profile-edit')}
            activeOpacity={0.9}
          >
            <View style={s.onboardingIcon}>
              <Feather name="map-pin" size={16} color={colors.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.onboardingTitle}>Seleccioná tu zona</Text>
              <Text style={s.onboardingDesc}>
                Para ver tus horarios y recibir alertas cuando el camión pase cerca.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.warn} />
          </TouchableOpacity>
        ) : null}

        <View style={s.heroCard}>
          <View style={s.heroBadge}>
            <View style={s.heroDot} />
            <Text style={s.heroLabel}>Próxima recolección</Text>
          </View>
          <Text style={s.heroTime}>14:00 — 16:30</Text>
          <Text style={s.heroDesc}>Tu zona está programada para hoy.</Text>
          <TouchableOpacity
            style={s.heroBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Feather name="map-pin" size={14} color="#FFFFFF" />
            <Text style={s.heroBtnText}>Rastrear en el mapa</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Accesos rápidos</Text>
        <View style={s.quickRow}>
          <QuickItem
            label="Horarios"
            icon="calendar"
            onPress={() => router.push('/(tabs)/schedule')}
          />
          <QuickItem
            label="Reciclaje"
            icon="refresh-cw"
            onPress={() => router.push('/(tabs)/education')}
          />
          <QuickItem
            label="Mi perfil"
            icon="user"
            onPress={() => router.push('/(tabs)/profile')}
          />
        </View>

        <Text style={s.sectionTitle}>Resumen de la ciudad</Text>
        <View style={s.statsRow}>
          <StatBox value={stats.routes} label="Rutas activas" icon="git-branch" tone="primary" />
          <StatBox value={stats.vehicles} label="Camiones" icon="truck" tone="info" />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/education')}
          style={s.eduCard}
        >
          <View style={s.eduIcon}>
            <Feather name="book-open" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.eduTitle}>Guía de reciclaje</Text>
            <Text style={s.eduSub}>NTP 900.058 · aprendé a separar tus residuos.</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

interface QuickItemProps {
  label: string;
  onPress: () => void;
  icon: FeatherIconName;
}

function QuickItem({ label, onPress, icon }: QuickItemProps) {
  return (
    <TouchableOpacity style={s.quickItem} onPress={onPress} activeOpacity={0.85}>
      <View style={s.quickAccent} />
      <View style={s.quickIconWrap}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={s.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

interface StatBoxProps {
  value: number;
  label: string;
  icon: FeatherIconName;
  tone: 'primary' | 'info' | 'warn' | 'danger';
}

function StatBox({ value, label, icon, tone }: StatBoxProps) {
  const toneMap = {
    primary: { color: colors.primary, border: colors.primary },
    info: { color: colors.info, border: colors.info },
    warn: { color: colors.warn, border: colors.warn },
    danger: { color: colors.danger, border: colors.danger },
  };
  const t = toneMap[tone];
  return (
    <View style={[s.statBox, { borderLeftColor: t.border }]}>
      <View style={s.statHeader}>
        <Feather name={icon} size={13} color={t.color} />
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statNum, { color: t.color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: 60, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  hello: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  helloName: {
    fontFamily: fontFamily.serif,
    color: colors.primary,
    fontStyle: 'italic',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.primaryDark,
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },

  heroCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  heroLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primaryDark,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  heroTime: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 4,
  },
  heroDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  heroBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  sectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickItem: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    alignItems: 'center',
  },
  quickAccent: {
    width: 0,
    height: 0,
  },
  quickIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 12.5,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  statNum: {
    fontFamily: fontFamily.serif,
    fontSize: 30,
    fontWeight: '500',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },

  eduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  eduIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eduTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 2,
  },
  eduSub: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
  },

  onboardingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warnSoft,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.warn,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  onboardingIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.warnBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.warn,
    marginBottom: 2,
  },
  onboardingDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

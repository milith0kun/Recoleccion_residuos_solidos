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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../src/theme/tokens';
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
            <Text style={s.helloSub}>Bienvenido</Text>
            <Text style={s.hello}>Hola, {user?.firstName || 'vecino'}</Text>
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
              <Feather name="map-pin" size={18} color={colors.warn} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.onboardingTitle}>Seleccioná tu zona</Text>
              <Text style={s.onboardingDesc}>
                Para ver tus horarios y recibir alertas cuando el camión pase cerca.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.warn} />
          </TouchableOpacity>
        ) : null}

        <View style={s.heroWrap}>
          <LinearGradient
            colors={['rgba(16,185,129,0.32)', 'rgba(16,185,129,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroCard}
          >
            <LinearGradient
              colors={['rgba(52,211,153,0.22)', 'rgba(15,23,42,0)']}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={s.heroGlow}
              pointerEvents="none"
            />
            <View style={s.heroBadge}>
              <View style={s.heroDot} />
              <Text style={s.heroLabel}>PRÓXIMA RECOLECCIÓN</Text>
            </View>
            <Text style={s.heroTime}>14:00 — 16:30</Text>
            <Text style={s.heroDesc}>Tu zona está programada para hoy</Text>
            <TouchableOpacity
              style={s.heroBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/map')}
            >
              <Feather name="map-pin" size={14} color="#FFF" />
              <Text style={s.heroBtnText}>Rastrear en el mapa</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={s.sectionTitle}>Accesos rápidos</Text>
        <View style={s.quickRow}>
          <QuickItem
            label="Horarios"
            icon="calendar"
            onPress={() => router.push('/(tabs)/schedule')}
            accent={colors.info}
          />
          <QuickItem
            label="Reciclaje"
            icon="refresh-cw"
            onPress={() => router.push('/(tabs)/education')}
            accent={colors.primary}
          />
          <QuickItem
            label="Mi perfil"
            icon="user"
            onPress={() => router.push('/(tabs)/profile')}
            accent={colors.warn}
          />
        </View>

        <Text style={s.sectionTitle}>Resumen de la ciudad</Text>
        <View style={s.statsRow}>
          <StatBox
            value={stats.routes}
            label="Rutas activas"
            accent={colors.primary}
            icon="git-branch"
          />
          <StatBox
            value={stats.vehicles}
            label="Camiones"
            accent={colors.info}
            icon="truck"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/education')}
          style={s.eduCard}
        >
          <View style={s.eduIcon}>
            <Feather name="book-open" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.eduTitle}>Guía de Reciclaje</Text>
            <Text style={s.eduSub}>NTP 900.058 · aprende a separar tus residuos</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

interface QuickItemProps {
  label: string;
  onPress: () => void;
  accent: string;
  icon: FeatherIconName;
}

function QuickItem({ label, onPress, accent, icon }: QuickItemProps) {
  return (
    <TouchableOpacity style={s.quickItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.quickAccent, { backgroundColor: accent }]} />
      <View style={[s.quickIconWrap, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}>
        <Feather name={icon} size={18} color={accent} />
      </View>
      <Text style={s.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

interface StatBoxProps {
  value: number;
  label: string;
  accent: string;
  icon: FeatherIconName;
}

function StatBox({ value, label, accent, icon }: StatBoxProps) {
  return (
    <View style={s.statBox}>
      <View style={s.statHeader}>
        <Feather name={icon} size={14} color={accent} />
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[s.statNum, { color: accent }]}>{value}</Text>
      <LinearGradient
        colors={[`${accent}00`, accent, `${accent}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.statSpark}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: 60, paddingBottom: 40 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  helloSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  hello: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  heroWrap: {
    marginBottom: spacing.xxxl,
    borderRadius: radius.xxl,
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroCard: {
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15,23,42,0.45)',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    color: colors.primary,
  },
  heroTime: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1.2,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 18,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },

  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  quickItem: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickAccent: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginBottom: spacing.md,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  statNum: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginBottom: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statSpark: {
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },

  eduCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSoft,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  eduIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eduTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  eduSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },

  onboardingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warnSoft,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.4)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  onboardingIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.warn,
    marginBottom: 2,
  },
  onboardingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});

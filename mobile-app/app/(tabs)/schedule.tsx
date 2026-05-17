import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { getZoneId } from '../../src/utils/zone';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface WasteTypeRef {
  _id: string;
  name: string;
  colorCode: string;
}

interface RouteSchedule {
  dayOfWeek: number[];
  startTime: string;
  estimatedDuration?: number;
}

interface RouteData {
  _id: string;
  name: string;
  status?: 'active' | 'completed' | 'pending' | 'planned' | 'inactive';
  schedule?: RouteSchedule;
  wasteTypes?: WasteTypeRef[];
  zone?: { _id: string; name?: string; color?: string } | string;
}

type RouteBadge = 'active' | 'upcoming' | 'completed' | 'idle';

function parseHHMM(time: string | undefined): { hours: number; minutes: number } | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return { hours: parseInt(match[1], 10), minutes: parseInt(match[2], 10) };
}

function getBadge(route: RouteData, selectedDay: number, isToday: boolean): RouteBadge {
  if (!route.schedule || !route.schedule.dayOfWeek.includes(selectedDay)) return 'idle';
  if (!isToday) return 'idle';

  const parsed = parseHHMM(route.schedule.startTime);
  if (!parsed) return 'idle';

  const now = new Date();
  const start = new Date();
  start.setHours(parsed.hours, parsed.minutes, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (route.schedule.estimatedDuration || 120));

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'active';
  return 'completed';
}

const BADGE_META: Record<RouteBadge, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'Activa ahora', color: colors.primaryDark, bg: colors.primarySoft, border: colors.primaryBorder },
  upcoming: { label: 'Próxima', color: colors.warn, bg: colors.warnSoft, border: colors.warnBorder },
  completed: { label: 'Completada', color: colors.info, bg: colors.infoSoft, border: colors.infoBorder },
  idle: { label: 'Programada', color: colors.textSecondary, bg: colors.bgSurface, border: colors.border },
};

export default function ScheduleScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const today = new Date().getDay();
  const userZoneId = getZoneId(user?.zone);

  const loadRoutes = async () => {
    try {
      const params: Record<string, string> = {};
      if (userZoneId) params.zone = userZoneId;
      const { data } = await api.get('/routes', { params });
      setRoutes((data?.data || []) as RouteData[]);
    } catch (e) {
      if (__DEV__) console.warn('[schedule] /routes failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userZoneId) {
      setLoading(false);
      return;
    }
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userZoneId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const onSelectDay = (day: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedDay(day);
  };

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => r.schedule?.dayOfWeek.includes(selectedDay));
  }, [routes, selectedDay]);

  const isToday = selectedDay === today;

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Cargando horarios...</Text>
      </View>
    );
  }

  if (!userZoneId) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>Recolección por zona</Text>
        <Text style={s.pageTitle}>Horarios</Text>
        <Text style={s.pageSub}>Programación semanal de recolección en tu zona.</Text>

        <View style={s.zoneNeededCard}>
          <View style={s.zoneNeededIcon}>
            <Feather name="map-pin" size={22} color={colors.warn} />
          </View>
          <Text style={s.zoneNeededTitle}>Aún no configuraste tu zona</Text>
          <Text style={s.zoneNeededDesc}>
            Para ver los horarios de recolección en tu zona, primero seleccionala desde tu perfil.
          </Text>
          <TouchableOpacity
            style={s.zoneNeededBtn}
            onPress={() => router.push('/profile-edit')}
            activeOpacity={0.85}
          >
            <Feather name="settings" size={14} color="#FFFFFF" />
            <Text style={s.zoneNeededBtnText}>Configurar mi zona</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={s.eyebrow}>Recolección por zona</Text>
      <Text style={s.pageTitle}>Horarios</Text>
      <Text style={s.pageSub}>Programación semanal de recolección en tu zona.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.weekRow}
      >
        {DAYS_SHORT.map((label, idx) => {
          const active = idx === selectedDay;
          const isTodayPill = idx === today;
          return (
            <TouchableOpacity key={label} onPress={() => onSelectDay(idx)} activeOpacity={0.85}>
              <View
                style={[
                  s.dayPill,
                  active && s.dayPillActive,
                  !active && isTodayPill && s.dayPillToday,
                ]}
              >
                <Text
                  style={[
                    s.dayLabel,
                    {
                      color: active
                        ? colors.primaryDark
                        : isTodayPill
                        ? colors.info
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {label}
                </Text>
                {isTodayPill && (
                  <Text
                    style={[s.todayMicro, { color: active ? colors.primaryDark : colors.info }]}
                  >
                    HOY
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.subHeader}>
        <Text style={s.subHeaderText}>
          {DAYS_LONG[selectedDay]}
          {isToday ? ' · Hoy' : ''}
        </Text>
        <Text style={s.subHeaderCount}>
          {filteredRoutes.length} ruta{filteredRoutes.length === 1 ? '' : 's'}
        </Text>
      </View>

      {filteredRoutes.map((route) => {
        const badge = getBadge(route, selectedDay, isToday);
        const meta = BADGE_META[badge];
        const zone = typeof route.zone === 'object' ? route.zone : null;

        return (
          <View key={route._id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.routeName} numberOfLines={1}>
                {route.name}
              </Text>
              <View
                style={[
                  s.statusBadge,
                  { backgroundColor: meta.bg, borderColor: meta.border },
                ]}
              >
                <Text style={[s.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            {zone ? (
              <View style={s.zoneRow}>
                <View style={[s.zoneDot, { backgroundColor: zone.color || colors.info }]} />
                <Text style={s.zoneText}>{zone.name || 'Zona'}</Text>
              </View>
            ) : null}

            <View style={s.detailGrid}>
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>INICIO</Text>
                <Text style={s.detailValue}>{route.schedule?.startTime || '—'}</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailLabel}>DURACIÓN</Text>
                <Text style={s.detailValue}>
                  {route.schedule?.estimatedDuration
                    ? `${route.schedule.estimatedDuration} min`
                    : '—'}
                </Text>
              </View>
            </View>

            {route.wasteTypes && route.wasteTypes.length > 0 && (
              <View style={s.wasteBox}>
                <Text style={s.wasteLabel}>RESIDUOS</Text>
                <View style={s.wasteTags}>
                  {route.wasteTypes.map((wt) => (
                    <View
                      key={wt._id}
                      style={[
                        s.wasteTag,
                        {
                          backgroundColor: `${wt.colorCode}12`,
                          borderColor: `${wt.colorCode}40`,
                        },
                      ]}
                    >
                      <View style={[s.wasteColorDot, { backgroundColor: wt.colorCode }]} />
                      <Text style={[s.wasteTagText, { color: wt.colorCode }]}>{wt.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {isToday && badge === 'completed' && (
              <View
                style={[s.notice, { backgroundColor: colors.infoSoft, borderColor: colors.infoBorder }]}
              >
                <Text style={[s.noticeText, { color: colors.info }]}>
                  La recolección de hoy ya terminó.
                </Text>
              </View>
            )}
            {isToday && badge === 'upcoming' && (
              <View
                style={[s.notice, { backgroundColor: colors.warnSoft, borderColor: colors.warnBorder }]}
              >
                <Text style={[s.noticeText, { color: colors.warn }]}>
                  Aún no inicia hoy. Prepará tus residuos.
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {filteredRoutes.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>Sin rutas este día</Text>
          <Text style={s.emptyText}>
            No hay recolección programada para {DAYS_LONG[selectedDay]}.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: 60, paddingBottom: 40 },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 28,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 4,
  },
  pageSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },

  weekRow: { gap: spacing.xs, paddingBottom: 4 },
  dayPill: {
    width: 54,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dayPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  dayPillToday: {
    borderColor: colors.infoBorder,
  },
  dayLabel: { fontFamily: fontFamily.sansBold, fontSize: 13 },
  todayMicro: {
    fontFamily: fontFamily.sansBold,
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 2,
  },

  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  subHeaderText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 15,
  },
  subHeaderCount: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 12,
  },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  routeName: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },

  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  zoneDot: { width: 7, height: 7, borderRadius: 3.5 },
  zoneText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    color: colors.textSecondary,
  },

  detailGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  detailItem: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  detailLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  detailValue: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.2,
  },

  wasteBox: { marginTop: 2 },
  wasteLabel: {
    fontFamily: fontFamily.sansBold,
    color: colors.textSecondary,
    fontSize: 10,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  wasteTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wasteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  wasteColorDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  wasteTagText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
  },

  notice: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  noticeText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
  },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  zoneNeededCard: {
    backgroundColor: colors.warnSoft,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.warn,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  zoneNeededIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.warnBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  zoneNeededTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  zoneNeededDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  zoneNeededBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  zoneNeededBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

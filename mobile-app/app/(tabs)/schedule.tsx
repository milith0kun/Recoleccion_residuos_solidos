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
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { colors, radius, spacing } from '../../src/theme/tokens';

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

const BADGE_META: Record<RouteBadge, { label: string; color: string; bg: string }> = {
  active: { label: 'Activa ahora', color: colors.primary, bg: 'rgba(16,185,129,0.15)' },
  upcoming: { label: 'Próxima', color: colors.warn, bg: 'rgba(245,158,11,0.15)' },
  completed: { label: 'Completada', color: colors.info, bg: 'rgba(59,130,246,0.15)' },
  idle: { label: 'Programada', color: colors.textMuted, bg: 'rgba(148,163,184,0.1)' },
};

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const today = new Date().getDay();

  const loadRoutes = async () => {
    try {
      const params: Record<string, string> = {};
      if (user?.zone) params.zone = user.zone;
      const { data } = await api.get('/routes', { params });
      setRoutes((data?.data || []) as RouteData[]);
    } catch (e) {
      if (__DEV__) console.warn('[schedule] /routes failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.zone]);

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

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
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
                  {
                    backgroundColor: active ? colors.primarySoft : 'rgba(30,41,59,0.6)',
                    borderColor: active
                      ? colors.primary
                      : isTodayPill
                      ? colors.info
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    s.dayLabel,
                    {
                      color: active
                        ? colors.primary
                        : isTodayPill
                        ? colors.info
                        : colors.textMuted,
                    },
                  ]}
                >
                  {label}
                </Text>
                {isTodayPill && (
                  <Text style={[s.todayMicro, { color: active ? colors.primary : colors.info }]}>
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
                  { backgroundColor: meta.bg, borderColor: `${meta.color}55` },
                ]}
              >
                <Text style={[s.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            {zone && (
              <Text style={[s.zoneText, { color: zone.color || colors.info }]}>
                {zone.name || 'Zona'}
              </Text>
            )}

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
                          backgroundColor: `${wt.colorCode}15`,
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
              <View style={[s.notice, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                <Text style={[s.noticeText, { color: colors.info }]}>
                  La recolección de hoy ya terminó.
                </Text>
              </View>
            )}
            {isToday && badge === 'upcoming' && (
              <View
                style={[
                  s.notice,
                  { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
                ]}
              >
                <Text style={[s.noticeText, { color: colors.warn }]}>
                  Aún no inicia hoy. Prepara tus residuos.
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
  loadingText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },

  pageTitle: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg, fontWeight: '500' },

  weekRow: { gap: spacing.sm, paddingBottom: 4 },
  dayPill: {
    width: 56,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayLabel: { fontSize: 13, fontWeight: '800' },
  todayMicro: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  subHeaderText: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  subHeaderCount: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.xl,
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
  routeName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, flex: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },

  zoneText: { fontSize: 12, fontWeight: '700', marginBottom: spacing.md },

  detailGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  detailItem: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bgElevated,
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textFaint,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '800' },

  wasteBox: { marginTop: 2 },
  wasteLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  wasteTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wasteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  wasteColorDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  wasteTagText: { fontSize: 11, fontWeight: '700' },

  notice: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  noticeText: { fontSize: 12, fontWeight: '600' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

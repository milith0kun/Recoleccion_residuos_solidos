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
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';

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

const BADGE_META: Record<RouteBadge, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: 'Activa ahora', color: '#10B981', bg: 'rgba(16,185,129,0.15)', dot: '#10B981' },
  upcoming: { label: 'Próxima', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', dot: '#F59E0B' },
  completed: { label: 'Completada hoy', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', dot: '#3B82F6' },
  idle: { label: 'Programada', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', dot: '#94A3B8' },
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
      console.error(e);
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
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
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
              <LinearGradient
                colors={
                  active
                    ? ['rgba(16,185,129,0.45)', 'rgba(16,185,129,0.15)']
                    : ['rgba(30,41,59,0.7)', 'rgba(30,41,59,0.3)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  s.dayPill,
                  {
                    borderColor: active ? '#10B981' : isTodayPill ? '#3B82F6' : '#334155',
                  },
                ]}
              >
                {isTodayPill && <View style={s.todayDot} />}
                <Text style={[s.dayLabel, { color: active ? '#10B981' : isTodayPill ? '#3B82F6' : '#94A3B8' }]}>
                  {label}
                </Text>
                {isTodayPill && (
                  <Text style={[s.todayMicro, { color: active ? '#10B981' : '#3B82F6' }]}>HOY</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.subHeader}>
        <Text style={s.subHeaderText}>
          {DAYS_LONG[selectedDay]}
          {isToday ? ' · Hoy' : ''}
        </Text>
        <Text style={s.subHeaderCount}>{filteredRoutes.length} ruta{filteredRoutes.length === 1 ? '' : 's'}</Text>
      </View>

      {filteredRoutes.map((route) => {
        const badge = getBadge(route, selectedDay, isToday);
        const meta = BADGE_META[badge];
        const zone = typeof route.zone === 'object' ? route.zone : null;

        return (
          <View key={route._id} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardTitleBox}>
                <Feather name="map" size={18} color="#10B981" style={{ marginRight: 8 }} />
                <Text style={s.routeName}>{route.name}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: meta.bg, borderColor: `${meta.color}60` }]}>
                <View style={[s.statusDot, { backgroundColor: meta.dot }]} />
                <Text style={[s.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            {zone && (
              <View style={s.zoneRow}>
                <Feather name="map-pin" size={12} color={zone.color || '#3B82F6'} style={{ marginRight: 6 }} />
                <Text style={[s.zoneText, { color: zone.color || '#3B82F6' }]}>{zone.name || 'Zona'}</Text>
              </View>
            )}

            <View style={s.detailGrid}>
              <View style={s.detailItem}>
                <Feather name="clock" size={14} color="#94A3B8" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={s.detailLabel}>Inicio</Text>
                  <Text style={s.detailValue}>{route.schedule?.startTime || '—'}</Text>
                </View>
              </View>
              <View style={s.detailItem}>
                <Feather name="watch" size={14} color="#94A3B8" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={s.detailLabel}>Duración</Text>
                  <Text style={s.detailValue}>
                    {route.schedule?.estimatedDuration ? `${route.schedule.estimatedDuration} min` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            {route.wasteTypes && route.wasteTypes.length > 0 && (
              <View style={s.wasteBox}>
                <Text style={s.wasteLabel}>RESIDUOS</Text>
                <View style={s.wasteTags}>
                  {route.wasteTypes.map((wt) => (
                    <View
                      key={wt._id}
                      style={[s.wasteTag, { backgroundColor: `${wt.colorCode}15`, borderColor: `${wt.colorCode}40` }]}
                    >
                      <View style={[s.wasteColorDot, { backgroundColor: wt.colorCode }]} />
                      <Text style={[s.wasteTagText, { color: wt.colorCode }]}>{wt.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {isToday && badge === 'completed' && (
              <View style={s.notice}>
                <Feather name="check" size={12} color="#3B82F6" style={{ marginRight: 6 }} />
                <Text style={s.noticeText}>La recolección de hoy ya terminó.</Text>
              </View>
            )}
            {isToday && badge === 'upcoming' && (
              <View style={[s.notice, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Feather name="bell" size={12} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={[s.noticeText, { color: '#F59E0B' }]}>Aún no inicia hoy. Prepara tus residuos.</Text>
              </View>
            )}
          </View>
        );
      })}

      {filteredRoutes.length === 0 && (
        <View style={s.emptyBox}>
          <Feather name="inbox" size={48} color="#334155" style={{ marginBottom: 16 }} />
          <Text style={s.emptyTitle}>Sin rutas este día</Text>
          <Text style={s.emptyText}>No hay recolección programada para {DAYS_LONG[selectedDay]}.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#F8FAFC', marginBottom: 4, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: '#94A3B8', marginBottom: 18, fontWeight: '500' },
  weekRow: { gap: 8, paddingBottom: 4 },
  dayPill: {
    width: 56, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  todayDot: {
    position: 'absolute', top: 6, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6',
  },
  dayLabel: { fontSize: 13, fontWeight: '800' },
  todayMicro: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 14 },
  subHeaderText: { color: '#F8FAFC', fontSize: 16, fontWeight: '800' },
  subHeaderCount: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: 'rgba(30,41,59,0.6)', borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitleBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  routeName: { fontSize: 16, fontWeight: '800', color: '#F8FAFC', flex: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  zoneText: { fontSize: 12, fontWeight: '700' },
  detailGrid: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  detailItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.6)',
    padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#1E293B',
  },
  detailLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: '#F8FAFC', fontWeight: '800', marginTop: 2 },
  wasteBox: { marginTop: 2 },
  wasteLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  wasteTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wasteTag: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, borderWidth: 1,
  },
  wasteColorDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  wasteTagText: { fontSize: 11, fontWeight: '700' },
  notice: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  noticeText: { fontSize: 11, color: '#3B82F6', fontWeight: '600' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#94A3B8', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingHorizontal: 30 },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { useGpsTracker } from '../../src/hooks/useGpsTracker';

interface Waypoint {
  order: number;
  name: string;
  location: { type: 'Point'; coordinates: [number, number] };
  estimatedArrival?: string;
}

interface Route {
  _id: string;
  name: string;
  status: string;
  vehicle?: { _id: string; plate?: string; type?: string };
  zone?: { _id: string; name?: string; district?: string };
  schedule?: { dayOfWeek?: number[]; startTime?: string; estimatedDuration?: number };
  waypoints?: Waypoint[];
}

interface Execution {
  _id: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'delayed';
  startedAt: string;
  endedAt?: string;
  route: Route;
  vehicle?: { _id: string; plate?: string; type?: string };
  waypointsVisited?: { waypoint: number; arrivedAt: string; skipped?: boolean }[];
  delayMinutes?: number;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function JornadaScreen() {
  const { user, getActiveExecutionId, setActiveExecutionId } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const [delayModal, setDelayModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState('15');
  const [finishModal, setFinishModal] = useState(false);

  const activeId = execution?._id ?? null;
  const tracker = useGpsTracker(execution?.status === 'in_progress' ? activeId : null);

  // Pulse for "GPS activo" dot
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const todayDow = new Date().getDay(); // 0=Sun..6=Sat

  const loadData = useCallback(async () => {
    try {
      const activeRes = await api.get('/route-executions', {
        params: { operator: 'me', status: 'in_progress' },
      });
      const activeList: Execution[] = activeRes.data.data || [];
      const current = activeList[0] || null;

      if (current) {
        setExecution(current);
        await setActiveExecutionId(current._id);
        setLoading(false);
        return;
      }

      // No active execution: clear local id and load assigned routes
      await setActiveExecutionId(null);
      setExecution(null);

      // Fetch all routes and filter client-side by operator (operator filter on
      // /routes is not honored server-side today)
      const routesRes = await api.get('/routes', { params: { status: 'active' } });
      const all: any[] = routesRes.data.data || [];
      const mine = all.filter((r) => {
        const opId = typeof r.operator === 'string' ? r.operator : r.operator?._id;
        return opId === user?.id;
      });
      setRoutes(mine);
    } catch (e: any) {
      console.error('loadData jornada:', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setActiveExecutionId]);

  // Restore active execution id from SecureStore on first focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const stored = await getActiveExecutionId();
        // If we have a stored id but no execution loaded, attempt to hydrate
        if (stored && !execution && !cancelled) {
          try {
            const { data } = await api.get(`/route-executions/${stored}`);
            if (data?.data && !cancelled) {
              if (data.data.status === 'in_progress') {
                setExecution(data.data);
              } else {
                await setActiveExecutionId(null);
              }
            }
          } catch (e) {
            // execution not retrievable, clear
            await setActiveExecutionId(null);
          }
        }
        if (!cancelled) loadData();
      })();
      return () => {
        cancelled = true;
      };
    }, [loadData])
  );

  // Elapsed-time ticker
  useEffect(() => {
    if (!execution?.startedAt || execution.status !== 'in_progress') return;
    const started = new Date(execution.startedAt).getTime();
    const update = () => setElapsed(Date.now() - started);
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [execution?.startedAt, execution?.status]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startJornada = async (route: Route) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu ubicación para registrar el recorrido.'
        );
        return;
      }

      const { data } = await api.post('/route-executions', { routeId: route._id });
      if (!data?.success) throw new Error(data?.error?.message || 'No se pudo iniciar');

      const exec: Execution = data.data;
      await setActiveExecutionId(exec._id);
      setExecution(exec);
      Alert.alert('Jornada iniciada', 'Tu ubicación se enviará automáticamente cada 10s.');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error?.message || err?.message || 'No se pudo iniciar la jornada'
      );
    }
  };

  const finalizeJornada = async () => {
    if (!execution) return;
    setFinishing(true);
    try {
      const { data } = await api.patch(`/route-executions/${execution._id}`, {
        status: 'completed',
        endedAt: new Date().toISOString(),
      });
      if (!data?.success) throw new Error(data?.error?.message || 'No se pudo finalizar');
      await setActiveExecutionId(null);
      setExecution(null);
      setFinishModal(false);
      Alert.alert(
        'Jornada completada',
        `Excelente trabajo. Duración total: ${formatElapsed(elapsed)}`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error?.message || err?.message || 'No se pudo finalizar'
      );
    } finally {
      setFinishing(false);
    }
  };

  const reportDelay = async () => {
    if (!execution) return;
    const mins = parseInt(delayMinutes, 10);
    if (!Number.isFinite(mins) || mins <= 0) {
      Alert.alert('Error', 'Indica una cantidad de minutos válida');
      return;
    }
    try {
      const { data } = await api.patch(`/route-executions/${execution._id}`, {
        status: 'delayed',
        delayMinutes: mins,
      });
      if (!data?.success) throw new Error(data?.error?.message || 'No se pudo reportar');
      setExecution(data.data);
      setDelayModal(false);
      Alert.alert('Incidencia registrada', `Se reportó un retraso de ${mins} min.`);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error?.message || err?.message || 'No se pudo reportar'
      );
    }
  };

  // === RENDER ===

  if (loading) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>Cargando jornada...</Text>
      </View>
    );
  }

  if (execution) {
    const total = execution.route.waypoints?.length || 0;
    const visited = execution.waypointsVisited?.length || 0;
    const status = execution.status;

    return (
      <ScrollView
        style={s.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
      >
        <LinearGradient colors={['#065F46', '#10B981']} style={s.hero}>
          <View style={s.heroTopRow}>
            <View>
              <Text style={s.heroLabel}>JORNADA ACTIVA</Text>
              <Text style={s.heroRouteName} numberOfLines={1}>
                {execution.route.name}
              </Text>
              {execution.vehicle?.plate ? (
                <Text style={s.heroVehicle}>
                  <Feather name="truck" size={13} color="#A7F3D0" /> {execution.vehicle.plate}
                </Text>
              ) : null}
            </View>
            {status === 'delayed' ? (
              <View style={s.statusPill}>
                <Text style={s.statusPillText}>RETRASADA</Text>
              </View>
            ) : null}
          </View>

          <View style={s.timerBox}>
            <Text style={s.timerLabel}>TIEMPO ACTIVO</Text>
            <Text style={s.timerText}>{formatElapsed(elapsed)}</Text>
          </View>

          <View style={s.progressRow}>
            <View style={s.progressCell}>
              <Text style={s.progressNum}>{visited}</Text>
              <Text style={s.progressLabel}>Visitadas</Text>
            </View>
            <View style={s.divider} />
            <View style={s.progressCell}>
              <Text style={s.progressNum}>{total}</Text>
              <Text style={s.progressLabel}>Total paradas</Text>
            </View>
            <View style={s.divider} />
            <View style={s.progressCell}>
              <Text style={s.progressNum}>
                {total > 0 ? Math.round((visited / total) * 100) : 0}%
              </Text>
              <Text style={s.progressLabel}>Progreso</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={s.gpsCard}>
          <View style={s.gpsRow}>
            <Animated.View
              style={[
                s.gpsDot,
                {
                  backgroundColor: tracker.isTracking ? '#10B981' : '#EF4444',
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.gpsTitle}>
                {tracker.isTracking ? 'GPS activo' : 'GPS inactivo'}
              </Text>
              <Text style={s.gpsDesc}>
                {tracker.isTracking
                  ? `Enviando cada 10s${tracker.lastSentAt ? ` · ultimo envío hace ${Math.max(0, Math.round((Date.now() - tracker.lastSentAt) / 1000))}s` : ''}`
                  : 'Activa los permisos de ubicación para iniciar'}
              </Text>
              {tracker.lastAccuracy ? (
                <Text style={s.gpsAccuracy}>
                  Precisión: ±{Math.round(tracker.lastAccuracy)} m
                </Text>
              ) : null}
              {tracker.errorCount > 0 ? (
                <Text style={s.gpsError}>
                  Errores: {tracker.errorCount} {tracker.lastError ? `(${tracker.lastError})` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={s.mapBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(operator)/route')}
        >
          <Feather name="map" size={20} color="#10B981" />
          <Text style={s.mapBtnText}>Abrir mapa de la ruta</Text>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.dangerBtn}
          activeOpacity={0.85}
          onPress={() => setFinishModal(true)}
        >
          <Feather name="flag" size={20} color="#FFF" />
          <Text style={s.dangerBtnText}>Finalizar jornada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          activeOpacity={0.85}
          onPress={() => setDelayModal(true)}
        >
          <Feather name="alert-triangle" size={18} color="#F59E0B" />
          <Text style={s.secondaryBtnText}>Reportar incidencia / retraso</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />

        {/* Finish confirm modal */}
        <Modal visible={finishModal} transparent animationType="fade" onRequestClose={() => setFinishModal(false)}>
          <View style={s.modalBackdrop}>
            <View style={s.modalCard}>
              <Feather name="flag" size={32} color="#EF4444" style={{ alignSelf: 'center' }} />
              <Text style={s.modalTitle}>¿Finalizar jornada?</Text>
              <Text style={s.modalDesc}>
                Se cerrará la jornada y se detendrá el envío de GPS. No podrás reabrirla después.
              </Text>
              <View style={s.modalRow}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setFinishModal(false)}>
                  <Text style={s.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirm, finishing && { opacity: 0.6 }]}
                  onPress={finalizeJornada}
                  disabled={finishing}
                >
                  <Text style={s.modalConfirmText}>{finishing ? 'Cerrando...' : 'Sí, finalizar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delay modal */}
        <Modal visible={delayModal} transparent animationType="fade" onRequestClose={() => setDelayModal(false)}>
          <View style={s.modalBackdrop}>
            <View style={s.modalCard}>
              <Feather name="alert-triangle" size={32} color="#F59E0B" style={{ alignSelf: 'center' }} />
              <Text style={s.modalTitle}>Reportar retraso</Text>
              <Text style={s.modalDesc}>
                Indica cuántos minutos de retraso registrará el sistema para tu jornada.
              </Text>
              <TextInput
                style={s.input}
                value={delayMinutes}
                onChangeText={setDelayMinutes}
                keyboardType="numeric"
                placeholder="Minutos"
                placeholderTextColor="#64748B"
              />
              <View style={s.modalRow}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setDelayModal(false)}>
                  <Text style={s.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalConfirm, { backgroundColor: '#F59E0B' }]} onPress={reportDelay}>
                  <Text style={s.modalConfirmText}>Reportar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  // === No active execution: list of assigned routes ===
  const todays = routes.filter((r) => r.schedule?.dayOfWeek?.includes(todayDow));
  const others = routes.filter((r) => !r.schedule?.dayOfWeek?.includes(todayDow));

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
      }
    >
      <View style={s.startCard}>
        <View style={s.startIcon}>
          <Feather name="play-circle" size={32} color="#10B981" />
        </View>
        <Text style={s.startTitle}>Comenzar jornada</Text>
        <Text style={s.startDesc}>
          Selecciona la ruta asignada que vas a operar hoy. Se enviará tu ubicación
          en tiempo real durante el recorrido.
        </Text>
      </View>

      <Text style={s.sectionTitle}>Hoy ({todays.length})</Text>
      {todays.length === 0 ? (
        <View style={s.emptyBox}>
          <Feather name="calendar" size={28} color="#64748B" />
          <Text style={s.emptyText}>No tienes rutas programadas para hoy</Text>
        </View>
      ) : (
        todays.map((r) => <RouteCard key={r._id} route={r} primary onStart={() => startJornada(r)} />)
      )}

      {others.length > 0 ? (
        <>
          <Text style={s.sectionTitle}>Otras rutas asignadas</Text>
          {others.map((r) => (
            <RouteCard key={r._id} route={r} onStart={() => startJornada(r)} />
          ))}
        </>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function RouteCard({
  route,
  primary,
  onStart,
}: {
  route: Route;
  primary?: boolean;
  onStart: () => void;
}) {
  return (
    <View style={[s.routeCard, primary && s.routeCardPrimary]}>
      <View style={{ flex: 1 }}>
        <Text style={s.routeName}>{route.name}</Text>
        <View style={s.routeMetaRow}>
          {route.schedule?.startTime ? (
            <View style={s.metaPill}>
              <Feather name="clock" size={12} color="#94A3B8" />
              <Text style={s.metaText}> {route.schedule.startTime}</Text>
            </View>
          ) : null}
          {route.waypoints?.length ? (
            <View style={s.metaPill}>
              <Feather name="map-pin" size={12} color="#94A3B8" />
              <Text style={s.metaText}> {route.waypoints.length} paradas</Text>
            </View>
          ) : null}
          {route.vehicle?.plate ? (
            <View style={s.metaPill}>
              <Feather name="truck" size={12} color="#94A3B8" />
              <Text style={s.metaText}> {route.vehicle.plate}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={s.startBtn} activeOpacity={0.85} onPress={onStart}>
        <Text style={s.startBtnText}>Iniciar</Text>
        <Feather name="arrow-right" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  loadingText: { color: '#94A3B8' },

  hero: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: '#A7F3D0', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  heroRouteName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 4, marginBottom: 4 },
  heroVehicle: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
  statusPill: { backgroundColor: 'rgba(245,158,11,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusPillText: { color: '#1F2937', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  timerBox: {
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  timerLabel: { color: '#A7F3D0', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  timerText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },

  progressRow: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  progressCell: { flex: 1, alignItems: 'center' },
  progressNum: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  progressLabel: { color: '#A7F3D0', fontSize: 11, fontWeight: '600' },
  divider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  gpsCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center' },
  gpsDot: { width: 12, height: 12, borderRadius: 6 },
  gpsTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  gpsDesc: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  gpsAccuracy: { color: '#10B981', fontSize: 11, marginTop: 4, fontWeight: '600' },
  gpsError: { color: '#EF4444', fontSize: 11, marginTop: 4 },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mapBtnText: { flex: 1, marginLeft: 12, color: '#F8FAFC', fontSize: 15, fontWeight: '600' },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 18,
    paddingVertical: 18,
    marginTop: 12,
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  dangerBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginLeft: 10 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.35)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
  },
  secondaryBtnText: { color: '#F59E0B', fontSize: 14, fontWeight: '700', marginLeft: 8 },

  // No-execution screen
  startCard: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  startIcon: { marginBottom: 12 },
  startTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  startDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 19 },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: 'rgba(30,41,59,0.4)',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: '#94A3B8', fontSize: 13, marginTop: 8 },

  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  routeCardPrimary: { borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.08)' },
  routeName: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  routeMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  startBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, borderColor: '#334155', borderWidth: 1 },
  modalTitle: { color: '#F8FAFC', fontSize: 19, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  modalDesc: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelText: { color: '#F8FAFC', fontWeight: '700' },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '800' },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
    marginTop: 16,
  },
});

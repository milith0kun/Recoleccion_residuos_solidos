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
import { colors, radius, spacing } from '../../src/theme/tokens';
import {
  Badge,
  Card,
  EmptyState,
  LoadingScreen,
  PrimaryButton,
  SectionTitle,
} from '../../src/theme/ui';

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

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  const todayDow = new Date().getDay();

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

      await setActiveExecutionId(null);
      setExecution(null);

      const routesRes = await api.get('/routes', { params: { status: 'active' } });
      const all: any[] = routesRes.data.data || [];
      const mine = all.filter((r) => {
        const opId = typeof r.operator === 'string' ? r.operator : r.operator?._id;
        return opId === user?.id;
      });
      setRoutes(mine);
    } catch (e: unknown) {
      if (__DEV__) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[jornada] loadData failed', msg);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, setActiveExecutionId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const stored = await getActiveExecutionId();
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

  if (loading) {
    return <LoadingScreen label="Cargando jornada..." />;
  }

  if (execution) {
    const total = execution.route.waypoints?.length || 0;
    const visited = execution.waypointsVisited?.length || 0;
    const status = execution.status;
    const progress = total > 0 ? Math.round((visited / total) * 100) : 0;

    return (
      <ScrollView
        style={s.container}
        contentContainerStyle={s.contentPad}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <LinearGradient
          colors={['#047857', colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroLabel}>JORNADA ACTIVA</Text>
              <Text style={s.heroRouteName} numberOfLines={1}>
                {execution.route.name}
              </Text>
              {execution.vehicle?.plate ? (
                <View style={s.heroVehicleRow}>
                  <Feather name="truck" size={13} color="#A7F3D0" />
                  <Text style={s.heroVehicle}>{execution.vehicle.plate}</Text>
                </View>
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
              <Text style={s.progressLabel}>Total</Text>
            </View>
            <View style={s.divider} />
            <View style={s.progressCell}>
              <Text style={s.progressNum}>{progress}%</Text>
              <Text style={s.progressLabel}>Progreso</Text>
            </View>
          </View>

          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </LinearGradient>

        <Card style={s.gpsCard}>
          <View style={s.gpsRow}>
            <View style={s.gpsDotWrap}>
              {tracker.isTracking ? (
                <Animated.View
                  style={[
                    s.gpsRing,
                    {
                      backgroundColor: colors.primary,
                      transform: [{ scale: ringScale }],
                      opacity: ringOpacity,
                    },
                  ]}
                />
              ) : null}
              <Animated.View
                style={[
                  s.gpsDot,
                  {
                    backgroundColor: tracker.isTracking ? colors.primary : colors.danger,
                    transform: [{ scale: dotScale }],
                    opacity: dotOpacity,
                  },
                ]}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <Text style={s.gpsTitle}>
                {tracker.isTracking ? 'GPS activo' : 'GPS inactivo'}
              </Text>
              <Text style={s.gpsDesc}>
                {tracker.isTracking
                  ? `Enviando cada 10s${tracker.lastSentAt ? ` · último envío hace ${Math.max(0, Math.round((Date.now() - tracker.lastSentAt) / 1000))}s` : ''}`
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
        </Card>

        <TouchableOpacity
          style={s.mapBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(operator)/route')}
        >
          <View style={s.mapIconWrap}>
            <Feather name="map" size={18} color={colors.primary} />
          </View>
          <Text style={s.mapBtnText}>Abrir mapa de la ruta</Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <PrimaryButton
          label="Finalizar jornada"
          variant="danger"
          onPress={() => setFinishModal(true)}
          style={s.actionSpacing}
        />

        <TouchableOpacity
          style={s.warnBtn}
          activeOpacity={0.85}
          onPress={() => setDelayModal(true)}
        >
          <Feather name="alert-triangle" size={16} color={colors.warn} />
          <Text style={s.warnBtnText}>Reportar incidencia / retraso</Text>
        </TouchableOpacity>

        <Modal
          visible={finishModal}
          transparent
          animationType="fade"
          onRequestClose={() => setFinishModal(false)}
        >
          <View style={s.modalBackdrop}>
            <View style={s.modalCard}>
              <View style={[s.modalIconWrap, { backgroundColor: colors.dangerSoft }]}>
                <Feather name="flag" size={26} color={colors.danger} />
              </View>
              <Text style={s.modalTitle}>¿Finalizar jornada?</Text>
              <Text style={s.modalDesc}>
                Se cerrará la jornada y se detendrá el envío de GPS. No podrás reabrirla después.
              </Text>
              <View style={s.modalRow}>
                <PrimaryButton
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => setFinishModal(false)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label={finishing ? 'Cerrando...' : 'Sí, finalizar'}
                  variant="danger"
                  onPress={finalizeJornada}
                  loading={finishing}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={delayModal}
          transparent
          animationType="fade"
          onRequestClose={() => setDelayModal(false)}
        >
          <View style={s.modalBackdrop}>
            <View style={s.modalCard}>
              <View style={[s.modalIconWrap, { backgroundColor: colors.warnSoft }]}>
                <Feather name="alert-triangle" size={26} color={colors.warn} />
              </View>
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
                placeholderTextColor={colors.textFaint}
              />
              <View style={s.modalRow}>
                <PrimaryButton
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => setDelayModal(false)}
                  style={{ flex: 1 }}
                />
                <TouchableOpacity
                  style={s.warnConfirmBtn}
                  activeOpacity={0.85}
                  onPress={reportDelay}
                >
                  <Text style={s.warnConfirmText}>Reportar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  const todays = routes.filter((r) => r.schedule?.dayOfWeek?.includes(todayDow));
  const others = routes.filter((r) => !r.schedule?.dayOfWeek?.includes(todayDow));

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.contentPad}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Card style={s.startCard}>
        <View style={s.startIconWrap}>
          <Feather name="play-circle" size={28} color={colors.primary} />
        </View>
        <Text style={s.startTitle}>Comenzar jornada</Text>
        <Text style={s.startDesc}>
          Selecciona la ruta asignada que vas a operar hoy. Se enviará tu ubicación
          en tiempo real durante el recorrido.
        </Text>
      </Card>

      <SectionTitle trailing={<Badge label={String(todays.length)} tone="primary" />}>
        Hoy
      </SectionTitle>
      {todays.length === 0 ? (
        <EmptyState
          title="Sin rutas para hoy"
          description="No tienes rutas programadas para hoy."
        />
      ) : (
        todays.map((r) => (
          <RouteCard key={r._id} route={r} primary onStart={() => startJornada(r)} />
        ))
      )}

      {others.length > 0 ? (
        <>
          <SectionTitle trailing={<Badge label={String(others.length)} tone="muted" />}>
            Otras rutas asignadas
          </SectionTitle>
          {others.map((r) => (
            <RouteCard key={r._id} route={r} onStart={() => startJornada(r)} />
          ))}
        </>
      ) : null}

      <View style={{ height: spacing.xxxl }} />
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
      <View style={[s.routeAccent, primary && s.routeAccentPrimary]} />
      <View style={s.routeContent}>
        <Text style={s.routeName} numberOfLines={1}>
          {route.name}
        </Text>
        {route.zone?.district ? (
          <Text style={s.routeZone} numberOfLines={1}>
            {route.zone.district}
          </Text>
        ) : null}
        <View style={s.routeMetaRow}>
          {route.schedule?.startTime ? (
            <View style={s.metaPill}>
              <Feather name="clock" size={11} color={colors.textMuted} />
              <Text style={s.metaText}>{route.schedule.startTime}</Text>
            </View>
          ) : null}
          {route.waypoints?.length ? (
            <View style={s.metaPill}>
              <Feather name="map-pin" size={11} color={colors.textMuted} />
              <Text style={s.metaText}>{route.waypoints.length} paradas</Text>
            </View>
          ) : null}
          {route.vehicle?.plate ? (
            <View style={s.metaPill}>
              <Feather name="truck" size={11} color={colors.textMuted} />
              <Text style={s.metaText}>{route.vehicle.plate}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={s.startBtn} activeOpacity={0.85} onPress={onStart}>
        <Text style={s.startBtnText}>Iniciar</Text>
        <Feather name="arrow-right" size={14} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  contentPad: { padding: spacing.xl, paddingTop: spacing.xxl },

  hero: {
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroLabel: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroRouteName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  heroVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroVehicle: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: 'rgba(245,158,11,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusPillText: {
    color: '#1F2937',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  timerBox: {
    marginTop: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  timerLabel: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },

  progressRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  progressCell: { flex: 1, alignItems: 'center' },
  progressNum: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  progressLabel: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  progressBarTrack: {
    marginTop: spacing.md,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
  },

  gpsCard: {
    marginBottom: spacing.md,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsDotWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  gpsDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  gpsTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  gpsDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  gpsAccuracy: {
    color: colors.primary,
    fontSize: 11,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  gpsError: {
    color: colors.danger,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  mapIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtnText: {
    flex: 1,
    marginLeft: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },

  actionSpacing: { marginTop: spacing.md },

  warnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warnSoft,
    borderColor: 'rgba(245,158,11,0.35)',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  warnBtnText: {
    color: colors.warn,
    fontSize: 14,
    fontWeight: '700',
  },

  warnConfirmBtn: {
    flex: 1,
    backgroundColor: colors.warn,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  startCard: {
    marginBottom: spacing.lg,
  },
  startIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  startTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.xs + 2,
    letterSpacing: -0.3,
  },
  startDesc: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },

  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  routeCardPrimary: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  routeAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.borderSoft,
  },
  routeAccentPrimary: {
    backgroundColor: colors.primary,
  },
  routeContent: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  routeName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  routeZone: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  routeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgOverlay,
    borderColor: colors.borderSoft,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.md,
    gap: spacing.xs + 2,
    marginRight: spacing.md,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: -0.3,
  },
  modalDesc: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  modalRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    marginTop: spacing.lg,
    fontVariant: ['tabular-nums'],
  },
});

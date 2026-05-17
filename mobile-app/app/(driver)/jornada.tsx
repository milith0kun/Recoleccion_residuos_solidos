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
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { useGpsTracker } from '../../src/hooks/useGpsTracker';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import {
  Badge,
  Card,
  EmptyState,
  LoadingScreen,
  PrimaryButton,
  SectionTitle,
} from '../../src/theme/ui';
import { AppHeader } from '../../src/components/layout/AppShell';

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
  const sec = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.0] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

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
      Alert.alert('Error', 'Indicá una cantidad de minutos válida');
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
      <View style={s.container}>
      <AppHeader title="Jornada activa" section="Operador" />
      <ScrollView
        contentContainerStyle={s.contentPad}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={s.hero}>
          <View style={s.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroLabel}>Jornada activa</Text>
              <Text style={s.heroRouteName} numberOfLines={1}>
                {execution.route.name}
              </Text>
              {execution.vehicle?.plate ? (
                <View style={s.heroVehicleRow}>
                  <Feather name="truck" size={13} color={colors.primaryDark} />
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
            <Text style={s.timerLabel}>Tiempo activo</Text>
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
        </View>

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
                  ? `Enviando cada 10s${
                      tracker.lastSentAt
                        ? ` · último envío hace ${Math.max(
                            0,
                            Math.round((Date.now() - tracker.lastSentAt) / 1000)
                          )}s`
                        : ''
                    }`
                  : 'Activá los permisos de ubicación para iniciar'}
              </Text>
              {tracker.lastAccuracy ? (
                <Text style={s.gpsAccuracy}>Precisión: ±{Math.round(tracker.lastAccuracy)} m</Text>
              ) : null}
              {tracker.errorCount > 0 ? (
                <Text style={s.gpsError}>
                  Errores: {tracker.errorCount}
                  {tracker.lastError ? ` (${tracker.lastError})` : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <TouchableOpacity
          style={s.mapBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(driver)/route')}
        >
          <View style={s.mapIconWrap}>
            <Feather name="map" size={16} color={colors.primary} />
          </View>
          <Text style={s.mapBtnText}>Abrir mapa de la ruta</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
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
          <Feather name="alert-triangle" size={14} color={colors.warn} />
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
                <Feather name="flag" size={22} color={colors.danger} />
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
                <Feather name="alert-triangle" size={22} color={colors.warn} />
              </View>
              <Text style={s.modalTitle}>Reportar retraso</Text>
              <Text style={s.modalDesc}>
                Indicá cuántos minutos de retraso registrará el sistema para tu jornada.
              </Text>
              <TextInput
                style={s.input}
                value={delayMinutes}
                onChangeText={setDelayMinutes}
                keyboardType="numeric"
                placeholder="Minutos"
                placeholderTextColor={colors.textPlaceholder}
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
      </View>
    );
  }

  const todays = routes.filter((r) => r.schedule?.dayOfWeek?.includes(todayDow));
  const others = routes.filter((r) => !r.schedule?.dayOfWeek?.includes(todayDow));

  return (
    <View style={s.container}>
    <AppHeader title="Inicio" section="Operador" />
    <ScrollView
      contentContainerStyle={s.contentPad}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Card style={s.startCard} tone="accent">
        <View style={s.startIconWrap}>
          <Feather name="play-circle" size={22} color={colors.primary} />
        </View>
        <Text style={s.startTitle}>Comenzar jornada</Text>
        <Text style={s.startDesc}>
          Seleccioná la ruta asignada que vas a operar hoy. Se enviará tu ubicación en tiempo real
          durante el recorrido.
        </Text>
      </Card>

      <SectionTitle trailing={<Badge label={String(todays.length)} tone="primary" />}>
        Hoy
      </SectionTitle>
      {todays.length === 0 ? (
        <EmptyState
          title="Sin rutas para hoy"
          description="No tenés rutas programadas para hoy."
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
    </View>
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
              <Feather name="clock" size={10} color={colors.textSecondary} />
              <Text style={s.metaText}>{route.schedule.startTime}</Text>
            </View>
          ) : null}
          {route.waypoints?.length ? (
            <View style={s.metaPill}>
              <Feather name="map-pin" size={10} color={colors.textSecondary} />
              <Text style={s.metaText}>{route.waypoints.length} paradas</Text>
            </View>
          ) : null}
          {route.vehicle?.plate ? (
            <View style={s.metaPill}>
              <Feather name="truck" size={10} color={colors.textSecondary} />
              <Text style={s.metaText}>{route.vehicle.plate}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={s.startBtn} activeOpacity={0.85} onPress={onStart}>
        <Text style={s.startBtnText}>Iniciar</Text>
        <Feather name="arrow-right" size={13} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  contentPad: { padding: spacing.lg, paddingTop: spacing.xl },

  hero: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroLabel: {
    fontFamily: fontFamily.sansBold,
    color: colors.primary,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroRouteName: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  heroVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroVehicle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.primaryDark,
    fontSize: 12.5,
  },
  statusPill: {
    backgroundColor: colors.warnSoft,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontFamily: fontFamily.sansBold,
    color: colors.warn,
    fontSize: 9.5,
    letterSpacing: 0.8,
  },

  timerBox: {
    marginTop: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  timerLabel: {
    fontFamily: fontFamily.sansBold,
    color: colors.primaryDark,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  timerText: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 38,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 4,
  },

  progressRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  progressCell: { flex: 1, alignItems: 'center' },
  progressNum: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  progressLabel: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSoft,
  },

  progressBarTrack: {
    marginTop: spacing.md,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  gpsDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  gpsTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14.5,
  },
  gpsDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  gpsAccuracy: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.primary,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  gpsError: {
    fontFamily: fontFamily.sansMedium,
    color: colors.danger,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  mapIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtnText: {
    flex: 1,
    marginLeft: spacing.md,
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14,
  },

  actionSpacing: { marginTop: spacing.sm },

  warnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warnSoft,
    borderColor: colors.warnBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  warnBtnText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.warn,
    fontSize: 13,
  },

  warnConfirmBtn: {
    flex: 1,
    backgroundColor: colors.warn,
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnConfirmText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },

  startCard: {
    marginBottom: spacing.md,
  },
  startIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  startTitle: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  startDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  routeCardPrimary: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  routeAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.borderSoft,
  },
  routeAccentPrimary: {
    backgroundColor: colors.primary,
  },
  routeContent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  routeName: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14.5,
    marginBottom: 2,
  },
  routeZone: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  routeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 1,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  metaText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    gap: spacing.xs + 1,
    marginRight: spacing.md,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,30,43,0.55)',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  modalTitle: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 19,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.md,
    letterSpacing: -0.3,
  },
  modalDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 19,
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
    color: colors.ink,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 15,
    marginTop: spacing.lg,
  },
});

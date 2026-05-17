import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  ScrollView,
  Easing,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { getZoneId } from '../../src/utils/zone';
import { AppHeader } from '../../src/components/layout/AppShell';

type RouteStatus = 'active' | 'completed' | 'pending' | 'planned' | 'cancelled' | 'inactive';

interface RouteData {
  _id: string;
  name?: string;
  status?: RouteStatus;
  path?: { type?: string; coordinates?: [number, number][] };
  waypoints?: Array<{
    order: number;
    name?: string;
    estimatedArrival?: string;
    location: { coordinates: [number, number] };
  }>;
  zone?: { _id: string; name?: string; color?: string } | string;
}

interface ActiveExecution {
  executionId: string;
  routeId: string;
  routeName: string;
  operatorName: string;
  vehicle: { plate: string; type?: string };
  lastLocation: { lng: number; lat: number; timestamp: string; speed?: number } | null;
  lastSeenAt: string | null;
  isStale: boolean;
}

type FilterKey = 'active' | 'completed' | 'pending';

const FILTER_META: Record<FilterKey, { label: string; color: string }> = {
  active: { label: 'Activas', color: colors.primary },
  completed: { label: 'Completadas', color: colors.info },
  pending: { label: 'Pendientes', color: colors.textSecondary },
};

function minutesAgo(iso: string | null): string {
  if (!iso) return 'sin datos';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'sin datos';
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s atrás`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min atrás`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} h atrás`;
}

function PulsingTruckMarker({ stale }: { stale: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const color = stale ? colors.warn : colors.primary;

  return (
    <View style={mStyles.wrap}>
      <Animated.View
        style={[mStyles.halo, { backgroundColor: color, opacity, transform: [{ scale }] }]}
      />
      <View style={[mStyles.core, { borderColor: color }]} />
    </View>
  );
}

const mStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36 },
  halo: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
  core: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
});

export default function MapScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [executions, setExecutions] = useState<ActiveExecution[]>([]);
  const [trail, setTrail] = useState<{
    executionId: string;
    points: { latitude: number; longitude: number }[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    active: true,
    completed: false,
    pending: false,
  });
  const [selectedExecution, setSelectedExecution] = useState<ActiveExecution | null>(null);
  const mapRef = useRef<MapView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRoutes = async () => {
    try {
      const params: Record<string, string> = {};
      const zoneId = getZoneId(user?.zone);
      if (zoneId) params.zone = zoneId;
      const { data } = await api.get('/routes', { params });
      setRoutes((data?.data || []) as RouteData[]);
    } catch (e) {
      if (__DEV__) console.warn('[map] /routes failed', e);
    }
  };

  const loadActive = async () => {
    try {
      const { data } = await api.get('/gps/active');
      setExecutions((data?.data || []) as ActiveExecution[]);
    } catch (e) {
      if (__DEV__) console.warn('[map] /gps/active failed', e);
      setExecutions([]);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          if (mounted) setLocation(loc);
        } else {
          if (mounted) setErrorMsg('Permiso de ubicación denegado');
        }
      } catch (e) {
        if (__DEV__) console.warn('[map] location request failed', e);
      }

      await Promise.all([loadRoutes(), loadActive()]);
      if (mounted) setLoading(false);
    })();

    intervalRef.current = setInterval(() => {
      loadActive();
    }, 5000);

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.zone]);

  const onTrackExecution = async (exec: ActiveExecution) => {
    setSelectedExecution(exec);
    try {
      const { data } = await api.get('/gps/track', {
        params: { routeExecution: exec.executionId },
      });
      const raw = (data?.data || []) as Array<{
        location?: { coordinates?: [number, number] };
        lat?: number;
        lng?: number;
      }>;
      const points = raw
        .map((p) => {
          if (p.location?.coordinates && p.location.coordinates.length >= 2) {
            return {
              latitude: p.location.coordinates[1],
              longitude: p.location.coordinates[0],
            };
          }
          if (typeof p.lat === 'number' && typeof p.lng === 'number') {
            return { latitude: p.lat, longitude: p.lng };
          }
          return null;
        })
        .filter((p): p is { latitude: number; longitude: number } => p !== null)
        .slice(-20);
      setTrail({ executionId: exec.executionId, points });

      if (exec.lastLocation && mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: exec.lastLocation.lat,
          longitude: exec.lastLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (e) {
      if (__DEV__) console.warn('[map] /gps/track failed', e);
    }
  };

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadRoutes(), loadActive()]);
  };

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const status = (r.status || 'pending') as RouteStatus;
      if (status === 'active') return filters.active;
      if (status === 'completed') return filters.completed;
      if (status === 'pending' || status === 'planned' || status === 'inactive')
        return filters.pending;
      return false;
    });
  }, [routes, filters]);

  const polylineStyleFor = (status: RouteStatus | undefined) => {
    if (status === 'active') {
      return { color: colors.primary, width: 5, dash: undefined as number[] | undefined };
    }
    if (status === 'completed') {
      return { color: 'rgba(30,81,128,0.55)', width: 3, dash: [8, 8] as number[] | undefined };
    }
    return { color: 'rgba(92,108,117,0.35)', width: 2, dash: [2, 6] as number[] | undefined };
  };

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Cargando mapa y rutas...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={s.loadingBox}>
        <Text style={s.errorTitle}>Sin acceso a tu ubicación</Text>
        <Text style={s.loadingText}>{errorMsg}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={handleRefresh} activeOpacity={0.85}>
          <Text style={s.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeTrucks = executions.length;

  return (
    <View style={s.container}>
      <AppHeader title="Mapa en vivo" section="Ciudadano" />
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={{
          latitude: location?.coords.latitude || -13.52264,
          longitude: location?.coords.longitude || -71.96734,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {filteredRoutes.map((r) => {
          const coords = r.path?.coordinates;
          if (!coords || coords.length === 0) return null;
          const style = polylineStyleFor(r.status);
          return (
            <Polyline
              key={r._id}
              coordinates={coords.map((c) => ({ latitude: c[1], longitude: c[0] }))}
              strokeColor={style.color}
              strokeWidth={style.width}
              lineDashPattern={style.dash}
            />
          );
        })}

        {filteredRoutes.flatMap((r) =>
          (r.waypoints || []).map((wp) => (
            <Marker
              key={`${r._id}-${wp.order}`}
              coordinate={{
                latitude: wp.location.coordinates[1],
                longitude: wp.location.coordinates[0],
              }}
              title={wp.name || `Punto ${wp.order}`}
              description={
                wp.estimatedArrival ? `Llegada estimada: ${wp.estimatedArrival}` : undefined
              }
              pinColor={colors.info}
            />
          ))
        )}

        {trail && trail.points.length > 1 && (
          <Polyline coordinates={trail.points} strokeColor="rgba(0,104,74,0.55)" strokeWidth={3} />
        )}

        {executions.map((exec) =>
          exec.lastLocation ? (
            <Marker
              key={exec.executionId}
              coordinate={{ latitude: exec.lastLocation.lat, longitude: exec.lastLocation.lng }}
              onPress={() => onTrackExecution(exec)}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <PulsingTruckMarker stale={exec.isStale} />
            </Marker>
          ) : null
        )}
      </MapView>

      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View
              style={[
                s.statusDot,
                { backgroundColor: activeTrucks > 0 ? colors.primary : colors.textMuted },
              ]}
            />
            <Text style={s.cardTitle}>
              {activeTrucks > 0
                ? `${activeTrucks} camión${activeTrucks === 1 ? '' : 'es'} en tu zona`
                : 'Sin recolección activa'}
            </Text>
          </View>
          <Text style={s.cardDesc}>
            {activeTrucks > 0
              ? 'Tocá un camión para ver detalles y rastreo en vivo.'
              : 'Te avisaremos cuando un camión esté en ruta.'}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filtersRow}
          >
            {(Object.keys(FILTER_META) as FilterKey[]).map((key) => {
              const meta = FILTER_META[key];
              const active = filters[key];
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleFilter(key)}
                  activeOpacity={0.8}
                  style={[
                    s.filterChip,
                    active && {
                      borderColor: `${meta.color}80`,
                      backgroundColor: `${meta.color}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.filterChipText,
                      { color: active ? meta.color : colors.textSecondary },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {selectedExecution && (
        <View style={s.tooltipWrap}>
          <View style={s.tooltip}>
            <View style={s.tooltipHeader}>
              <Text style={s.tooltipTitle}>{selectedExecution.routeName}</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedExecution(null);
                  setTrail(null);
                }}
                hitSlop={8}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.tooltipLine}>Operador: {selectedExecution.operatorName}</Text>
            <Text style={s.tooltipLine}>
              Vehículo: {selectedExecution.vehicle.plate}
              {selectedExecution.vehicle.type ? ` · ${selectedExecution.vehicle.type}` : ''}
            </Text>
            <Text style={s.tooltipLine}>
              Última señal: {minutesAgo(selectedExecution.lastSeenAt)}
              {selectedExecution.isStale ? ' (sin actualizar)' : ''}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={s.fab} onPress={centerOnUser} activeOpacity={0.85}>
        <Feather name="crosshair" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity style={s.fabSecondary} onPress={handleRefresh} activeOpacity={0.85}>
        <Feather name="refresh-cw" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
    padding: spacing.xl,
  },
  loadingText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: 13,
    textAlign: 'center',
  },
  errorTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 15,
    marginBottom: 4,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
  },

  overlay: { position: 'absolute', top: 110, left: 16, right: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 4.5, marginRight: spacing.md },
  cardTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14,
    flex: 1,
  },
  cardDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  filtersRow: { gap: spacing.xs, paddingRight: spacing.sm },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  filterChipText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
  },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  fabSecondary: {
    position: 'absolute',
    bottom: 82,
    right: 24,
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },

  tooltipWrap: { position: 'absolute', bottom: 100, left: 16, right: 80 },
  tooltip: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tooltipTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 13.5,
    flex: 1,
  },
  tooltipLine: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { getZoneId } from '../../src/utils/zone';
import { AppHeader } from '../../src/components/layout/AppShell';
import { OSMMap, type MapMarker, type MapPolyline, type OSMMapRef } from '../../src/components/OSMMap';

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

const CUSCO_CENTER = { lat: -13.52264, lng: -71.96734 };

export default function MapScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [executions, setExecutions] = useState<ActiveExecution[]>([]);
  const [trail, setTrail] = useState<{
    executionId: string;
    points: [number, number][];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    active: true,
    completed: false,
    pending: false,
  });
  const [selectedExecution, setSelectedExecution] = useState<ActiveExecution | null>(null);
  const mapRef = useRef<OSMMapRef>(null);
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
    intervalRef.current = setInterval(() => loadActive(), 5000);
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.zone]);

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

  const polylines = useMemo<MapPolyline[]>(() => {
    const items: MapPolyline[] = [];
    filteredRoutes.forEach((r) => {
      const coords = r.path?.coordinates;
      if (!coords || coords.length === 0) return;
      const status = (r.status || 'pending') as RouteStatus;
      const color =
        status === 'active'
          ? colors.primary
          : status === 'completed'
          ? '#1E5180'
          : '#5C6C75';
      items.push({
        id: r._id,
        points: coords.map((c) => [c[1], c[0]]),
        color,
        width: status === 'active' ? 5 : 3,
        dashed: status !== 'active',
      });
    });
    if (trail && trail.points.length > 1) {
      items.push({
        id: 'trail-' + trail.executionId,
        points: trail.points,
        color: 'rgba(0,104,74,0.55)',
        width: 3,
      });
    }
    return items;
  }, [filteredRoutes, trail]);

  const markers = useMemo<MapMarker[]>(() => {
    const items: MapMarker[] = [];
    filteredRoutes.forEach((r) => {
      (r.waypoints || []).forEach((wp) => {
        items.push({
          id: `wp-${r._id}-${wp.order}`,
          lat: wp.location.coordinates[1],
          lng: wp.location.coordinates[0],
          color: '#1E5180',
          label: String(wp.order),
          popup: wp.name || `Punto ${wp.order}`,
        });
      });
    });
    executions.forEach((exec) => {
      if (!exec.lastLocation) return;
      items.push({
        id: `exec-${exec.executionId}`,
        lat: exec.lastLocation.lat,
        lng: exec.lastLocation.lng,
        color: exec.isStale ? colors.warn : colors.primary,
        variant: 'pulse',
      });
    });
    return items;
  }, [filteredRoutes, executions]);

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
        .map((p): [number, number] | null => {
          if (p.location?.coordinates && p.location.coordinates.length >= 2) {
            return [p.location.coordinates[1], p.location.coordinates[0]];
          }
          if (typeof p.lat === 'number' && typeof p.lng === 'number') {
            return [p.lat, p.lng];
          }
          return null;
        })
        .filter((p): p is [number, number] => p !== null)
        .slice(-20);
      setTrail({ executionId: exec.executionId, points });
      if (exec.lastLocation && mapRef.current) {
        mapRef.current.animateTo(exec.lastLocation.lat, exec.lastLocation.lng, 16);
      }
    } catch (e) {
      if (__DEV__) console.warn('[map] /gps/track failed', e);
    }
  };

  const handleMarkerPress = (id: string) => {
    if (id.startsWith('exec-')) {
      const execId = id.replace('exec-', '');
      const exec = executions.find((e) => e.executionId === execId);
      if (exec) onTrackExecution(exec);
    }
  };

  const centerOnUser = () => {
    if (location && mapRef.current) {
      mapRef.current.animateTo(location.coords.latitude, location.coords.longitude, 16);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadRoutes(), loadActive()]);
  };

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <View style={s.container}>
        <AppHeader title="Mapa en vivo" section="Ciudadano" />
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Cargando mapa y rutas...</Text>
        </View>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={s.container}>
        <AppHeader title="Mapa en vivo" section="Ciudadano" />
        <View style={s.loadingBox}>
          <Text style={s.errorTitle}>Sin acceso a tu ubicación</Text>
          <Text style={s.loadingText}>{errorMsg}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={handleRefresh} activeOpacity={0.85}>
            <Text style={s.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeTrucks = executions.length;
  const userLoc = location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null;

  return (
    <View style={s.container}>
      <AppHeader title="Mapa en vivo" section="Ciudadano" />

      <OSMMap
        ref={mapRef}
        center={userLoc ?? CUSCO_CENTER}
        zoom={14}
        markers={markers}
        polylines={polylines}
        showUserLocation
        userLocation={userLoc}
        onMarkerPress={handleMarkerPress}
        style={s.map}
      />

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

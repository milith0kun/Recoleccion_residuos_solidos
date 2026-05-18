import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { getZoneId } from '../../src/utils/zone';
import { AppHeader } from '../../src/components/layout/AppShell';
import { OSMMap, type MapMarker, type MapPolyline, type OSMMapRef } from '../../src/components/OSMMap';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

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
  zone: { _id: string; name?: string; color?: string } | null;
  inMyZone: boolean;
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
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [executions, setExecutions] = useState<ActiveExecution[]>([]);
  // routeId -> array de [lng,lat] de la traza oficial vigente
  const [officialTraces, setOfficialTraces] = useState<Record<string, [number, number][]>>({});
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
  const [confirming, setConfirming] = useState(false);
  // Toggle: si el ciudadano quiere ver SOLO los camiones de su zona
  // (default false → ve todos los activos de la ciudad).
  const [onlyMyZone, setOnlyMyZone] = useState(false);
  const mapRef = useRef<OSMMapRef>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRoutes = async () => {
    try {
      const params: Record<string, string> = {};
      const zoneId = getZoneId(user?.zone);
      if (zoneId) params.zone = zoneId;
      const { data } = await api.get('/routes', { params });
      const list = (data?.data || []) as RouteData[];
      setRoutes(list);
      // Cargar trazas oficiales de cada ruta en paralelo. Si una ruta no tiene
      // traza oficial aún (404), no rompemos: simplemente no la mapeamos y se
      // pinta la programada como fallback.
      const entries = await Promise.all(
        list.map(async (r) => {
          try {
            const { data: t } = await api.get(`/routes/${r._id}/traces/official`);
            const coords = t?.data?.points?.coordinates as [number, number][] | undefined;
            if (!coords || coords.length < 2) return null;
            return [r._id, coords] as [string, [number, number][]];
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, [number, number][]> = {};
      for (const e of entries) {
        if (e) map[e[0]] = e[1];
      }
      setOfficialTraces(map);
    } catch (e) {
      if (__DEV__) console.warn('[map] /routes failed', e);
    }
  };

  const loadActive = async () => {
    try {
      const { data } = await api.get('/gps/active');
      // El backend puede devolver el array directo o envuelto en { data: [...] }
      // (versión vieja). Aceptamos ambas para no romper si el redeploy tarda.
      const payload = data?.data;
      const list: ActiveExecution[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setExecutions(list);
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
      const status = (r.status || 'pending') as RouteStatus;
      const official = officialTraces[r._id];

      if (official && official.length > 1) {
        // Traza oficial: el recorrido REAL que los conductores ya hicieron.
        // Verde sólido sin dash — esto es la realidad observada, no la planificación.
        items.push({
          id: `trace-${r._id}`,
          points: official.map((c) => [c[1], c[0]]),
          color: status === 'active' ? colors.primary : '#00684A',
          width: status === 'active' ? 5 : 4,
          dashed: false,
        });
        return;
      }

      // Sin traza oficial todavía → pintamos la ruta programada como referencia.
      const coords = r.path?.coordinates;
      if (!coords || coords.length === 0) return;
      items.push({
        id: r._id,
        points: coords.map((c) => [c[1], c[0]]),
        color: '#94A3B8',
        width: 3,
        dashed: true,
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
  }, [filteredRoutes, officialTraces, trail]);

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
    const visibleExecutions = onlyMyZone
      ? executions.filter((e) => e.inMyZone)
      : executions;
    visibleExecutions.forEach((exec) => {
      if (!exec.lastLocation) return;
      // Verde brillante para camiones de mi zona, gris-azul para los
      // de otras zonas, ámbar si están sin señal hace rato.
      const color = exec.isStale
        ? colors.warn
        : exec.inMyZone
          ? colors.primary
          : '#5C6C75';
      items.push({
        id: `exec-${exec.executionId}`,
        lat: exec.lastLocation.lat,
        lng: exec.lastLocation.lng,
        color,
        variant: 'pulse',
      });
    });
    return items;
  }, [filteredRoutes, executions, onlyMyZone]);

  const onTrackExecution = async (exec: ActiveExecution) => {
    setSelectedExecution(exec);
    try {
      const { data } = await api.get('/gps/track', {
        params: { routeExecution: exec.executionId },
      });
      // /gps/track devuelve { data: { points: [...] } } — leemos points.
      const payload = data?.data;
      const raw = (Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.points)
          ? payload.points
          : []) as Array<{
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

  const confirmTruckHere = async () => {
    if (confirming) return;
    // El ciudadano confirma sobre la execution que esté inspeccionando, y si
    // no eligió ninguna, sobre la primera activa.
    const target = selectedExecution ?? executions[0];
    if (!target) return;

    let lng: number;
    let lat: number;
    try {
      // Reintentamos pedir la ubicación actual para asegurar precisión al
      // momento de marcar (no la que cacheamos al abrir la pantalla).
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      lng = loc.coords.longitude;
      lat = loc.coords.latitude;
    } catch {
      if (location) {
        lng = location.coords.longitude;
        lat = location.coords.latitude;
      } else {
        Alert.alert('Sin ubicación', 'No pudimos obtener tu ubicación actual.');
        return;
      }
    }

    setConfirming(true);
    try {
      await api.post('/confirmations', {
        routeId: target.routeId,
        lng,
        lat,
      });
      Alert.alert(
        '¡Gracias!',
        `Registraste el paso de ${target.routeName} en tu zona. Nos ayuda a mostrar la ruta real al resto del barrio.`,
      );
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const message =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ?? 'No se pudo registrar tu confirmación.';
      if (status === 409) {
        Alert.alert('Ya confirmaste hoy', 'Sólo se puede confirmar una vez por ruta y día.');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setConfirming(false);
    }
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

  const trucksInMyZone = executions.filter((e) => e.inMyZone).length;
  const totalActiveTrucks = executions.length;
  const visibleCount = onlyMyZone ? trucksInMyZone : totalActiveTrucks;
  const hasZone = Boolean(getZoneId(user?.zone));
  const userLoc = location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null;

  return (
    <View style={s.container}>
      <AppHeader title="Mapa en vivo" section="Ciudadano" />

      <ErrorBoundary label="El mapa no pudo cargar">
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
      </ErrorBoundary>

      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View
              style={[
                s.statusDot,
                { backgroundColor: visibleCount > 0 ? colors.primary : colors.textMuted },
              ]}
            />
            <Text style={s.cardTitle}>
              {visibleCount > 0
                ? `${visibleCount} camión${visibleCount === 1 ? '' : 'es'} ${
                    onlyMyZone ? 'en tu zona' : 'operando en Cusco'
                  }`
                : onlyMyZone
                  ? 'Sin camiones en tu zona ahora'
                  : 'Sin recolección activa'}
            </Text>
          </View>
          <Text style={s.cardDesc}>
            {visibleCount > 0
              ? hasZone && !onlyMyZone && trucksInMyZone > 0
                ? `${trucksInMyZone} en tu zona (verde). Tocá un camión para detalles.`
                : 'Tocá un camión para ver detalles y rastreo en vivo.'
              : onlyMyZone && totalActiveTrucks > 0
                ? `Hay ${totalActiveTrucks} en otras zonas. Desactivá "Sólo mi zona" para verlos.`
                : 'Te avisaremos cuando un camión esté en ruta.'}
          </Text>

          {hasZone ? (
            <TouchableOpacity
              onPress={() => setOnlyMyZone((v) => !v)}
              activeOpacity={0.8}
              style={[s.zoneFilterChip, onlyMyZone && s.zoneFilterChipActive]}
            >
              <Feather
                name={onlyMyZone ? 'check-square' : 'square'}
                size={13}
                color={onlyMyZone ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  s.zoneFilterText,
                  { color: onlyMyZone ? colors.primary : colors.textSecondary },
                ]}
              >
                Sólo mi zona
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/profile-edit' as never)}
              activeOpacity={0.8}
              style={s.assignZoneBanner}
            >
              <Feather name="map-pin" size={13} color={colors.warn} />
              <Text style={s.assignZoneText}>
                Asigná tu zona para identificar tus camiones
              </Text>
              <Feather name="chevron-right" size={14} color={colors.warn} />
            </TouchableOpacity>
          )}
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

      {totalActiveTrucks > 0 && (
        <TouchableOpacity
          style={s.confirmBtn}
          onPress={confirmTruckHere}
          activeOpacity={0.85}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="check-circle" size={15} color="#FFFFFF" />
              <Text style={s.confirmBtnText}>Vi el camión acá</Text>
            </>
          )}
        </TouchableOpacity>
      )}
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

  zoneFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  zoneFilterChipActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  zoneFilterText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11.5,
  },
  assignZoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    backgroundColor: colors.warnSoft,
    marginTop: spacing.sm,
  },
  assignZoneText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11.5,
    color: colors.warn,
    flex: 1,
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

  confirmBtn: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    minWidth: 168,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
});

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
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RouteStatus = 'active' | 'completed' | 'pending' | 'planned' | 'cancelled' | 'inactive';

interface RouteData {
  _id: string;
  name?: string;
  status?: RouteStatus;
  path?: { type?: string; coordinates?: [number, number][] };
  waypoints?: Array<{ order: number; name?: string; estimatedArrival?: string; location: { coordinates: [number, number] } }>;
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
  active: { label: 'Activas', color: '#10B981' },
  completed: { label: 'Completadas', color: '#3B82F6' },
  pending: { label: 'Pendientes', color: '#94A3B8' },
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

interface PulsingMarkerProps {
  stale: boolean;
}

function PulsingTruckMarker({ stale }: PulsingMarkerProps) {
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
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
  const color = stale ? '#F59E0B' : '#10B981';

  return (
    <View style={mStyles.wrap}>
      <Animated.View
        style={[
          mStyles.halo,
          { backgroundColor: color, opacity, transform: [{ scale }] },
        ]}
      />
      <View style={[mStyles.core, { borderColor: color, backgroundColor: '#0F172A' }]}>
        <Feather name="truck" size={14} color={color} />
      </View>
    </View>
  );
}

const mStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44 },
  halo: { position: 'absolute', width: 24, height: 24, borderRadius: 12 },
  core: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
});

export default function MapScreen() {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [executions, setExecutions] = useState<ActiveExecution[]>([]);
  const [trail, setTrail] = useState<{ executionId: string; points: { latitude: number; longitude: number }[] } | null>(null);
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
      if (user?.zone) params.zone = user.zone;
      const { data } = await api.get('/routes', { params });
      setRoutes((data?.data || []) as RouteData[]);
    } catch (e) {
      console.error('routes error', e);
    }
  };

  const loadActive = async () => {
    try {
      const { data } = await api.get('/gps/active');
      setExecutions((data?.data || []) as ActiveExecution[]);
    } catch (e) {
      // Silent; show empty state
      console.error('gps/active error', e);
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
        console.error(e);
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
      const { data } = await api.get('/gps/track', { params: { routeExecution: exec.executionId } });
      const raw = (data?.data || []) as Array<{ location?: { coordinates?: [number, number] }; lat?: number; lng?: number }>;
      const points = raw
        .map((p) => {
          if (p.location?.coordinates && p.location.coordinates.length >= 2) {
            return { latitude: p.location.coordinates[1], longitude: p.location.coordinates[0] };
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
      console.error('gps/track error', e);
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
      if (status === 'pending' || status === 'planned' || status === 'inactive') return filters.pending;
      return false;
    });
  }, [routes, filters]);

  const polylineStyleFor = (status: RouteStatus | undefined): { color: string; width: number; dash: number[] | undefined } => {
    if (status === 'active') {
      return { color: 'rgba(16,185,129,1)', width: 5, dash: undefined };
    }
    if (status === 'completed') {
      return { color: 'rgba(59,130,246,0.5)', width: 3, dash: [8, 8] };
    }
    return { color: 'rgba(148,163,184,0.4)', width: 2, dash: [2, 6] };
  };

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <View style={s.skeletonShimmer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={s.loadingText}>Cargando mapa y rutas...</Text>
        </View>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={s.loadingBox}>
        <Feather name="alert-triangle" size={48} color="#EF4444" />
        <Text style={s.loadingText}>{errorMsg}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={handleRefresh}>
          <Text style={s.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeTrucks = executions.length;

  return (
    <View style={s.container}>
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
        customMapStyle={mapStyle}
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
              description={wp.estimatedArrival ? `Llegada estimada: ${wp.estimatedArrival}` : undefined}
              pinColor="#3B82F6"
            />
          ))
        )}

        {trail && trail.points.length > 1 && (
          <Polyline
            coordinates={trail.points}
            strokeColor="rgba(16,185,129,0.55)"
            strokeWidth={3}
          />
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
        <LinearGradient
          colors={['rgba(30,41,59,0.95)', 'rgba(15,23,42,0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.card}
        >
          <View style={s.cardHeader}>
            <View style={s.statusDotWrap}>
              <View style={[s.statusDot, { backgroundColor: activeTrucks > 0 ? '#10B981' : '#64748B' }]} />
              {activeTrucks > 0 && <View style={[s.statusDotPulse, { borderColor: '#10B981' }]} />}
            </View>
            <Text style={s.cardTitle}>
              {activeTrucks > 0
                ? `${activeTrucks} camión${activeTrucks === 1 ? '' : 'es'} en tu zona`
                : 'Sin recolección activa ahora'}
            </Text>
          </View>
          <Text style={s.cardDesc}>
            {activeTrucks > 0
              ? 'Toca un camión para ver detalles y rastreo'
              : 'Te avisaremos cuando un camión esté en ruta.'}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
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
                    {
                      borderColor: active ? `${meta.color}80` : '#334155',
                      backgroundColor: active ? `${meta.color}25` : 'rgba(15,23,42,0.6)',
                    },
                  ]}
                >
                  <Feather
                    name={active ? 'check' : 'circle'}
                    size={10}
                    color={active ? meta.color : '#94A3B8'}
                  />
                  <Text style={[s.filterChipText, { color: active ? meta.color : '#94A3B8' }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </LinearGradient>
      </View>

      {selectedExecution && (
        <View style={s.tooltipWrap}>
          <LinearGradient
            colors={['rgba(16,185,129,0.95)', 'rgba(5,150,105,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.tooltip}
          >
            <View style={s.tooltipHeader}>
              <Feather name="truck" size={16} color="#FFF" />
              <Text style={s.tooltipTitle}>{selectedExecution.routeName}</Text>
              <TouchableOpacity onPress={() => { setSelectedExecution(null); setTrail(null); }} hitSlop={8}>
                <Feather name="x" size={18} color="#FFF" />
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
          </LinearGradient>
        </View>
      )}

      <TouchableOpacity style={s.fab} onPress={centerOnUser} activeOpacity={0.85}>
        <Feather name="navigation" size={20} color="#FFF" />
      </TouchableOpacity>

      <TouchableOpacity style={s.fabSecondary} onPress={handleRefresh} activeOpacity={0.85}>
        <Feather name="refresh-cw" size={18} color="#10B981" />
      </TouchableOpacity>
    </View>
  );
}

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { width: '100%', height: '100%' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', gap: 16 },
  skeletonShimmer: { alignItems: 'center', gap: 12 },
  loadingText: { color: '#94A3B8', marginTop: 12, fontSize: 14 },
  retryBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999, marginTop: 12 },
  retryBtnText: { color: '#FFF', fontWeight: '700' },
  overlay: { position: 'absolute', top: 50, left: 16, right: 16 },
  card: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(51,65,85,0.8)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDotWrap: { width: 14, height: 14, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotPulse: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1, opacity: 0.6 },
  cardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '800', flex: 1 },
  cardDesc: { color: '#94A3B8', fontSize: 12, marginBottom: 12 },
  filtersRow: { gap: 8, paddingRight: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  filterChipText: { fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, backgroundColor: '#10B981', width: 52, height: 52,
    borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  fabSecondary: {
    position: 'absolute', bottom: 86, right: 24, backgroundColor: 'rgba(30,41,59,0.95)', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, borderWidth: 1, borderColor: '#334155',
  },
  tooltipWrap: { position: 'absolute', bottom: 100, left: 16, right: 80 },
  tooltip: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)' },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tooltipTitle: { color: '#FFF', fontWeight: '800', fontSize: 14, flex: 1 },
  tooltipLine: { color: 'rgba(255,255,255,0.95)', fontSize: 12, marginTop: 2 },
});

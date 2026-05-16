import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { useGpsTracker } from '../../src/hooks/useGpsTracker';

interface Waypoint {
  order: number;
  name: string;
  location: { type: 'Point'; coordinates: [number, number] };
  estimatedArrival?: string;
}

interface Execution {
  _id: string;
  status: string;
  startedAt: string;
  route: {
    _id: string;
    name: string;
    waypoints?: Waypoint[];
    path?: { type: 'LineString'; coordinates: number[][] };
  };
  waypointsVisited?: { waypoint: number; arrivedAt: string; skipped?: boolean; skipReason?: string }[];
}

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const AVG_SPEED_MS = 5; // ~18 km/h, conservative for collection trucks

export default function RouteMapScreen() {
  const { getActiveExecutionId } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [skipModal, setSkipModal] = useState<{ open: boolean; order: number | null }>({
    open: false,
    order: null,
  });
  const [skipReason, setSkipReason] = useState('');

  // GPS tracker (background of sorts — also runs in jornada screen, but enabling
  // here ensures position keeps streaming while operator is on the map)
  useGpsTracker(execution?.status === 'in_progress' ? execution._id : null);

  const visitedSet = useMemo(() => {
    const map = new Map<number, { skipped?: boolean }>();
    execution?.waypointsVisited?.forEach((v) => map.set(v.waypoint, { skipped: v.skipped }));
    return map;
  }, [execution?.waypointsVisited]);

  const loadExecution = useCallback(async () => {
    try {
      const id = await getActiveExecutionId();
      if (!id) {
        setExecution(null);
        return;
      }
      const { data } = await api.get(`/route-executions/${id}`);
      if (data?.success) {
        setExecution(data.data);
      } else {
        setExecution(null);
      }
    } catch (e) {
      setExecution(null);
    }
  }, [getActiveExecutionId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted' && !cancelled) {
          const loc = await Location.getCurrentPositionAsync({});
          if (!cancelled) {
            setMyLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
        if (!cancelled) {
          await loadExecution();
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [loadExecution])
  );

  // Watch position continuously for the live marker
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          if (!cancelled) {
            setMyLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      );
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  const waypoints = execution?.route?.waypoints || [];
  const polylineCoords = useMemo(
    () =>
      execution?.route?.path?.coordinates?.map((c) => ({
        latitude: c[1],
        longitude: c[0],
      })) || [],
    [execution?.route?.path?.coordinates]
  );

  // Next pending waypoint (in numerical order)
  const nextWaypoint = useMemo(() => {
    const sorted = [...waypoints].sort((a, b) => a.order - b.order);
    return sorted.find((w) => !visitedSet.has(w.order)) || null;
  }, [waypoints, visitedSet]);

  const distanceToNext = useMemo(() => {
    if (!myLocation || !nextWaypoint) return null;
    return haversineMeters(myLocation, {
      latitude: nextWaypoint.location.coordinates[1],
      longitude: nextWaypoint.location.coordinates[0],
    });
  }, [myLocation, nextWaypoint]);

  const etaMinutes = distanceToNext ? Math.max(1, Math.round(distanceToNext / AVG_SPEED_MS / 60)) : null;

  const centerOnUser = () => {
    if (myLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const markArrived = async () => {
    if (!execution || !nextWaypoint) return;
    try {
      const { data } = await api.post(`/route-executions/${execution._id}/waypoint`, {
        waypoint: nextWaypoint.order,
      });
      if (!data?.success) throw new Error(data?.error?.message || 'Error');
      Alert.alert('Parada registrada', `Marcaste como visitada: ${nextWaypoint.name}`);
      await loadExecution();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error?.message || err?.message || 'No se pudo registrar la parada'
      );
    }
  };

  const skipStop = async () => {
    if (!execution || skipModal.order == null) return;
    if (!skipReason.trim()) {
      Alert.alert('Falta razón', 'Indica por qué se omite esta parada');
      return;
    }
    try {
      const { data } = await api.post(`/route-executions/${execution._id}/waypoint`, {
        waypoint: skipModal.order,
        skipped: true,
        skipReason: skipReason.trim(),
      });
      if (!data?.success) throw new Error(data?.error?.message || 'Error');
      setSkipModal({ open: false, order: null });
      setSkipReason('');
      await loadExecution();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error?.message || err?.message || 'No se pudo saltar la parada'
      );
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={s.loadingText}>Cargando ruta...</Text>
      </View>
    );
  }

  if (!execution) {
    return (
      <View style={s.empty}>
        <Feather name="map" size={48} color="#64748B" />
        <Text style={s.emptyTitle}>Sin jornada activa</Text>
        <Text style={s.emptyDesc}>Inicia una jornada desde la pestaña "Jornada" para ver tu ruta.</Text>
      </View>
    );
  }

  const initialLat = waypoints[0]?.location.coordinates[1] || myLocation?.latitude || -13.52264;
  const initialLng = waypoints[0]?.location.coordinates[0] || myLocation?.longitude || -71.96734;

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: initialLat,
          longitude: initialLng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        showsUserLocation={false}
        customMapStyle={mapStyle}
      >
        {polylineCoords.length > 1 ? (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#10B981"
            strokeWidth={4}
          />
        ) : null}

        {waypoints.map((wp) => {
          const visited = visitedSet.get(wp.order);
          const color = visited
            ? visited.skipped
              ? '#EF4444'
              : '#10B981'
            : '#64748B';
          return (
            <Marker
              key={wp.order}
              coordinate={{
                latitude: wp.location.coordinates[1],
                longitude: wp.location.coordinates[0],
              }}
              title={`${wp.order}. ${wp.name}`}
              description={
                visited
                  ? visited.skipped
                    ? 'Saltada'
                    : 'Visitada'
                  : 'Pendiente'
              }
            >
              <View style={[s.wpMarker, { backgroundColor: color }]}>
                <Text style={s.wpMarkerText}>{wp.order}</Text>
              </View>
            </Marker>
          );
        })}

        {myLocation ? (
          <Marker coordinate={myLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={s.meWrap}>
              <View style={s.meHalo} />
              <View style={s.meDot} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* Bottom card */}
      <View style={s.bottomCard}>
        {nextWaypoint ? (
          <>
            <View style={s.bottomRow}>
              <View style={s.nextBadge}>
                <Text style={s.nextBadgeText}>#{nextWaypoint.order}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.bottomLabel}>PRÓXIMA PARADA</Text>
                <Text style={s.bottomTitle} numberOfLines={1}>
                  {nextWaypoint.name}
                </Text>
                <View style={s.bottomMeta}>
                  {distanceToNext != null ? (
                    <Text style={s.metaText}>
                      <Feather name="navigation" size={11} color="#94A3B8" />{' '}
                      {distanceToNext < 1000
                        ? `${Math.round(distanceToNext)} m`
                        : `${(distanceToNext / 1000).toFixed(1)} km`}
                    </Text>
                  ) : null}
                  {etaMinutes != null ? (
                    <Text style={s.metaText}>
                      <Feather name="clock" size={11} color="#94A3B8" /> ~{etaMinutes} min
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={s.bottomActions}>
              <TouchableOpacity style={s.arrivedBtn} onPress={markArrived} activeOpacity={0.85}>
                <Feather name="check-circle" size={18} color="#FFF" />
                <Text style={s.arrivedBtnText}>He llegado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.skipBtn}
                onPress={() => setSkipModal({ open: true, order: nextWaypoint.order })}
                activeOpacity={0.85}
              >
                <Feather name="skip-forward" size={16} color="#EF4444" />
                <Text style={s.skipBtnText}>Saltar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Feather name="award" size={28} color="#10B981" />
            <Text style={s.allDoneText}>¡Todas las paradas registradas!</Text>
            <Text style={s.allDoneDesc}>Puedes finalizar la jornada desde la pestaña Jornada.</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={s.fab} onPress={centerOnUser} activeOpacity={0.85}>
        <Feather name="crosshair" size={22} color="#FFF" />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={skipModal.open}
        onRequestClose={() => setSkipModal({ open: false, order: null })}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Feather name="skip-forward" size={28} color="#EF4444" style={{ alignSelf: 'center' }} />
            <Text style={s.modalTitle}>Saltar parada</Text>
            <Text style={s.modalDesc}>Indica brevemente la razón.</Text>
            <TextInput
              style={s.input}
              placeholder="Ej. Calle bloqueada, contenedor inaccesible..."
              placeholderTextColor="#64748B"
              value={skipReason}
              onChangeText={setSkipReason}
              multiline
            />
            <View style={s.modalRow}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => setSkipModal({ open: false, order: null })}
              >
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={skipStop}>
                <Text style={s.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  map: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  loadingText: { color: '#94A3B8', marginTop: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', padding: 32 },
  emptyTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptyDesc: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 8 },

  wpMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  wpMarkerText: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  meWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  meHalo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16,185,129,0.25)',
  },
  meDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  bottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  nextBadge: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.5)',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  nextBadgeText: { color: '#10B981', fontWeight: '900', fontSize: 16 },
  bottomLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  bottomTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '800', marginTop: 2 },
  bottomMeta: { flexDirection: 'row', gap: 14, marginTop: 6 },
  metaText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  bottomActions: { flexDirection: 'row', gap: 10 },
  arrivedBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  arrivedBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  skipBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },

  allDoneText: { color: '#F8FAFC', fontWeight: '800', fontSize: 17, marginTop: 10 },
  allDoneDesc: { color: '#94A3B8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderColor: '#334155',
    borderWidth: 1,
  },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  modalDesc: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginTop: 6 },
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginTop: 16,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancel: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#F8FAFC', fontWeight: '700' },
  modalConfirm: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#FFFFFF', fontWeight: '800' },
});

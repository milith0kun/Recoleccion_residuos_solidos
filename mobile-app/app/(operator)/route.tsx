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
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

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

const AVG_SPEED_MS = 5;

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

  const etaMinutes = distanceToNext
    ? Math.max(1, Math.round(distanceToNext / AVG_SPEED_MS / 60))
    : null;

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
      Alert.alert('Falta razón', 'Indicá por qué se omite esta parada');
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Cargando ruta...</Text>
      </View>
    );
  }

  if (!execution) {
    return (
      <View style={s.empty}>
        <View style={s.emptyIcon}>
          <Feather name="map" size={28} color={colors.primary} />
        </View>
        <Text style={s.emptyTitle}>Sin jornada activa</Text>
        <Text style={s.emptyDesc}>
          Iniciá una jornada desde la pestaña "Jornada" para ver tu ruta.
        </Text>
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
      >
        {polylineCoords.length > 1 ? (
          <Polyline coordinates={polylineCoords} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}

        {waypoints.map((wp) => {
          const visited = visitedSet.get(wp.order);
          const color = visited
            ? visited.skipped
              ? colors.danger
              : colors.primary
            : colors.textMuted;
          return (
            <Marker
              key={wp.order}
              coordinate={{
                latitude: wp.location.coordinates[1],
                longitude: wp.location.coordinates[0],
              }}
              title={`${wp.order}. ${wp.name}`}
              description={
                visited ? (visited.skipped ? 'Saltada' : 'Visitada') : 'Pendiente'
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

      <View style={s.bottomCard}>
        {nextWaypoint ? (
          <>
            <View style={s.bottomRow}>
              <View style={s.nextBadge}>
                <Text style={s.nextBadgeText}>#{nextWaypoint.order}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.bottomLabel}>Próxima parada</Text>
                <Text style={s.bottomTitle} numberOfLines={1}>
                  {nextWaypoint.name}
                </Text>
                <View style={s.bottomMeta}>
                  {distanceToNext != null ? (
                    <View style={s.metaItem}>
                      <Feather name="navigation" size={11} color={colors.textSecondary} />
                      <Text style={s.metaText}>
                        {distanceToNext < 1000
                          ? `${Math.round(distanceToNext)} m`
                          : `${(distanceToNext / 1000).toFixed(1)} km`}
                      </Text>
                    </View>
                  ) : null}
                  {etaMinutes != null ? (
                    <View style={s.metaItem}>
                      <Feather name="clock" size={11} color={colors.textSecondary} />
                      <Text style={s.metaText}>~{etaMinutes} min</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={s.bottomActions}>
              <TouchableOpacity style={s.arrivedBtn} onPress={markArrived} activeOpacity={0.85}>
                <Feather name="check-circle" size={16} color="#FFFFFF" />
                <Text style={s.arrivedBtnText}>He llegado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.skipBtn}
                onPress={() => setSkipModal({ open: true, order: nextWaypoint.order })}
                activeOpacity={0.85}
              >
                <Feather name="skip-forward" size={14} color={colors.danger} />
                <Text style={s.skipBtnText}>Saltar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Feather name="award" size={24} color={colors.primary} />
            <Text style={s.allDoneText}>¡Todas las paradas registradas!</Text>
            <Text style={s.allDoneDesc}>
              Podés finalizar la jornada desde la pestaña Jornada.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={s.fab} onPress={centerOnUser} activeOpacity={0.85}>
        <Feather name="crosshair" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        transparent
        animationType="fade"
        visible={skipModal.open}
        onRequestClose={() => setSkipModal({ open: false, order: null })}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalIconWrap}>
              <Feather name="skip-forward" size={22} color={colors.danger} />
            </View>
            <Text style={s.modalTitle}>Saltar parada</Text>
            <Text style={s.modalDesc}>Indicá brevemente la razón.</Text>
            <TextInput
              style={s.input}
              placeholder="Ej. Calle bloqueada, contenedor inaccesible..."
              placeholderTextColor={colors.textPlaceholder}
              value={skipReason}
              onChangeText={setSkipReason}
              multiline
            />
            <View style={s.modalRow}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => setSkipModal({ open: false, order: null })}
                activeOpacity={0.85}
              >
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirm} onPress={skipStop} activeOpacity={0.85}>
                <Text style={s.modalConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '500',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },

  wpMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  wpMarkerText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
  },

  meWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  meHalo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,104,74,0.22)',
  },
  meDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  bottomCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  nextBadge: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: radius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  nextBadgeText: {
    fontFamily: fontFamily.sansBold,
    color: colors.primaryDark,
    fontSize: 14,
  },
  bottomLabel: {
    fontFamily: fontFamily.sansBold,
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bottomTitle: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  bottomMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 11.5,
  },

  bottomActions: { flexDirection: 'row', gap: spacing.sm },
  arrivedBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  arrivedBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    gap: 6,
  },
  skipBtnText: {
    color: colors.danger,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
  },

  allDoneText: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 17,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: -0.2,
  },
  allDoneDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
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
    borderRadius: 24,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 19,
    fontWeight: '500',
    marginTop: spacing.md,
    textAlign: 'center',
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
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
    marginTop: spacing.lg,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  modalCancel: {
    flex: 1,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.ink,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: colors.danger,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
  },
});

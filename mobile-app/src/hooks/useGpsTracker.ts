import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import api from '../api/client';

/**
 * useGpsTracker
 * Foreground GPS tracker that posts position to /gps/track every ~10s while
 * `routeExecutionId` is non-null. Cleans up on unmount or when the id changes.
 *
 * NOTE (MVP): This uses `watchPositionAsync` which only runs in foreground.
 * For real background tracking we'd need `Location.startLocationUpdatesAsync`
 * + TaskManager (background task definitions outside React) and additional
 * Android foreground service config. For now the operator is expected to keep
 * the app open during a jornada activa — which is the realistic scenario.
 */
export interface GpsTrackerState {
  isTracking: boolean;
  lastSentAt: number | null;
  errorCount: number;
  lastError: string | null;
  lastAccuracy: number | null;
  lastCoords: { latitude: number; longitude: number } | null;
}

const MIN_INTERVAL_MS = 10_000;

export function useGpsTracker(routeExecutionId: string | null): GpsTrackerState {
  const [isTracking, setIsTracking] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [lastCoords, setLastCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Refs to avoid stale closures inside the watcher callback
  const lastSentAtRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const alertedRef = useRef<boolean>(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!routeExecutionId) {
      setIsTracking(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLastError('Permiso de ubicación denegado');
          Alert.alert(
            'Permiso requerido',
            'Necesitamos acceso a tu ubicación para registrar el recorrido. Activa el permiso desde Ajustes.'
          );
          return;
        }

        if (cancelled) return;

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: MIN_INTERVAL_MS,
            distanceInterval: 0,
          },
          async (loc) => {
            const now = Date.now();
            // Throttle: ensure we don't post more than once per MIN_INTERVAL_MS
            if (now - lastSentAtRef.current < MIN_INTERVAL_MS - 500) return;

            setLastCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            setLastAccuracy(loc.coords.accuracy ?? null);

            try {
              await api.post('/gps/track', {
                routeExecutionId,
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                speed: typeof loc.coords.speed === 'number' ? loc.coords.speed : 0,
                heading: typeof loc.coords.heading === 'number' ? loc.coords.heading : 0,
                accuracy: typeof loc.coords.accuracy === 'number' ? loc.coords.accuracy : 0,
                timestamp: new Date(loc.timestamp || now).toISOString(),
              });
              lastSentAtRef.current = now;
              setLastSentAt(now);
              errorCountRef.current = 0;
              setErrorCount(0);
              setLastError(null);
            } catch (err: any) {
              errorCountRef.current += 1;
              setErrorCount(errorCountRef.current);
              const msg =
                err?.response?.data?.error?.message ||
                err?.message ||
                'Error enviando GPS';
              setLastError(msg);
              if (errorCountRef.current >= 3 && !alertedRef.current) {
                alertedRef.current = true;
                Alert.alert(
                  'Problema de conexión',
                  'No se pudo enviar la ubicación 3 veces consecutivas. Verifica tu conexión.'
                );
              }
            }
          }
        );

        if (cancelled) {
          sub.remove();
          return;
        }

        subscriptionRef.current = sub;
        setIsTracking(true);
      } catch (err: any) {
        setLastError(err?.message || 'No se pudo iniciar el GPS');
        setIsTracking(false);
      }
    })();

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setIsTracking(false);
      lastSentAtRef.current = 0;
      errorCountRef.current = 0;
      alertedRef.current = false;
    };
  }, [routeExecutionId]);

  return {
    isTracking,
    lastSentAt,
    errorCount,
    lastError,
    lastAccuracy,
    lastCoords,
  };
}

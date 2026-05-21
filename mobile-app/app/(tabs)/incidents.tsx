import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { AppHeader } from '../../src/components/layout/AppShell';
import { OSMMap, type MapMarker } from '../../src/components/OSMMap';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

type IncidentType = 'accumulation' | 'damaged_container' | 'missed_collection' | 'other';
type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

const TYPE_OPTIONS: { key: IncidentType; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'accumulation', label: 'Acumulación de residuos', icon: 'trash-2' },
  { key: 'damaged_container', label: 'Contenedor dañado', icon: 'alert-octagon' },
  { key: 'missed_collection', label: 'No pasaron a recolectar', icon: 'truck' },
  { key: 'other', label: 'Otro', icon: 'help-circle' },
];

const SEVERITY_OPTIONS: { key: IncidentSeverity; label: string; color: string }[] = [
  { key: 'low', label: 'Baja', color: colors.textSecondary },
  { key: 'medium', label: 'Media', color: colors.warn },
  { key: 'high', label: 'Alta', color: colors.danger },
];

interface IncidentSummary {
  _id: string;
  code: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved';
  type: IncidentType;
  createdAt: string;
}

interface QueuedIncidentPayload {
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  address?: string;
  lat?: number;
  lng?: number;
}

const INCIDENT_QUEUE_KEY = '@incidents:pending-queue';

async function readQueue(): Promise<QueuedIncidentPayload[]> {
  const raw = await AsyncStorage.getItem(INCIDENT_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedIncidentPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedIncidentPayload[]) {
  await AsyncStorage.setItem(INCIDENT_QUEUE_KEY, JSON.stringify(items));
}

const STATUS_LABELS: Record<IncidentSummary['status'], { label: string; color: string; bg: string }> = {
  open: { label: 'Abierto', color: colors.danger, bg: colors.dangerSoft },
  in_progress: { label: 'En proceso', color: colors.warn, bg: colors.warnSoft },
  resolved: { label: 'Resuelto', color: colors.primaryDark, bg: colors.primarySoft },
};

export default function ReportIncidentScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<IncidentType>('accumulation');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickOnMap, setPickOnMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState<IncidentSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const mapMarkers: MapMarker[] = coords
    ? [
        {
          id: 'incident-point',
          lat: coords.lat,
          lng: coords.lng,
          color: '#C62828',
          popup: 'Punto exacto del reporte',
          variant: 'pin',
        },
      ]
    : [];

  const syncQueuedIncidents = async () => {
    const queue = await readQueue();
    if (queue.length === 0) return;
    const remaining: QueuedIncidentPayload[] = [];
    for (const payload of queue) {
      try {
        await api.post('/incidents', payload);
      } catch {
        remaining.push(payload);
      }
    }
    await writeQueue(remaining);
    if (queue.length > remaining.length) {
      Alert.alert('Reportes sincronizados', `Se enviaron ${queue.length - remaining.length} reporte(s) pendientes.`);
    }
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get('/incidents');
      setHistory((data?.data ?? []).slice(0, 6));
    } catch (e) {
      if (__DEV__) console.warn('[incidents] history failed', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    syncQueuedIncidents().finally(loadHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Sin permiso de ubicación, podés escribir la dirección manualmente.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'No se pudo obtener la ubicación');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (description.trim().length < 5) {
      Alert.alert('Descripción muy corta', 'Contame brevemente qué pasó (mín. 5 caracteres).');
      return;
    }
    setSubmitting(true);
    try {
      const payload: QueuedIncidentPayload = {
        title: TYPE_OPTIONS.find((t) => t.key === type)?.label ?? 'Reporte',
        description: description.trim(),
        type,
        severity,
      };
      if (address.trim()) payload.address = address.trim();
      if (coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      }
      const { data } = await api.post('/incidents', payload);
      const code = data?.data?.code ?? '—';
      Alert.alert(
        '¡Reporte enviado!',
        `Código: ${code}\nTe vamos a notificar cuando lo revisemos.`,
        [{ text: 'OK', onPress: () => {} }]
      );
      setDescription('');
      setAddress('');
      setCoords(null);
      setType('accumulation');
      setSeverity('medium');
      loadHistory();
    } catch (err: unknown) {
      const isNetworkError = !(err as { response?: unknown })?.response;
      if (isNetworkError) {
        const queue = await readQueue();
        const payload: QueuedIncidentPayload = {
          title: TYPE_OPTIONS.find((t) => t.key === type)?.label ?? 'Reporte',
          description: description.trim(),
          type,
          severity,
          ...(address.trim() ? { address: address.trim() } : {}),
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        };
        queue.push(payload);
        await writeQueue(queue);
        Alert.alert(
          'Sin conexión',
          'Guardamos tu reporte en el dispositivo. Se enviará automáticamente cuando recuperes conexión.'
        );
        setDescription('');
        setAddress('');
        setCoords(null);
        setType('accumulation');
        setSeverity('medium');
        return;
      }
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error)?.message ||
        'No se pudo enviar el reporte';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <AppHeader title="Reportar incidencia" section="Ciudadano" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>RF-11 · Ayudá a mejorar el servicio</Text>
        <Text style={s.pageTitle}>Reportar una incidencia</Text>
        <Text style={s.pageSub}>
          Contanos sobre acumulación de residuos, contenedores dañados o
          recolecciones no realizadas. El equipo municipal lo revisa.
        </Text>

        <Text style={s.label}>Tipo</Text>
        <View style={s.optionGrid}>
          {TYPE_OPTIONS.map((opt) => {
            const active = type === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.option, active && s.optionActive]}
                activeOpacity={0.85}
                onPress={() => setType(opt.key)}
              >
                <Feather
                  name={opt.icon}
                  size={16}
                  color={active ? colors.primaryDark : colors.textSecondary}
                />
                <Text style={[s.optionLabel, active && s.optionLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Severidad</Text>
        <View style={s.severityRow}>
          {SEVERITY_OPTIONS.map((opt) => {
            const active = severity === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  s.severityChip,
                  active && { borderColor: opt.color, backgroundColor: `${opt.color}14` },
                ]}
                activeOpacity={0.85}
                onPress={() => setSeverity(opt.key)}
              >
                <Text style={[s.severityText, active && { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Descripción</Text>
        <TextInput
          style={s.textarea}
          placeholder="Describí brevemente qué pasó y dónde."
          placeholderTextColor={colors.textPlaceholder}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />

        <Text style={s.label}>Dirección (opcional)</Text>
        <TextInput
          style={s.input}
          placeholder="Ej: Calle Saphi 145"
          placeholderTextColor={colors.textPlaceholder}
          value={address}
          onChangeText={setAddress}
          autoCapitalize="words"
        />

        <View style={s.locRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.locLabel}>Ubicación GPS</Text>
            <Text style={s.locValue}>
              {coords
                ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                : 'Sin ubicación adjunta'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.locBtn}
            activeOpacity={0.85}
            onPress={requestLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Feather name="map-pin" size={13} color={colors.primaryDark} />
                <Text style={s.locBtnText}>{coords ? 'Actualizar' : 'Adjuntar'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.mapToggleBtn, pickOnMap && s.mapToggleBtnActive]}
          onPress={() => setPickOnMap((v) => !v)}
          activeOpacity={0.85}
        >
          <Feather name="crosshair" size={14} color={pickOnMap ? colors.primaryDark : colors.textSecondary} />
          <Text style={[s.mapToggleText, pickOnMap && s.mapToggleTextActive]}>
            {pickOnMap ? 'Ocultar mapa' : 'Marcar punto exacto en mapa'}
          </Text>
        </TouchableOpacity>

        {pickOnMap && (
          <View style={s.mapWrap}>
            <OSMMap
              center={coords ?? { lat: -13.517088, lng: -71.978536 }}
              zoom={16}
              markers={mapMarkers}
              showUserLocation={Boolean(coords)}
              userLocation={coords}
              onMapPress={(lat, lng) => setCoords({ lat, lng })}
            />
            <Text style={s.mapHint}>Tocá el mapa para fijar el punto rojo exacto del problema.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.submitBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={14} color="#FFFFFF" />
              <Text style={s.submitBtnText}>Enviar reporte</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[s.label, { marginTop: spacing.xl }]}>Tus reportes recientes</Text>
        {loadingHistory ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
        ) : history.length === 0 ? (
          <Text style={s.emptyHist}>Todavía no hiciste ningún reporte.</Text>
        ) : (
          history.map((it) => {
            const status = STATUS_LABELS[it.status];
            return (
              <View key={it._id} style={s.histItem}>
                <View style={s.histLeft}>
                  <Text style={s.histCode}>{it.code}</Text>
                  <Text style={s.histTitle} numberOfLines={1}>
                    {it.title}
                  </Text>
                  <Text style={s.histDate}>{new Date(it.createdAt).toLocaleDateString('es-PE')}</Text>
                </View>
                <View style={[s.histBadge, { backgroundColor: status.bg }]}>
                  <Text style={[s.histBadgeText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: spacing.md, paddingBottom: 40 },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  pageSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },

  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 14,
  },

  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    paddingVertical: 11,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  optionLabelActive: {
    color: colors.primaryDark,
  },

  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  severityText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    color: colors.textSecondary,
  },

  textarea: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
    minHeight: 88,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
  },

  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  locLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  locValue: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12.5,
    color: colors.ink,
    marginTop: 2,
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
  },
  locBtnText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  mapToggleBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  mapToggleBtnActive: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  mapToggleText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  mapToggleTextActive: {
    color: colors.primaryDark,
  },
  mapWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  mapHint: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11.5,
    color: colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    marginTop: spacing.lg,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
  },

  emptyHist: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  histItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  histLeft: { flex: 1 },
  histCode: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.4,
  },
  histTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 2,
  },
  histDate: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  histBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  histBadgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },
});

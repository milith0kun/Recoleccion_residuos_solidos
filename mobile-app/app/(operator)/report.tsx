import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { AppHeader } from '../../src/components/layout/AppShell';

interface Waypoint {
  order: number;
  name: string;
  estimatedArrival?: string;
}

interface WaypointVisited {
  waypoint: number;
  arrivedAt: string;
  skipped?: boolean;
  skipReason?: string;
}

interface Execution {
  _id: string;
  status: string;
  route: { _id: string; name: string; waypoints?: Waypoint[] };
  waypointsVisited?: WaypointVisited[];
  collectionData?: {
    organicKg?: number;
    recyclableKg?: number;
    nonRecyclableKg?: number;
    observations?: string;
  };
}

export default function ReportScreen() {
  const { getActiveExecutionId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [saving, setSaving] = useState(false);

  const [organicKg, setOrganicKg] = useState('');
  const [recyclableKg, setRecyclableKg] = useState('');
  const [nonRecyclableKg, setNonRecyclableKg] = useState('');
  const [observations, setObservations] = useState('');

  const load = useCallback(async () => {
    try {
      const id = await getActiveExecutionId();
      if (!id) {
        setExecution(null);
        return;
      }
      const { data } = await api.get(`/route-executions/${id}`);
      if (data?.success) {
        const ex: Execution = data.data;
        setExecution(ex);
        if (ex.collectionData) {
          setOrganicKg(ex.collectionData.organicKg ? String(ex.collectionData.organicKg) : '');
          setRecyclableKg(
            ex.collectionData.recyclableKg ? String(ex.collectionData.recyclableKg) : ''
          );
          setNonRecyclableKg(
            ex.collectionData.nonRecyclableKg ? String(ex.collectionData.nonRecyclableKg) : ''
          );
          setObservations(ex.collectionData.observations || '');
        }
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
        if (!cancelled) await load();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const saveCollection = async () => {
    if (!execution) return;
    const cd = {
      organicKg: parseFloat(organicKg) || 0,
      recyclableKg: parseFloat(recyclableKg) || 0,
      nonRecyclableKg: parseFloat(nonRecyclableKg) || 0,
      observations: observations.trim(),
    };
    setSaving(true);
    try {
      const { data } = await api.patch(`/route-executions/${execution._id}`, {
        collectionData: cd,
      });
      if (!data?.success) throw new Error(data?.error?.message || 'Error');
      Alert.alert('Guardado', 'Datos de recolección actualizados. Se incluirán al cerrar la jornada.');
      setExecution(data.data);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.error?.message || err?.message || 'No se pudo guardar'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.container}>
        <AppHeader title="Reportar" section="Operador" />
        <View style={s.empty}>
          <Text style={s.emptyDesc}>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!execution) {
    return (
      <View style={s.container}>
      <AppHeader title="Reportar" section="Operador" />
      <View style={s.empty}>
        <View style={s.emptyIcon}>
          <Feather name="clipboard" size={26} color={colors.primary} />
        </View>
        <Text style={s.emptyTitle}>Sin jornada activa</Text>
        <Text style={s.emptyDesc}>
          Iniciá una jornada para registrar paradas y recolección.
        </Text>
      </View>
      </View>
    );
  }

  const waypoints = execution.route.waypoints || [];
  const visited = new Map<number, WaypointVisited>();
  execution.waypointsVisited?.forEach((v) => visited.set(v.waypoint, v));

  const isActive = execution.status === 'in_progress';

  return (
    <View style={s.container}>
    <AppHeader title="Reportar" section="Operador" />
    <ScrollView
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={s.eyebrow}>Historial</Text>
      <Text style={s.h1}>Paradas registradas</Text>
      <Text style={s.subtitle}>{execution.route.name}</Text>

      <View style={s.list}>
        {waypoints
          .sort((a, b) => a.order - b.order)
          .map((wp) => {
            const v = visited.get(wp.order);
            const state = !v ? 'pending' : v.skipped ? 'skipped' : 'done';
            const color =
              state === 'done'
                ? colors.primary
                : state === 'skipped'
                ? colors.danger
                : colors.textMuted;
            return (
              <View key={wp.order} style={s.item}>
                <View style={[s.itemBadge, { backgroundColor: color }]}>
                  <Text style={s.itemBadgeText}>{wp.order}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.itemName}>{wp.name}</Text>
                  <Text style={[s.itemStatus, { color }]}>
                    {state === 'done'
                      ? `Visitada${v ? ` · ${new Date(v.arrivedAt).toLocaleTimeString()}` : ''}`
                      : state === 'skipped'
                      ? `Saltada${v?.skipReason ? ` · ${v.skipReason}` : ''}`
                      : 'Pendiente'}
                  </Text>
                </View>
                <Feather
                  name={
                    state === 'done' ? 'check-circle' : state === 'skipped' ? 'x-circle' : 'circle'
                  }
                  size={18}
                  color={color}
                />
              </View>
            );
          })}
        {waypoints.length === 0 ? (
          <Text style={s.emptyDesc}>Esta ruta no tiene paradas definidas.</Text>
        ) : null}
      </View>

      <Text style={s.eyebrow}>Cierre</Text>
      <Text style={s.h1}>Datos de recolección</Text>
      <Text style={s.helper}>
        Registrá los pesos al final de la jornada. Se enviarán al cerrar la ejecución.
      </Text>

      <View style={s.form}>
        <Field
          label="Orgánico (kg)"
          icon="droplet"
          value={organicKg}
          onChange={setOrganicKg}
          disabled={!isActive}
        />
        <Field
          label="Reciclable (kg)"
          icon="refresh-cw"
          value={recyclableKg}
          onChange={setRecyclableKg}
          disabled={!isActive}
        />
        <Field
          label="No reciclable (kg)"
          icon="trash-2"
          value={nonRecyclableKg}
          onChange={setNonRecyclableKg}
          disabled={!isActive}
        />

        <Text style={s.label}>Observaciones</Text>
        <TextInput
          style={[s.input, { minHeight: 80, textAlignVertical: 'top' }, !isActive && s.disabled]}
          editable={isActive}
          multiline
          placeholder="Comentarios, incidencias o detalles relevantes..."
          placeholderTextColor={colors.textPlaceholder}
          value={observations}
          onChangeText={setObservations}
        />

        <TouchableOpacity
          style={[s.saveBtn, (!isActive || saving) && { opacity: 0.55 }]}
          disabled={!isActive || saving}
          onPress={saveCollection}
          activeOpacity={0.85}
        >
          <Feather name="save" size={16} color="#FFFFFF" />
          <Text style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar recolección'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  disabled,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  onChange: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, disabled && s.disabled]}>
        <Feather name={icon} size={15} color={colors.textMuted} />
        <TextInput
          style={s.inputInner}
          editable={!disabled}
          keyboardType="numeric"
          placeholder="0.0"
          placeholderTextColor={colors.textPlaceholder}
          value={value}
          onChangeText={onChange}
        />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  empty: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '500',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  emptyDesc: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: spacing.md,
  },
  h1: {
    fontFamily: fontFamily.serif,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  helper: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12.5,
    marginBottom: spacing.md,
    lineHeight: 18,
  },

  list: { marginBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBadgeText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansBold,
    fontSize: 12,
  },
  itemName: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 13.5,
  },
  itemStatus: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
    marginTop: 2,
  },

  form: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.sansBold,
    color: colors.textSecondary,
    fontSize: 10.5,
    marginBottom: 6,
    marginTop: spacing.md,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputInner: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontFamily: fontFamily.sansMedium,
    paddingVertical: 11,
  },
  input: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
  },
  disabled: { opacity: 0.6 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    marginTop: spacing.lg,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});

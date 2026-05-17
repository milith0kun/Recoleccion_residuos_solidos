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
      <View style={s.empty}>
        <Text style={s.emptyDesc}>Cargando...</Text>
      </View>
    );
  }

  if (!execution) {
    return (
      <View style={s.empty}>
        <Feather name="clipboard" size={48} color="#B0ADA8" />
        <Text style={s.emptyTitle}>Sin jornada activa</Text>
        <Text style={s.emptyDesc}>Inicia una jornada para registrar paradas y recolección.</Text>
      </View>
    );
  }

  const waypoints = execution.route.waypoints || [];
  const visited = new Map<number, WaypointVisited>();
  execution.waypointsVisited?.forEach((v) => visited.set(v.waypoint, v));

  const isActive = execution.status === 'in_progress';

  return (
    <ScrollView
      style={s.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
      }
    >
      <Text style={s.h1}>Historial de paradas</Text>
      <Text style={s.subtitle}>{execution.route.name}</Text>

      <View style={s.list}>
        {waypoints
          .sort((a, b) => a.order - b.order)
          .map((wp) => {
            const v = visited.get(wp.order);
            const state = !v ? 'pending' : v.skipped ? 'skipped' : 'done';
            const color =
              state === 'done' ? '#059669' : state === 'skipped' ? '#EF4444' : '#B0ADA8';
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
                  name={state === 'done' ? 'check-circle' : state === 'skipped' ? 'x-circle' : 'circle'}
                  size={20}
                  color={color}
                />
              </View>
            );
          })}
        {waypoints.length === 0 ? (
          <Text style={s.emptyDesc}>Esta ruta no tiene paradas definidas.</Text>
        ) : null}
      </View>

      <Text style={s.h1}>Datos de recolección</Text>
      <Text style={s.helper}>
        Registra los pesos al final de la jornada. Se enviarán al cerrar la ejecución.
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
          style={[s.input, { minHeight: 90, textAlignVertical: 'top' }, !isActive && s.disabled]}
          editable={isActive}
          multiline
          placeholder="Comentarios, incidencias o detalles relevantes..."
          placeholderTextColor="#B0ADA8"
          value={observations}
          onChangeText={setObservations}
        />

        <TouchableOpacity
          style={[s.saveBtn, (!isActive || saving) && { opacity: 0.5 }]}
          disabled={!isActive || saving}
          onPress={saveCollection}
          activeOpacity={0.85}
        >
          <Feather name="save" size={18} color="#FFFFFF" />
          <Text style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar recolección'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
        <Feather name={icon} size={16} color="#8A8780" />
        <TextInput
          style={s.inputInner}
          editable={!disabled}
          keyboardType="numeric"
          placeholder="0.0"
          placeholderTextColor="#B0ADA8"
          value={value}
          onChangeText={onChange}
        />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8', padding: 20 },
  empty: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptyDesc: { color: '#8A8780', fontSize: 13, textAlign: 'center', marginTop: 8 },

  h1: { color: '#1A1A1A', fontSize: 20, fontWeight: '900', marginBottom: 4, marginTop: 12 },
  subtitle: { color: '#8A8780', fontSize: 13, marginBottom: 16 },
  helper: { color: '#8A8780', fontSize: 12, marginBottom: 12 },

  list: { marginBottom: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECEAE6',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  itemBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  itemName: { color: '#1A1A1A', fontSize: 14, fontWeight: '700' },
  itemStatus: { fontSize: 11, marginTop: 2, fontWeight: '600' },

  form: { backgroundColor: '#FFFFFF', borderColor: '#ECEAE6', borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { color: '#8A8780', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    borderColor: '#ECEAE6',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputInner: { flex: 1, color: '#1A1A1A', fontSize: 15, paddingVertical: 12 },
  input: {
    backgroundColor: '#FAFAF8',
    borderColor: '#ECEAE6',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#1A1A1A',
    fontSize: 14,
  },
  disabled: { opacity: 0.6 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../src/api/client';
import { AppHeader } from '../../src/components/layout/AppShell';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

type ExecStatus = 'completed' | 'cancelled' | 'delayed';

interface DriverItem {
  _id: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

interface ExecutionItem {
  _id: string;
  route?: { name?: string };
  operator?: { _id?: string; firstName?: string; lastName?: string };
  vehicle?: { plate?: string; type?: string };
  status: ExecStatus;
  startedAt?: string;
  endedAt?: string;
  waypointsVisited?: Array<{ skipped?: boolean }>;
}

function prettyDate(iso?: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function driverName(d?: { firstName?: string; lastName?: string }) {
  const full = `${d?.firstName ?? ''} ${d?.lastName ?? ''}`.trim();
  return full || 'Conductor';
}

export default function PlannerTraces() {
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [status, setStatus] = useState<ExecStatus>('completed');
  const [items, setItems] = useState<ExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDrivers = useCallback(async () => {
    try {
      const { data } = await api.get('/users', { params: { role: 'driver', status: 'active', limit: 100 } });
      const list = (data?.data?.users ?? []) as DriverItem[];
      setDrivers(list);
    } catch (e) {
      if (__DEV__) console.warn('[planner traces] drivers fail', e);
      setDrivers([]);
    }
  }, []);

  const loadExecutions = useCallback(async () => {
    try {
      const { data } = await api.get('/route-executions', { params: { status } });
      setItems((data?.data ?? []) as ExecutionItem[]);
    } catch (e) {
      if (__DEV__) console.warn('[planner traces] executions fail', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  useFocusEffect(
    useCallback(() => {
      loadDrivers();
      loadExecutions();
    }, [loadDrivers, loadExecutions])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDrivers(), loadExecutions()]);
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    if (selectedDriver === 'all') return items;
    return items.filter((it) => it.operator?._id === selectedDriver);
  }, [items, selectedDriver]);

  return (
    <View style={s.container}>
      <AppHeader title="Trazas históricas" section="Operador" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={s.eyebrow}>Recorridos grabados</Text>
        <Text style={s.pageTitle}>Historial de jornadas</Text>
        <Text style={s.pageSub}>
          Revisá recorridos por conductor activo y estado de ejecución para control operativo.
        </Text>

        <Text style={s.label}>Estado</Text>
        <View style={s.row}>
          {(['completed', 'cancelled', 'delayed'] as ExecStatus[]).map((sKey) => {
            const active = status === sKey;
            return (
              <TouchableOpacity
                key={sKey}
                onPress={() => setStatus(sKey)}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{sKey}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Conductor activo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          <TouchableOpacity
            onPress={() => setSelectedDriver('all')}
            style={[s.chip, selectedDriver === 'all' && s.chipActive]}
            activeOpacity={0.85}
          >
            <Text style={[s.chipText, selectedDriver === 'all' && s.chipTextActive]}>Todos</Text>
          </TouchableOpacity>
          {drivers.map((d) => {
            const active = selectedDriver === d._id;
            return (
              <TouchableOpacity
                key={d._id}
                onPress={() => setSelectedDriver(d._id)}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{driverName(d)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="git-branch" size={18} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Sin trazas para el filtro actual</Text>
            <Text style={s.emptySub}>Probá con otro estado o conductor.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map((it) => {
              const visited = it.waypointsVisited?.filter((w) => !w.skipped).length ?? 0;
              const skipped = it.waypointsVisited?.filter((w) => w.skipped).length ?? 0;
              return (
                <View key={it._id} style={s.card}>
                  <Text style={s.routeName}>{it.route?.name ?? 'Ruta'}</Text>
                  <Text style={s.meta}>Conductor: {driverName(it.operator)}</Text>
                  <Text style={s.meta}>
                    Vehículo: {it.vehicle?.plate ?? '--'} · {it.vehicle?.type ?? '--'}
                  </Text>
                  <Text style={s.meta}>Inicio: {prettyDate(it.startedAt)}</Text>
                  <Text style={s.meta}>Fin: {prettyDate(it.endedAt)}</Text>
                  <Text style={s.meta}>Paradas: {visited} visitadas · {skipped} omitidas</Text>
                </View>
              );
            })}
          </View>
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
    marginTop: 12,
    marginBottom: 7,
  },
  row: { flexDirection: 'row', gap: 8, paddingRight: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.bg,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.primaryDark,
  },
  list: { gap: 8, marginTop: 10 },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  routeName: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14,
    marginBottom: 4,
  },
  meta: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyBox: {
    marginTop: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14,
  },
  emptySub: {
    fontFamily: fontFamily.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});

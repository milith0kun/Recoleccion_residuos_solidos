import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import api from '../../../src/api/client';
import { AppHeader } from '../../../src/components/layout/AppShell';
import { DispatchCard, type DispatchStatus } from '../../../src/components/DispatchCard';
import { colors, fontFamily, radius, spacing } from '../../../src/theme/tokens';

interface DispatchItem {
  _id: string;
  code: string;
  status: DispatchStatus;
  scheduledFor: string;
  notes?: string;
  route: { _id: string; name: string };
  driver: { _id: string; firstName?: string; lastName?: string };
  vehicle?: { plate?: string };
}

const FILTERS: { key: 'all' | DispatchStatus; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'accepted', label: 'Aceptadas' },
  { key: 'in_progress', label: 'En curso' },
  { key: 'completed', label: 'Completas' },
  { key: 'rejected', label: 'Rechazadas' },
];

export default function PlannerDispatchesList() {
  const router = useRouter();
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [filter, setFilter] = useState<'all' | DispatchStatus>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/dispatches');
      setItems((data?.data ?? []) as DispatchItem[]);
    } catch (e) {
      if (__DEV__) console.warn('[dispatches] load fail', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((d) => d.status === filter)),
    [items, filter]
  );

  const handleCancel = async (id: string, code: string) => {
    Alert.alert(
      'Cancelar salida',
      `¿Cancelar ${code}? El conductor será notificado.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setBusyId(id);
            try {
              await api.delete(`/dispatches/${id}`, {
                data: { reason: 'Cancelada por el operador' },
              });
              await load();
            } catch (err: unknown) {
              const message =
                (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
                  ?.error?.message || 'No se pudo cancelar';
              Alert.alert('Error', message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <AppHeader title="Asignaciones" section="Operador" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={s.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Salidas programadas</Text>
            <Text style={s.title}>
              {filtered.length} {filtered.length === 1 ? 'salida' : 'salidas'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(planner)/dispatches/new')}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <Text style={s.newBtnText}>Asignar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filtersScroll}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, active && s.filterChipActive]}
                activeOpacity={0.85}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <Text style={s.muted}>Cargando…</Text>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Feather name="inbox" size={26} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Sin salidas</Text>
            <Text style={s.emptyDesc}>
              {filter === 'all'
                ? 'Todavía no asignaste ninguna salida.'
                : `No hay salidas con estado "${filter}".`}
            </Text>
          </View>
        ) : (
          filtered.map((d) => (
            <DispatchCard
              key={d._id}
              dispatch={d}
              perspective="planner"
              busy={busyId === d._id}
              onCancel={() => handleCancel(d._id, d.code)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xxl, paddingTop: spacing.md, paddingBottom: 40 },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.md },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 28,
    marginTop: 2,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  newBtnText: { color: '#FFFFFF', fontFamily: fontFamily.sansSemibold, fontSize: 12.5 },
  filtersScroll: { marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginRight: 6,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterTextActive: { color: colors.primaryDark },
  muted: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 30,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  emptyDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
});

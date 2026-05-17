import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { AppHeader } from '../../src/components/layout/AppShell';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface KpiBlock {
  label: string;
  value: number | string;
  icon: FeatherName;
  tint: string;
}

interface DispatchSummary {
  pending: number;
  accepted: number;
  inProgress: number;
  completed: number;
  rejected: number;
}

export default function PlannerHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DispatchSummary>({
    pending: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
  });

  const load = useCallback(async () => {
    try {
      // Rango: solo dispatches programados para HOY (00:00 – 23:59).
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const { data } = await api.get('/dispatches', {
        params: { from: start.toISOString(), to: end.toISOString() },
      });
      const items: { status: string }[] = Array.isArray(data?.data) ? data.data : [];
      const summary: DispatchSummary = {
        pending: items.filter((e) => e.status === 'pending').length,
        accepted: items.filter((e) => e.status === 'accepted').length,
        inProgress: items.filter((e) => e.status === 'in_progress').length,
        completed: items.filter((e) => e.status === 'completed').length,
        rejected: items.filter(
          (e) => e.status === 'rejected' || e.status === 'cancelled',
        ).length,
      };
      setStats(summary);
    } catch (e) {
      if (__DEV__) console.warn('[planner home] load fail', e);
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

  const kpis: KpiBlock[] = [
    { label: 'Pendientes', value: stats.pending, icon: 'clock', tint: colors.warn },
    { label: 'Aceptadas', value: stats.accepted, icon: 'check-circle', tint: colors.info },
    { label: 'En ruta', value: stats.inProgress, icon: 'truck', tint: colors.primary },
    { label: 'Completas', value: stats.completed, icon: 'flag', tint: colors.primaryDark },
  ];

  const quickActions: { label: string; sub: string; icon: FeatherName; href: string }[] = [
    {
      label: 'Asignar salida',
      sub: 'Programar una jornada para un conductor',
      icon: 'send',
      href: '/(planner)/dispatches/new',
    },
    {
      label: 'Ver asignaciones',
      sub: 'Estado de las salidas en curso',
      icon: 'clipboard',
      href: '/(planner)/dispatches',
    },
    {
      label: 'Conductores activos',
      sub: 'Mapa global con camiones en ruta',
      icon: 'truck',
      href: '/(planner)/drivers',
    },
    {
      label: 'Trazas históricas',
      sub: 'Recorridos reales grabados',
      icon: 'git-branch',
      href: '/(planner)/traces',
    },
  ];

  return (
    <View style={s.container}>
      <AppHeader title="Operaciones del día" section="Operador" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={s.eyebrow}>Panel operador</Text>
        <Text style={s.pageTitle}>
          Hola, <Text style={s.pageTitleAccent}>{user?.firstName ?? 'operador'}</Text>
        </Text>
        <Text style={s.pageSub}>
          Programá vehículos, asigná salidas y supervisá las trazas que el ciudadano va a ver.
        </Text>

        <Text style={s.label}>Resumen del día</Text>
        <View style={s.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={[s.kpiCard, { borderLeftColor: k.tint }]}>
              <View style={s.kpiHeader}>
                <Feather name={k.icon} size={13} color={k.tint} />
                <Text style={s.kpiLabel}>{k.label}</Text>
              </View>
              <Text style={[s.kpiValue, { color: k.tint }]}>{k.value}</Text>
            </View>
          ))}
        </View>

        <Text style={s.label}>Accesos rápidos</Text>
        <View style={s.actions}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.href}
              style={s.actionCard}
              activeOpacity={0.85}
              onPress={() => router.push(a.href as never)}
            >
              <View style={s.actionIcon}>
                <Feather name={a.icon} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionLabel}>{a.label}</Text>
                <Text style={s.actionSub}>{a.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

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
    fontSize: 28,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  pageTitleAccent: {
    fontFamily: fontFamily.serif,
    color: colors.primary,
    fontStyle: 'italic',
  },
  pageSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: spacing.xl,
    lineHeight: 19,
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  kpiLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  kpiValue: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '500',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  actions: { gap: 8 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  actionSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

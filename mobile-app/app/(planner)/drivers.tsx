import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../src/api/client';
import { AppHeader } from '../../src/components/layout/AppShell';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';

interface ActiveDriverItem {
  executionId: string;
  routeName: string;
  operatorName: string;
  vehicle: { plate: string; type: string } | null;
  zone: { _id: string; name?: string; color?: string } | null;
  lastLocation: { lng: number; lat: number; timestamp: string; speed?: number } | null;
  isStale: boolean;
  startedAt: string;
}

function formatDate(iso?: string) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlannerDrivers() {
  const [items, setItems] = useState<ActiveDriverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/gps/active');
      setItems((data?.data ?? []) as ActiveDriverItem[]);
    } catch (e) {
      if (__DEV__) console.warn('[planner drivers] load fail', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 8000);
      return () => clearInterval(id);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <AppHeader title="Conductores activos" section="Operador" />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={s.eyebrow}>Monitoreo en tiempo real</Text>
        <Text style={s.pageTitle}>Camiones en ruta</Text>
        <Text style={s.pageSub}>
          Visualizá los conductores con ejecución activa y el estado de su GPS.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : items.length === 0 ? (
          <View style={s.emptyBox}>
            <Feather name="truck" size={18} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No hay conductores activos</Text>
            <Text style={s.emptySub}>Cuando inicien una salida aparecerán aquí.</Text>
          </View>
        ) : (
          <View style={s.list}>
            {items.map((it) => (
              <View key={it.executionId} style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.routeName}>{it.routeName}</Text>
                  <View
                    style={[
                      s.badge,
                      it.isStale
                        ? { backgroundColor: colors.warnSoft, borderColor: colors.warnBorder }
                        : { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
                    ]}
                  >
                    <Text
                      style={[
                        s.badgeText,
                        { color: it.isStale ? colors.warn : colors.primaryDark },
                      ]}
                    >
                      {it.isStale ? 'GPS inactivo' : 'GPS en vivo'}
                    </Text>
                  </View>
                </View>

                <Text style={s.meta}>{it.operatorName}</Text>
                <Text style={s.meta}>
                  {it.vehicle?.plate ?? 'Sin placa'} · {it.vehicle?.type ?? 'Sin tipo'}
                </Text>
                <Text style={s.meta}>Zona: {it.zone?.name ?? 'Sin zona'}</Text>
                <Text style={s.meta}>Última señal: {formatDate(it.lastLocation?.timestamp)}</Text>
                <Text style={s.meta}>Salida iniciada: {formatDate(it.startedAt)}</Text>
              </View>
            ))}
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
  list: { gap: 8 },
  card: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  routeName: {
    flex: 1,
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 14,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
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

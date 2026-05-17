import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../src/api/client';
import { useAuth } from '../src/context/AuthContext';
import { useNotifications } from '../src/components/layout/AppShell';
import { colors, fontFamily, radius, spacing } from '../src/theme/tokens';

type NotifKind = 'route_started' | 'route_delayed' | 'incident_created' | 'incident_status' | 'system';

interface NotificationItem {
  _id: string;
  kind: NotifKind;
  title: string;
  body: string;
  data?: { url?: string; [k: string]: unknown };
  read: boolean;
  readAt?: string;
  createdAt: string;
}

const KIND_META: Record<
  NotifKind,
  { icon: React.ComponentProps<typeof Feather>['name']; color: string }
> = {
  route_started: { icon: 'truck', color: colors.primary },
  route_delayed: { icon: 'clock', color: colors.warn },
  incident_created: { icon: 'alert-triangle', color: colors.info },
  incident_status: { icon: 'check-circle', color: colors.primaryDark },
  system: { icon: 'bell', color: colors.textSecondary },
};

const STATUS_BAR_HEIGHT = StatusBar.currentHeight ?? (Platform.OS === 'ios' ? 44 : 24);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-PE');
}

interface PushStatus {
  registered: boolean;
  tokenPreview: string | null;
  tokenUpdatedAt: string | null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh: refreshGlobal } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  const loadPushStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/test');
      setPushStatus(data?.data as PushStatus);
    } catch (e) {
      if (__DEV__) console.warn('[notif] push status fail', e);
      setPushStatus({ registered: false, tokenPreview: null, tokenUpdatedAt: null });
    }
  }, []);

  const sendTestPush = useCallback(async () => {
    if (testingPush) return;
    setTestingPush(true);
    try {
      const { data } = await api.post('/notifications/test');
      Alert.alert(
        '✓ Push enviado',
        (data?.message ?? 'Si no lo recibís en pocos segundos, revisá los permisos del sistema.') +
          (data?.data?.tokenPreview ? `\n\nToken: ${data.data.tokenPreview}` : ''),
      );
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { error?: { message?: string; code?: string } } } })
        ?.response?.data?.error;
      Alert.alert(
        'No se pudo enviar',
        res?.message ?? 'Error desconocido al enviar la notificación de prueba.',
      );
    } finally {
      setTestingPush(false);
      await loadPushStatus();
    }
  }, [testingPush, loadPushStatus]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 50 } });
      setItems((data?.data?.items ?? []) as NotificationItem[]);
    } catch (e) {
      if (__DEV__) console.warn('[notif] load fail', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    load();
    loadPushStatus();
  }, [user, load, loadPushStatus, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadPushStatus()]);
    await refreshGlobal();
    setRefreshing(false);
  };

  const handleOpen = async (item: NotificationItem) => {
    // Marca como leída si no lo está, luego navega si data.url existe.
    if (!item.read) {
      try {
        await api.patch(`/notifications/${item._id}`, { read: true });
        setItems((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, read: true } : n))
        );
        refreshGlobal();
      } catch (e) {
        if (__DEV__) console.warn('[notif] mark read fail', e);
      }
    }
    const url = item.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) {
      router.push(url as never);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      refreshGlobal();
    } catch (e) {
      if (__DEV__) console.warn('[notif] mark all fail', e);
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEyebrow}>NOTIFICACIONES</Text>
          <Text style={s.headerTitle}>Tus alertas</Text>
        </View>
        {hasUnread ? (
          <TouchableOpacity
            style={s.markAllBtn}
            onPress={handleMarkAll}
            disabled={markingAll}
            activeOpacity={0.85}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primaryDark} />
            ) : (
              <Text style={s.markAllText}>Marcar leídas</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {pushStatus !== null ? (
          <View style={[s.pushCard, !pushStatus.registered && s.pushCardWarn]}>
            <View style={s.pushCardRow}>
              <View
                style={[
                  s.pushDot,
                  { backgroundColor: pushStatus.registered ? colors.primary : colors.warn },
                ]}
              />
              <Text style={s.pushTitle}>
                {pushStatus.registered ? 'Notificaciones activas' : 'Notificaciones inactivas'}
              </Text>
            </View>
            <Text style={s.pushDesc}>
              {pushStatus.registered
                ? 'Tu dispositivo está registrado. Tocá el botón para enviarte un push de prueba.'
                : 'Tu dispositivo no se registró todavía. Asegurate de:\n• Estar en un dispositivo físico (no emulador).\n• Haber aceptado los permisos.\n• Tener Internet al abrir la app.'}
            </Text>
            <TouchableOpacity
              style={[s.pushBtn, !pushStatus.registered && s.pushBtnDisabled]}
              onPress={sendTestPush}
              disabled={!pushStatus.registered || testingPush}
              activeOpacity={0.85}
            >
              {testingPush ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="send" size={14} color="#FFFFFF" />
                  <Text style={s.pushBtnText}>Enviar push de prueba</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? (
          <View style={s.empty}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="bell-off" size={22} color={colors.primary} />
            </View>
            <Text style={s.emptyTitle}>Sin notificaciones</Text>
            <Text style={s.emptyDesc}>
              Cuando haya recolección, retrasos o novedades de tus reportes, aparecerán acá.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const meta = KIND_META[item.kind] ?? KIND_META.system;
            return (
              <TouchableOpacity
                key={item._id}
                style={[s.item, !item.read && s.itemUnread]}
                activeOpacity={0.85}
                onPress={() => handleOpen(item)}
              >
                <View style={[s.itemIcon, { backgroundColor: `${meta.color}14`, borderColor: `${meta.color}44` }]}>
                  <Feather name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.itemHeader}>
                    <Text style={[s.itemTitle, !item.read && s.itemTitleUnread]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={s.itemTime}>{relativeTime(item.createdAt)}</Text>
                  </View>
                  <Text style={s.itemBody} numberOfLines={3}>
                    {item.body}
                  </Text>
                </View>
                {!item.read ? <View style={s.unreadDot} /> : null}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 9.5,
    color: colors.textMuted,
    letterSpacing: 1.4,
  },
  headerTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 22,
    marginTop: 1,
  },
  markAllBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  markAllText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },

  content: { paddingHorizontal: 14, paddingTop: 12 },

  pushCard: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  pushCardWarn: {
    backgroundColor: colors.warnSoft,
    borderColor: colors.warnBorder,
    borderLeftColor: colors.warn,
  },
  pushCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pushDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pushTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  pushDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  pushBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
  pushBtnDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  pushBtnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
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
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptyDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
  },
  itemUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.bgSoft,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  itemTitleUnread: {
    fontFamily: fontFamily.sansBold,
  },
  itemTime: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  itemBody: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});

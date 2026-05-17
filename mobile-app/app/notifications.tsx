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

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh: refreshGlobal } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

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
  }, [user, load, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
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

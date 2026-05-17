import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { getZoneName } from '../../src/utils/zone';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { AppHeader } from '../../src/components/layout/AppShell';

export default function OperatorProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [completedWeek, setCompletedWeek] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/route-executions', {
        params: { operator: 'me', status: 'completed' },
      });
      const list: { startedAt: string }[] = data.data || [];
      const now = new Date();
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const count = list.filter((e) => new Date(e.startedAt).getTime() >= monday.getTime()).length;
      setCompletedWeek(count);
    } catch {
      setCompletedWeek(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const roleLabel =
    user?.role === 'admin'
      ? 'Administrador'
      : user?.role === 'operator'
        ? 'Operador'
        : 'Conductor';

  return (
    <View style={s.container}>
    <AppHeader title="Mi perfil" section="Conductor" />
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.profileCard}>
        <View style={s.avatarBox}>
          <Text style={s.avatarText}>{initials || 'O'}</Text>
        </View>
        <Text style={s.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={s.email}>{user?.email}</Text>

        <View style={s.badge}>
          <Feather name="truck" size={11} color={colors.primaryDark} />
          <Text style={s.badgeText}>{roleLabel}</Text>
        </View>
      </View>

      <View style={s.statBox}>
        <View style={s.statHeader}>
          <Feather name="check-circle" size={13} color={colors.primary} />
          <Text style={s.statLabel}>Jornadas esta semana</Text>
        </View>
        <Text style={s.statNum}>{completedWeek ?? '—'}</Text>
      </View>

      <Text style={s.sectionTitle}>Datos personales</Text>
      <View style={s.card}>
        <InfoRow label="DNI" value={user?.dni || '—'} />
        <View style={s.separator} />
        <InfoRow label="Teléfono" value={user?.phone || '—'} />
        <View style={s.separator} />
        <InfoRow label="Dirección" value={user?.address || '—'} />
        <View style={s.separator} />
        <InfoRow label="Zona" value={getZoneName(user?.zone) || 'Por asignar'} />
      </View>

      <TouchableOpacity
        style={s.editBtn}
        onPress={() => router.push('/profile-edit')}
        activeOpacity={0.85}
      >
        <Feather name="edit-2" size={13} color={colors.primaryDark} />
        <Text style={s.editBtnText}>Editar mi perfil</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Configuración</Text>
      <View style={s.card}>
        <View style={s.menuItem}>
          <View style={s.menuItemLeft}>
            <Feather name="bell" size={14} color={colors.textSecondary} />
            <Text style={s.menuItemText}>Notificaciones</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </View>
        <View style={s.separator} />
        <View style={s.menuItem}>
          <View style={s.menuItemLeft}>
            <Feather name="shield" size={14} color={colors.textSecondary} />
            <Text style={s.menuItemText}>Privacidad y términos</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Feather name="log-out" size={14} color={colors.danger} />
        <Text style={s.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md },

  profileCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 22,
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  name: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    fontWeight: '500',
    color: colors.ink,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  email: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    color: colors.primaryDark,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  statBox: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  statNum: {
    fontFamily: fontFamily.serif,
    color: colors.primary,
    fontSize: 30,
    fontWeight: '500',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  infoLabel: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 13,
    maxWidth: '55%',
  },
  separator: { height: 1, backgroundColor: colors.borderSoft },

  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuItemText: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.ink,
    fontSize: 13.5,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  logoutBtnText: {
    color: colors.danger,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    paddingVertical: 11,
    borderRadius: radius.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  editBtnText: {
    color: colors.primaryDark,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
});

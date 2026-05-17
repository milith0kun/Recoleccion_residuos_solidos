import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { AppHeader } from '../../src/components/layout/AppShell';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { getZoneName } from '../../src/utils/zone';

export default function PlannerProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que querés salir?', [
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

  return (
    <View style={s.container}>
      <AppHeader title="Mi perfil" section="Operador" />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials || 'O'}</Text>
          </View>
          <Text style={s.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.badge}>
            <Feather name="briefcase" size={11} color={colors.primaryDark} />
            <Text style={s.badgeText}>Operador (Planificación)</Text>
          </View>
        </View>

        <Text style={s.label}>Datos personales</Text>
        <View style={s.list}>
          <InfoRow label="DNI" value={user?.dni || '—'} />
          <View style={s.sep} />
          <InfoRow label="Teléfono" value={user?.phone || '—'} />
          <View style={s.sep} />
          <InfoRow label="Zona" value={getZoneName(user?.zone) || 'Toda la ciudad'} />
        </View>

        <TouchableOpacity
          style={s.editBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/profile-edit')}
        >
          <Feather name="edit-2" size={13} color={colors.primaryDark} />
          <Text style={s.editBtnText}>Editar mi perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} activeOpacity={0.85} onPress={handleLogout}>
          <Feather name="log-out" size={14} color={colors.danger} />
          <Text style={s.logoutBtnText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 22,
    color: colors.primaryDark,
  },
  name: {
    fontFamily: fontFamily.serif,
    fontSize: 20,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  email: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primaryDark,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  list: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowLabel: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowValue: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: colors.ink,
    maxWidth: '55%',
  },
  sep: { height: 1, backgroundColor: colors.borderSoft },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  editBtnText: {
    color: colors.primaryDark,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 12.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginTop: spacing.md,
  },
  logoutBtnText: {
    color: colors.danger,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
  },
});

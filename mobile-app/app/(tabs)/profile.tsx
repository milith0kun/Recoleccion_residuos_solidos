import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { colors, fontFamily, radius, spacing } from '../../src/theme/tokens';
import { getZoneName } from '../../src/utils/zone';
import { AppHeader } from '../../src/components/layout/AppShell';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);

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

  const handlePrivacy = () => {
    Alert.alert(
      'Privacidad y términos',
      'SRSS Cusco usa tu ubicación sólo durante el rastreo de rutas. Los datos personales están protegidos según la Ley N.° 29733 de Protección de Datos Personales del Perú.',
      [{ text: 'Entendido' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Soporte',
      '¿Tenés problemas con la app o querés reportar una incidencia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Llamar a la Municipalidad',
          onPress: () => Linking.openURL('tel:+5184227777'),
        },
      ]
    );
  };

  const roleLabel =
    user?.role === 'citizen'
      ? 'Ciudadano'
      : user?.role === 'driver'
      ? 'Conductor'
      : user?.role === 'operator'
      ? 'Operador'
      : user?.role === 'admin'
      ? 'Administrador'
      : 'Ciudadano';

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <View style={s.container}>
    <AppHeader title="Mi perfil" section="Ciudadano" />
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>Tu cuenta · SRSS</Text>
      <Text style={s.pageTitle}>Mi perfil</Text>
      <Text style={s.pageSub}>Cuenta, datos y preferencias.</Text>

      <View style={s.profileCard}>
        <View style={s.avatarBox}>
          <Text style={s.avatarText}>{initials || 'U'}</Text>
        </View>
        <Text style={s.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{roleLabel}</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Datos personales</Text>
      <View style={s.card}>
        <InfoRow label="DNI" value={user?.dni || '—'} />
        <View style={s.separator} />
        <InfoRow label="Zona asignada" value={getZoneName(user?.zone) || 'Por asignar'} />
        {user?.phone ? (
          <>
            <View style={s.separator} />
            <InfoRow label="Teléfono" value={user.phone} />
          </>
        ) : null}
        {user?.address ? (
          <>
            <View style={s.separator} />
            <InfoRow label="Dirección" value={user.address} />
          </>
        ) : null}
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
            <Feather name="bell" size={15} color={colors.textSecondary} />
            <Text style={s.menuItemText}>Notificaciones</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.border, true: colors.primaryBorder }}
            thumbColor={pushEnabled ? colors.primary : '#FFFFFF'}
            ios_backgroundColor={colors.border}
          />
        </View>
        <View style={s.separator} />
        <TouchableOpacity style={s.menuItem} onPress={handlePrivacy} activeOpacity={0.7}>
          <View style={s.menuItemLeft}>
            <Feather name="shield" size={15} color={colors.textSecondary} />
            <Text style={s.menuItemText}>Privacidad y términos</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.menuItem} onPress={handleSupport} activeOpacity={0.7}>
          <View style={s.menuItemLeft}>
            <Feather name="help-circle" size={15} color={colors.textSecondary} />
            <Text style={s.menuItemText}>Soporte</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={s.versionBox}>
        <Text style={s.versionText}>SRSS Cusco · MVP v1.0.0</Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Feather name="log-out" size={14} color={colors.danger} />
        <Text style={s.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
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
    marginBottom: 4,
  },
  pageSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  profileCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
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
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  sectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
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
    fontSize: 12.5,
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

  versionBox: { alignItems: 'center', marginBottom: spacing.md, marginTop: 4 },
  versionText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.4,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
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
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
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

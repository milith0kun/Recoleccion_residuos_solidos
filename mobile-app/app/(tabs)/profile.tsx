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
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../../src/theme/tokens';
import { getZoneName } from '../../src/utils/zone';

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
      'Privacidad y Términos',
      'SRSS Cusco usa tu ubicación sólo durante el rastreo de rutas. Los datos personales están protegidos según la Ley N.° 29733 de Protección de Datos Personales del Perú.',
      [{ text: 'Entendido' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Soporte',
      '¿Tienes problemas con la app o quieres reportar una incidencia?',
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
      : user?.role === 'operator'
      ? 'Operador'
      : user?.role === 'admin'
      ? 'Administrador'
      : 'Usuario';

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>Mi Perfil</Text>
      <Text style={s.pageSub}>Tu cuenta y preferencias en SRSS Cusco.</Text>

      <LinearGradient
        colors={['rgba(16,185,129,0.22)', 'rgba(15,23,42,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.profileCard}
      >
        <View style={s.avatarRing}>
          <View style={s.avatarBox}>
            <Text style={s.avatarText}>{initials || 'U'}</Text>
          </View>
        </View>
        <Text style={s.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={s.email}>{user?.email}</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{roleLabel}</Text>
        </View>
      </LinearGradient>

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
        <Text style={s.editBtnText}>Editar mi perfil</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Configuración</Text>
      <View style={s.card}>
        <View style={s.menuItem}>
          <Text style={s.menuItemText}>Notificaciones</Text>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.border, true: 'rgba(16,185,129,0.45)' }}
            thumbColor={pushEnabled ? colors.primary : colors.textMuted}
          />
        </View>
        <View style={s.separator} />
        <TouchableOpacity style={s.menuItem} onPress={handlePrivacy} activeOpacity={0.7}>
          <Text style={s.menuItemText}>Privacidad y términos</Text>
          <Text style={s.menuArrow}>›</Text>
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.menuItem} onPress={handleSupport} activeOpacity={0.7}>
          <Text style={s.menuItemText}>Soporte</Text>
          <Text style={s.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={s.versionBox}>
        <Text style={s.versionText}>SRSS Cusco · MVP v1.0.0</Text>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Text style={s.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
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
  content: { padding: spacing.xxl, paddingTop: 60, paddingBottom: 40 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.xl, fontWeight: '500' },

  profileCard: {
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: colors.primary, letterSpacing: -0.5 },
  name: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, marginBottom: 4, letterSpacing: -0.3 },
  email: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, fontWeight: '500' },
  badge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  badgeText: { color: colors.info, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  infoLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  infoValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', maxWidth: '55%' },

  separator: { height: 1, backgroundColor: colors.borderSoft },

  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  menuArrow: { color: colors.textFaint, fontSize: 24, fontWeight: '300' },

  versionBox: { alignItems: 'center', marginBottom: spacing.lg, marginTop: 4 },
  versionText: { color: colors.textFaint, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  logoutBtn: {
    backgroundColor: colors.dangerSoft,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  logoutBtnText: { color: colors.danger, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },

  editBtn: {
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: -spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  editBtnText: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});

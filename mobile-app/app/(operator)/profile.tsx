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

export default function OperatorProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [completedWeek, setCompletedWeek] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    try {
      // Best-effort: list completed executions, filter to current week
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

  return (
    <ScrollView style={s.container}>
      <View style={s.profileCard}>
        <View style={s.avatarBox}>
          <Text style={s.avatarText}>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={s.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={s.email}>{user?.email}</Text>

        <View style={s.badge}>
          <Feather name="truck" size={11} color="#10B981" />
          <Text style={s.badgeText}>
            {user?.role === 'admin' ? 'Administrador' : 'Operador'}
          </Text>
        </View>
      </View>

      <View style={s.statRow}>
        <View style={s.statBox}>
          <Text style={s.statNum}>{completedWeek ?? '—'}</Text>
          <Text style={s.statLabel}>Jornadas esta semana</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Datos personales</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>DNI</Text>
          <Text style={s.infoValue}>{user?.dni || '—'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Teléfono</Text>
          <Text style={s.infoValue}>{user?.phone || '—'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Dirección</Text>
          <Text style={s.infoValue}>{user?.address || '—'}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Zona</Text>
          <Text style={s.infoValue}>{user?.zone || 'Por asignar'}</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Configuración</Text>
        <View style={s.menuItem}>
          <Feather name="bell" size={16} color="#94A3B8" />
          <Text style={s.menuItemText}>Notificaciones</Text>
          <Text style={s.menuItemArrow}>›</Text>
        </View>
        <View style={s.menuItem}>
          <Feather name="shield" size={16} color="#94A3B8" />
          <Text style={s.menuItemText}>Privacidad y términos</Text>
          <Text style={s.menuItemArrow}>›</Text>
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={16} color="#EF4444" />
        <Text style={s.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#10B981' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 4 },
  email: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  badgeText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

  statRow: { flexDirection: 'row', marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNum: { color: '#10B981', fontWeight: '900', fontSize: 30, letterSpacing: -0.5 },
  statLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
    borderRadius: 0,
  },
  infoLabel: { color: '#94A3B8', fontSize: 14 },
  infoValue: { color: '#F8FAFC', fontSize: 14, fontWeight: '500' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  menuItemText: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  menuItemArrow: { color: '#64748B', fontSize: 20 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  logoutBtnText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
});

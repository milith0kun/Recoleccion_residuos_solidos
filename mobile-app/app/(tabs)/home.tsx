import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import api from '../../src/api/client';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ routes: 0, vehicles: 0 });

  const loadData = async () => {
    try {
      const [resRoutes, resVehicles] = await Promise.all([
        api.get('/routes'),
        api.get('/vehicles'),
      ]);
      setStats({
        routes: resRoutes.data.data?.length || 0,
        vehicles: resVehicles.data.data?.length || 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
    >
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Hola, {user?.firstName}</Text>
          <Text style={s.subGreeting}>Bienvenido a SRSS Cusco</Text>
        </View>
        <View style={s.avatarBox}>
          <Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
        </View>
      </View>

      <LinearGradient colors={['#1E293B', '#0F172A']} style={s.statusCard}>
        <View style={s.statusHeader}>
          <View style={s.statusIconBox}>
            <Feather name="truck" size={24} color="#10B981" />
          </View>
          <View>
            <Text style={s.statusTitle}>Próxima Recolección</Text>
            <Text style={s.statusDesc}>Tu zona está programada para hoy</Text>
          </View>
        </View>
        <View style={s.timeBox}>
          <Text style={s.timeText}>14:00 - 16:30</Text>
          <Text style={s.timeLabel}>Horario estimado</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={() => router.push('/(tabs)/map')}>
          <Text style={s.btnText}>Rastrear en el mapa</Text>
          <Feather name="map-pin" size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </LinearGradient>

      <Text style={s.sectionTitle}>Acciones Rápidas</Text>
      <View style={s.grid}>
        <TouchableOpacity style={s.gridItem} onPress={() => router.push('/(tabs)/schedule')}>
          <View style={[s.gridIconBox, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
            <Feather name="calendar" size={24} color="#3B82F6" />
          </View>
          <Text style={s.gridText}>Horarios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.gridItem} onPress={() => router.push('/(tabs)/education')}>
          <View style={[s.gridIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <Feather name="trash-2" size={24} color="#10B981" />
          </View>
          <Text style={s.gridText}>Guía de reciclaje</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.gridItem} onPress={() => router.push('/(tabs)/profile')}>
          <View style={[s.gridIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <Feather name="user" size={24} color="#F59E0B" />
          </View>
          <Text style={s.gridText}>Mi perfil</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/(tabs)/education')} activeOpacity={0.85} style={{ marginBottom: 32 }}>
        <LinearGradient colors={['#1E293B', '#0F172A']} style={s.eduCard}>
          <View style={s.eduHeader}>
            <View style={[s.statusIconBox, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Feather name="book-open" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statusTitle}>Guía de Reciclaje</Text>
              <Text style={s.eduSubtitle}>Aprende a separar tus residuos · NTP 900.058</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748B" />
          </View>
          <View style={s.eduChips}>
            <View style={[s.eduChip, { borderColor: 'rgba(146,64,14,0.5)', backgroundColor: 'rgba(146,64,14,0.15)' }]}>
              <Text style={[s.eduChipText, { color: '#D97706' }]}>Orgánico</Text>
            </View>
            <View style={[s.eduChip, { borderColor: 'rgba(59,130,246,0.5)', backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Text style={[s.eduChipText, { color: '#3B82F6' }]}>Reciclable</Text>
            </View>
            <View style={[s.eduChip, { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Text style={[s.eduChipText, { color: '#EF4444' }]}>Peligroso</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Resumen de la ciudad</Text>
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statNum}>{stats.routes}</Text>
          <Text style={s.statLabel}>Rutas activas</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statNum}>{stats.vehicles}</Text>
          <Text style={s.statLabel}>Camiones</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: '900', color: '#F8FAFC', marginBottom: 4, letterSpacing: -0.5 },
  subGreeting: { fontSize: 15, color: '#94A3B8', fontWeight: '500' },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16,185,129,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#10B981' },
  statusCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155', marginBottom: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  statusTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  statusDesc: { fontSize: 14, color: '#10B981', marginTop: 2, fontWeight: '500' },
  timeBox: { backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(51,65,85,0.5)' },
  timeText: { fontSize: 28, fontWeight: '900', color: '#3B82F6', marginBottom: 4, letterSpacing: -0.5 },
  timeLabel: { fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 },
  btn: { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC', marginBottom: 16 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, gap: 12 },
  gridItem: { backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 20, padding: 16, alignItems: 'center', flex: 1, borderWidth: 1, borderColor: '#334155' },
  gridIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gridText: { fontSize: 12, color: '#F8FAFC', fontWeight: '600', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  statBox: { flex: 1, backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' },
  statNum: { fontSize: 36, fontWeight: '900', color: '#3B82F6', marginBottom: 4, letterSpacing: -1 },
  statLabel: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  eduCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155' },
  eduHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  eduSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  eduChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  eduChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  eduChipText: { fontSize: 11, fontWeight: '700' },
});

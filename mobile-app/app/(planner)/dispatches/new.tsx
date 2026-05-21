import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../../src/api/client';
import { AppHeader } from '../../../src/components/layout/AppShell';
import { colors, fontFamily, radius, spacing } from '../../../src/theme/tokens';

interface RouteItem {
  _id: string;
  name: string;
  zone?: { name?: string };
  vehicle?: { _id?: string; plate?: string };
  schedule?: { startTime?: string };
}

interface VehicleItem {
  _id: string;
  plate: string;
  type: 'compactor' | 'open_truck' | 'mini_truck';
  status: 'available' | 'in_route' | 'maintenance' | 'inactive';
}

interface DriverItem {
  _id: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

function defaultDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function defaultTimeString(): string {
  return '06:00';
}

export default function NewDispatchScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [routeId, setRouteId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDateString());
  const [time, setTime] = useState(defaultTimeString());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [routesRes, usersRes, vehiclesRes] = await Promise.all([
          api.get('/routes', { params: { status: 'active' } }),
          api.get('/users', { params: { role: 'driver' } }),
          api.get('/vehicles'),
        ]);
        setRoutes((routesRes.data?.data ?? []) as RouteItem[]);
        const userPayload = usersRes.data?.data;
        const rawDrivers = Array.isArray(userPayload)
          ? userPayload
          : Array.isArray(userPayload?.users)
            ? userPayload.users
            : [];
        const ds = (rawDrivers as DriverItem[]).filter(
          (u) => u.role === 'driver' || u.role === 'operator' || u.role === 'admin'
        );
        setDrivers(ds);
        setVehicles((vehiclesRes.data?.data ?? []) as VehicleItem[]);
      } catch (e) {
        if (__DEV__) console.warn('[new dispatch] load fail', e);
        Alert.alert(
          'No se pudo cargar',
          'Verificá tu conexión. Si el problema persiste, contactá al administrador.'
        );
      } finally {
        setLoadingLists(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!routeId) return;
    const selectedRoute = routes.find((r) => r._id === routeId);
    if (selectedRoute?.vehicle?._id) {
      setVehicleId(selectedRoute.vehicle._id);
    }
  }, [routeId, routes]);

  const validate = (): string | null => {
    if (!routeId) return 'Elegí una ruta';
    if (!driverId) return 'Elegí un conductor';
    if (!vehicleId) return 'Elegí un vehículo';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Fecha inválida (YYYY-MM-DD)';
    if (!/^\d{2}:\d{2}$/.test(time)) return 'Hora inválida (HH:MM)';
    const parsed = new Date(`${date}T${time}:00`);
    if (Number.isNaN(parsed.getTime())) return 'Fecha/hora inválida';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Datos incompletos', err);
      return;
    }
    setSubmitting(true);
    try {
      const scheduledFor = new Date(`${date}T${time}:00`).toISOString();
      const { data } = await api.post('/dispatches', {
        routeId,
        driverId,
        vehicleId,
        scheduledFor,
        notes: notes.trim() || undefined,
      });
      const code = data?.data?.code ?? '—';
      Alert.alert(
        '¡Salida asignada!',
        `Código: ${code}\nEl conductor ya recibió la notificación.`,
        [{ text: 'OK', onPress: () => router.replace('/(planner)/dispatches') }]
      );
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message || 'No se pudo asignar';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <AppHeader title="Asignar salida" section="Operador" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.eyebrow}>Nueva salida</Text>
        <Text style={s.title}>Programar jornada</Text>
        <Text style={s.sub}>
          Elegí una ruta activa, asigná un conductor y fijá la fecha y hora prevista. El conductor
          recibirá la notificación inmediatamente.
        </Text>

        <Text style={s.label}>Ruta</Text>
        {loadingLists ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
        ) : routes.length === 0 ? (
          <Text style={s.muted}>No hay rutas activas. Pedile al admin que active una.</Text>
        ) : (
          <View style={s.optionGroup}>
            {routes.map((r) => {
              const active = routeId === r._id;
              return (
                <TouchableOpacity
                  key={r._id}
                  style={[s.optionRow, active && s.optionRowActive]}
                  activeOpacity={0.85}
                  onPress={() => setRouteId(r._id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionTitle, active && s.optionTitleActive]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={s.optionMeta} numberOfLines={1}>
                      {r.zone?.name ? `Zona: ${r.zone.name}` : 'Sin zona'}
                      {r.schedule?.startTime ? ` · ${r.schedule.startTime}` : ''}
                      {r.vehicle?.plate ? ` · ${r.vehicle.plate}` : ''}
                    </Text>
                  </View>
                  <Feather
                    name={active ? 'check-circle' : 'circle'}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={s.label}>Conductor</Text>
        {loadingLists ? null : drivers.length === 0 ? (
          <Text style={s.muted}>No hay conductores registrados.</Text>
        ) : (
          <View style={s.optionGroup}>
            {drivers.map((d) => {
              const active = driverId === d._id;
              const name = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || 'Conductor';
              return (
                <TouchableOpacity
                  key={d._id}
                  style={[s.optionRow, active && s.optionRowActive]}
                  activeOpacity={0.85}
                  onPress={() => setDriverId(d._id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionTitle, active && s.optionTitleActive]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={s.optionMeta}>{d.role}</Text>
                  </View>
                  <Feather
                    name={active ? 'check-circle' : 'circle'}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={s.label}>Vehículo</Text>
        {loadingLists ? null : vehicles.length === 0 ? (
          <Text style={s.muted}>No hay vehículos activos registrados.</Text>
        ) : (
          <View style={s.optionGroup}>
            {vehicles.map((v) => {
              const active = vehicleId === v._id;
              return (
                <TouchableOpacity
                  key={v._id}
                  style={[s.optionRow, active && s.optionRowActive]}
                  activeOpacity={0.85}
                  onPress={() => setVehicleId(v._id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionTitle, active && s.optionTitleActive]} numberOfLines={1}>
                      {v.plate}
                    </Text>
                    <Text style={s.optionMeta}>
                      {v.type} · {v.status === 'available' ? 'Disponible' : v.status}
                    </Text>
                  </View>
                  <Feather
                    name={active ? 'check-circle' : 'circle'}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={s.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Fecha</Text>
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="none"
            />
          </View>
          <View style={{ width: 110 }}>
            <Text style={s.label}>Hora</Text>
            <TextInput
              style={s.input}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text style={s.label}>Notas (opcional)</Text>
        <TextInput
          style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Instrucciones para el conductor"
          placeholderTextColor={colors.textPlaceholder}
        />

        <TouchableOpacity
          style={[s.submit, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={14} color="#FFFFFF" />
              <Text style={s.submitText}>Asignar salida</Text>
            </>
          )}
        </TouchableOpacity>

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
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 28,
    marginTop: 4,
  },
  sub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 14,
  },
  optionGroup: { gap: 6 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
  },
  optionTitleActive: { color: colors.primaryDark },
  optionMeta: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  muted: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12.5,
    color: colors.textMuted,
    paddingVertical: 12,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  submitText: { color: '#FFFFFF', fontFamily: fontFamily.sansSemibold, fontSize: 14 },
});

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  UIManager,
  KeyboardTypeOptions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import api from '../src/api/client';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DetectedZone {
  id: string;
  name: string;
  color: string;
}

type DetectionStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

interface FormState {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}

interface FieldConfig {
  key: keyof FormState;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  placeholder: string;
  keyboard?: KeyboardTypeOptions;
  secure?: boolean;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [detectedZone, setDetectedZone] = useState<DetectedZone | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('idle');
  const [detectionMessage, setDetectionMessage] = useState<string>('');
  const chipScale = useRef(new Animated.Value(0)).current;

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (detectionStatus === 'found' || detectionStatus === 'notfound' || detectionStatus === 'error') {
      Animated.spring(chipScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }).start();
    } else {
      chipScale.setValue(0);
    }
  }, [detectionStatus, chipScale]);

  const handleDetectZone = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDetectionStatus('loading');
    setDetectedZone(null);
    setDetectionMessage('');

    try {
      let payload: { address?: string; lat?: number; lng?: number } | null = null;

      if (form.address.trim().length > 0) {
        payload = { address: form.address.trim() };
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setDetectionStatus('error');
          setDetectionMessage('Permiso de ubicación denegado. Escribe tu dirección o habilita el GPS.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        payload = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      const { data } = await api.post('/zones/detect', payload);
      const zone = data?.data?.zone as { _id: string; name: string; color: string } | null;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (zone) {
        setDetectedZone({ id: zone._id, name: zone.name, color: zone.color || '#10B981' });
        setDetectionStatus('found');
      } else {
        setDetectionStatus('notfound');
        setDetectionMessage('Zona pendiente — un administrador la asignará');
      }
    } catch (err: unknown) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDetectionStatus('error');
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : 'No se pudo detectar la zona';
      setDetectionMessage(message);
    }
  };

  const handleRegister = async () => {
    const { firstName, lastName, dni, email, password, address } = form;
    if (!firstName || !lastName || !dni || !email || !password || !address) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }
    if (!/^\d{8}$/.test(dni)) {
      Alert.alert('Error', 'El DNI debe tener 8 dígitos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = { ...form };
      if (detectedZone) payload.zone = detectedZone.id;
      await register(payload);
      router.replace('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      Alert.alert('Error', e.response?.data?.error?.message || e.message || 'Error de registro');
    } finally {
      setLoading(false);
    }
  };

  const fields: FieldConfig[] = [
    { key: 'firstName', icon: 'user', label: 'Nombres *', placeholder: 'Juan' },
    { key: 'lastName', icon: 'user', label: 'Apellidos *', placeholder: 'Pérez García' },
    { key: 'dni', icon: 'credit-card', label: 'DNI *', placeholder: '12345678', keyboard: 'numeric' },
    { key: 'email', icon: 'mail', label: 'Correo electrónico *', placeholder: 'correo@ejemplo.com', keyboard: 'email-address' },
    { key: 'password', icon: 'lock', label: 'Contraseña *', placeholder: '••••••••', secure: true },
    { key: 'phone', icon: 'phone', label: 'Teléfono', placeholder: '984111222', keyboard: 'phone-pad' },
  ];

  const renderZoneChip = () => {
    if (detectionStatus === 'idle') return null;

    if (detectionStatus === 'loading') {
      return (
        <View style={[s.chipBase, s.chipLoading]}>
          <ActivityIndicator size="small" color="#94A3B8" />
          <Text style={s.chipLoadingText}>Detectando tu zona...</Text>
        </View>
      );
    }

    if (detectionStatus === 'found' && detectedZone) {
      const color = detectedZone.color;
      return (
        <Animated.View style={{ transform: [{ scale: chipScale }] }}>
          <LinearGradient
            colors={[`${color}30`, `${color}10`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.chipBase, { borderColor: `${color}80` }]}
          >
            <View style={[s.chipDot, { backgroundColor: color }]} />
            <Feather name="check-circle" size={14} color={color} style={{ marginRight: 6 }} />
            <Text style={[s.chipText, { color }]}>Tu zona: {detectedZone.name}</Text>
          </LinearGradient>
        </Animated.View>
      );
    }

    if (detectionStatus === 'notfound') {
      return (
        <Animated.View style={{ transform: [{ scale: chipScale }] }}>
          <LinearGradient
            colors={['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.chipBase, { borderColor: 'rgba(245,158,11,0.6)' }]}
          >
            <Feather name="alert-triangle" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={[s.chipText, { color: '#F59E0B' }]}>{detectionMessage}</Text>
          </LinearGradient>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={{ transform: [{ scale: chipScale }] }}>
        <View style={[s.chipBase, { borderColor: 'rgba(239,68,68,0.6)', backgroundColor: 'rgba(239,68,68,0.12)' }]}>
          <Feather name="x-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
          <Text style={[s.chipText, { color: '#EF4444' }]}>{detectionMessage}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.title}>Crear Cuenta</Text>
            <Text style={s.subtitle}>Regístrate como ciudadano</Text>
          </View>
        </View>

        <View style={s.card}>
          {fields.map((f) => (
            <View key={f.key} style={s.fieldGroup}>
              <Text style={s.label}>{f.label}</Text>
              <View style={s.inputContainer}>
                <Feather name={f.icon} size={18} color="#64748B" style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#64748B"
                  value={form[f.key]}
                  onChangeText={(v) => update(f.key, v)}
                  keyboardType={f.keyboard || 'default'}
                  secureTextEntry={f.secure}
                  autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                />
              </View>
            </View>
          ))}

          {/* Address with detect zone button */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Dirección *</Text>
            <View style={s.inputContainer}>
              <Feather name="map-pin" size={18} color="#64748B" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Av. Sol 123, Cusco"
                placeholderTextColor="#64748B"
                value={form.address}
                onChangeText={(v) => update('address', v)}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={s.detectBtn}
              onPress={handleDetectZone}
              disabled={detectionStatus === 'loading'}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.detectBtnInner}
              >
                <Feather
                  name={form.address.trim().length === 0 ? 'navigation' : 'search'}
                  size={14}
                  color="#10B981"
                  style={{ marginRight: 6 }}
                />
                <Text style={s.detectBtnText}>
                  {form.address.trim().length === 0 ? 'Detectar con GPS' : 'Detectar mi zona'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.chipWrap}>{renderZoneChip()}</View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={s.btnText}>{loading ? 'Registrando...' : 'Completar Registro'}</Text>
            {!loading && <Feather name="check-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={s.linkBtn}>
            <Text style={s.linkText}>
              ¿Ya tienes cuenta? <Text style={{ color: '#10B981', fontWeight: 'bold' }}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#0F172A', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(30,41,59,0.8)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginRight: 16,
  },
  headerText: { flex: 1 },
  title: { fontSize: 26, fontWeight: '900', color: '#10B981', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  card: {
    backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 24, padding: 28, borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.8)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: '#94A3B8', marginBottom: 8, fontWeight: '600', marginLeft: 4 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A',
    borderWidth: 1, borderColor: '#334155', borderRadius: 16, paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 12, color: '#F8FAFC', fontSize: 15 },
  btn: {
    backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    marginTop: 12, flexDirection: 'row', justifyContent: 'center', shadowColor: '#10B981',
    shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#94A3B8', fontSize: 14 },
  detectBtn: { alignSelf: 'flex-start', marginTop: 10 },
  detectBtnInner: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
  },
  detectBtnText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  chipWrap: { marginTop: 10, flexDirection: 'row' },
  chipBase: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1,
  },
  chipLoading: { backgroundColor: 'rgba(148,163,184,0.1)', borderColor: 'rgba(148,163,184,0.3)' },
  chipLoadingText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginLeft: 8 },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
});

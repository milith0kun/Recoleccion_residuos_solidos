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
import * as Location from 'expo-location';
import api from '../src/api/client';
import { colors, fontFamily, radius, spacing } from '../src/theme/tokens';

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
  const [showPassword, setShowPassword] = useState(false);
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
          setDetectionMessage('Permiso de ubicación denegado. Escribí tu dirección o habilitá el GPS.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        payload = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }

      const { data } = await api.post('/zones/detect', payload);
      const zone = data?.data?.zone as { _id: string; name: string; color: string } | null;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (zone) {
        setDetectedZone({ id: zone._id, name: zone.name, color: zone.color || colors.primary });
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
      Alert.alert('Error', 'Completá todos los campos obligatorios');
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
    { key: 'firstName', icon: 'user', label: 'Nombres', placeholder: 'Juan' },
    { key: 'lastName', icon: 'user', label: 'Apellidos', placeholder: 'Pérez García' },
    { key: 'dni', icon: 'credit-card', label: 'DNI', placeholder: '12345678', keyboard: 'numeric' },
    { key: 'email', icon: 'mail', label: 'Correo electrónico', placeholder: 'correo@ejemplo.com', keyboard: 'email-address' },
    { key: 'password', icon: 'lock', label: 'Contraseña', placeholder: '••••••••', secure: true },
    { key: 'phone', icon: 'phone', label: 'Teléfono (opcional)', placeholder: '984111222', keyboard: 'phone-pad' },
  ];

  const renderZoneChip = () => {
    if (detectionStatus === 'idle') return null;

    if (detectionStatus === 'loading') {
      return (
        <View style={[s.chipBase, s.chipLoading]}>
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={s.chipLoadingText}>Detectando tu zona...</Text>
        </View>
      );
    }

    if (detectionStatus === 'found' && detectedZone) {
      const color = detectedZone.color;
      return (
        <Animated.View style={{ transform: [{ scale: chipScale }] }}>
          <View style={[s.chipBase, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
            <Feather name="check-circle" size={13} color={color} style={{ marginRight: 6 }} />
            <Text style={[s.chipText, { color }]}>Tu zona: {detectedZone.name}</Text>
          </View>
        </Animated.View>
      );
    }

    if (detectionStatus === 'notfound') {
      return (
        <Animated.View style={{ transform: [{ scale: chipScale }] }}>
          <View style={[s.chipBase, { backgroundColor: colors.warnSoft, borderColor: colors.warnBorder }]}>
            <Feather name="alert-triangle" size={13} color={colors.warn} style={{ marginRight: 6 }} />
            <Text style={[s.chipText, { color: colors.warn }]}>{detectionMessage}</Text>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={{ transform: [{ scale: chipScale }] }}>
        <View style={[s.chipBase, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}>
          <Feather name="x-circle" size={13} color={colors.danger} style={{ marginRight: 6 }} />
          <Text style={[s.chipText, { color: colors.danger }]}>{detectionMessage}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.85}>
            <Feather name="arrow-left" size={20} color={colors.ink} />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.eyebrow}>SRSS · Crear cuenta</Text>
            <Text style={s.title}>Sumate al sistema</Text>
            <Text style={s.subtitle}>
              Registrate como ciudadano para ver tus horarios y rastrear el camión.
            </Text>
          </View>
        </View>

        <View style={s.card}>
          {fields.map((f) => {
            const isPassword = f.key === 'password';
            const isEmail = f.key === 'email';
            const hideValue = isPassword && !showPassword;
            return (
              <View key={f.key} style={s.fieldGroup}>
                <Text style={s.label}>{f.label}</Text>
                <View style={s.inputContainer}>
                  <Feather name={f.icon} size={16} color={colors.textMuted} style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textPlaceholder}
                    value={form[f.key]}
                    onChangeText={(v) => update(f.key, v)}
                    keyboardType={f.keyboard || 'default'}
                    secureTextEntry={hideValue}
                    autoCapitalize={isEmail || isPassword ? 'none' : 'words'}
                    autoCorrect={!isEmail && !isPassword}
                    autoComplete={
                      isEmail ? 'email' : isPassword ? 'new-password' : undefined
                    }
                    textContentType={
                      isEmail ? 'emailAddress' : isPassword ? 'newPassword' : undefined
                    }
                  />
                  {isPassword && (
                    <TouchableOpacity
                      onPress={() => setShowPassword((v) => !v)}
                      hitSlop={10}
                      style={s.eyeBtn}
                      accessibilityLabel={
                        showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                    >
                      <Feather
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={16}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <View style={s.fieldGroup}>
            <Text style={s.label}>Dirección</Text>
            <View style={s.inputContainer}>
              <Feather name="map-pin" size={16} color={colors.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Av. Sol 123, Cusco"
                placeholderTextColor={colors.textPlaceholder}
                value={form.address}
                onChangeText={(v) => update('address', v)}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              style={s.detectBtn}
              onPress={handleDetectZone}
              disabled={detectionStatus === 'loading'}
              activeOpacity={0.85}
            >
              <Feather
                name={form.address.trim().length === 0 ? 'navigation' : 'search'}
                size={13}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={s.detectBtnText}>
                {form.address.trim().length === 0 ? 'Detectar con GPS' : 'Detectar mi zona'}
              </Text>
            </TouchableOpacity>

            <View style={s.chipWrap}>{renderZoneChip()}</View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={s.btnText}>Completar registro</Text>
                <Feather name="arrow-right" size={16} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <View style={s.bottomDivider} />

          <TouchableOpacity onPress={() => router.back()} style={s.linkBtn} activeOpacity={0.7}>
            <Text style={s.linkText}>
              ¿Ya tenés cuenta? <Text style={s.linkAccent}>Iniciá sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xxl, backgroundColor: colors.bg, paddingTop: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  subtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 19,
  },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fieldGroup: { marginBottom: spacing.md },
  label: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: colors.ink,
    fontSize: 14,
    fontFamily: fontFamily.sansRegular,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: 0.2,
  },
  bottomDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  linkBtn: { marginTop: spacing.md, alignItems: 'center' },
  linkText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fontFamily.sansMedium,
  },
  linkAccent: {
    color: colors.primary,
    fontFamily: fontFamily.sansSemibold,
  },

  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  detectBtnText: {
    color: colors.primaryDark,
    fontSize: 11.5,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: 0.2,
  },
  chipWrap: { marginTop: 10, flexDirection: 'row' },
  chipBase: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLoading: {
    backgroundColor: colors.bgSurface,
    borderColor: colors.border,
  },
  chipLoadingText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontFamily: fontFamily.sansSemibold,
    marginLeft: 8,
  },
  chipText: {
    fontSize: 11.5,
    fontFamily: fontFamily.sansSemibold,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useGoogleAuth } from '../src/hooks/useGoogleAuth';

type FocusedField = 'email' | 'password' | null;

const palette = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceSoft: '#F7F6F4',
  border: '#ECEAE6',
  borderSoft: '#F0EEEB',
  textPrimary: '#1A1A1A',
  textSecondary: '#5A5750',
  textMuted: '#8A8780',
  textFaint: '#B0ADA8',
  textPlaceholder: '#C5C2BD',
  primary: '#059669',
  primaryDark: '#047857',
  primarySoft: 'rgba(5,150,105,0.08)',
};

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { ready: googleReady, signIn: googleSignIn } = useGoogleAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focused, setFocused] = useState<FocusedField>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Datos incompletos', 'Ingresa correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error)?.message ||
        'Error de autenticación';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!googleReady || googleLoading) return;
    setGoogleLoading(true);
    try {
      const outcome = await googleSignIn();
      if (outcome.type === 'cancelled') return;
      if (outcome.type === 'error') {
        Alert.alert('Error', outcome.message);
        return;
      }
      await loginWithGoogle(outcome.idToken);
      router.replace('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ||
        (err as Error)?.message ||
        'No se pudo iniciar sesión con Google';
      Alert.alert('Error', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Recuperación de contraseña',
      'Función disponible en la versión web. Visita: srss.ecosdelseo.com/forgot-password'
    );
  };

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const googleDisabled = !googleReady || googleLoading || loading;

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[s.brandWrap, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={s.wordmark}>SRSS</Text>
          <View style={s.brandDivider} />
          <Text style={s.brandTagline}>Sistema de Recolección de Residuos Sólidos</Text>
        </Animated.View>

        <Animated.View
          style={[s.card, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={s.cardTitle}>Iniciar sesión</Text>
          <Text style={s.cardSubtitle}>Accede con tu cuenta institucional</Text>

          <Text style={s.fieldLabel}>Correo electrónico</Text>
          <TextInput
            style={[s.input, focused === 'email' && s.inputFocused]}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={palette.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[s.fieldLabel, s.fieldLabelSpaced]}>Contraseña</Text>
          <TextInput
            style={[s.input, focused === 'password' && s.inputFocused]}
            placeholder="Tu contraseña"
            placeholderTextColor={palette.textPlaceholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
          />

          <Animated.View style={[s.btnWrap, { transform: [{ scale: pressScale }] }]}>
            <Pressable
              onPress={handleLogin}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
              style={({ pressed }) => [
                s.btn,
                loading && s.btnDisabled,
                pressed && s.btnPressed,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.btnText}>Ingresar</Text>
              )}
            </Pressable>
          </Animated.View>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>o</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={googleDisabled}
            style={({ pressed }) => [
              s.googleBtn,
              googleDisabled && s.googleBtnDisabled,
              pressed && !googleDisabled && s.googleBtnPressed,
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={palette.textPrimary} />
            ) : (
              <>
                <Text style={s.googleMark}>G</Text>
                <Text style={s.googleBtnText}>Continuar con Google</Text>
              </>
            )}
          </Pressable>

          {!googleReady && (
            <Text style={s.googleHint}>
              Configura las credenciales de Google en .env
            </Text>
          )}

          <TouchableOpacity onPress={handleForgotPassword} style={s.forgotBtn}>
            <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View style={s.bottomDivider} />

          <TouchableOpacity onPress={() => router.push('/register')} style={s.linkBtn}>
            <Text style={s.linkText}>
              ¿No tienes cuenta? <Text style={s.linkAccent}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.footnote}>v1.0 · Municipalidad Provincial del Cusco</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  brandWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  wordmark: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 40,
    color: palette.primary,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  brandDivider: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginTop: 14,
    marginBottom: 14,
  },
  brandTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: palette.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: palette.textPrimary,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: palette.textMuted,
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },

  fieldLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: palette.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  fieldLabelSpaced: {
    marginTop: 18,
  },
  input: {
    backgroundColor: palette.surfaceSoft,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    color: palette.textPrimary,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  inputFocused: {
    borderColor: palette.primary,
    backgroundColor: palette.surface,
  },

  btnWrap: { marginTop: 28 },
  btn: {
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: palette.primaryDark, opacity: 0.85 },
  btnPressed: { backgroundColor: palette.primaryDark },
  btnText: {
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginHorizontal: 14,
  },

  googleBtn: {
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnPressed: {
    backgroundColor: palette.surfaceSoft,
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleMark: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 16,
    color: '#4285F4',
    marginRight: 10,
    lineHeight: 18,
  },
  googleBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: palette.textPrimary,
    letterSpacing: 0.2,
  },
  googleHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: palette.textFaint,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },

  forgotBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: palette.primary,
  },

  bottomDivider: {
    height: 1,
    backgroundColor: palette.borderSoft,
    marginTop: 22,
    marginBottom: 4,
  },

  linkBtn: { marginTop: 14, alignItems: 'center' },
  linkText: {
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    fontSize: 13,
  },
  linkAccent: {
    fontFamily: 'Inter_700Bold',
    color: palette.primary,
  },

  footnote: {
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    color: palette.textFaint,
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 28,
  },
});

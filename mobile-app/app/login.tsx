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
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { useGoogleAuth } from '../src/hooks/useGoogleAuth';
import { BrandMark } from '../src/components/branding/BrandMark';
import { colors, fontFamily, radius, spacing } from '../src/theme/tokens';

type FocusedField = 'email' | 'password' | null;

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { ready: googleReady, signIn: googleSignIn } = useGoogleAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focused, setFocused] = useState<FocusedField>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 400,
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
    if (googleLoading || loading) return;
    if (!googleReady) {
      Alert.alert(
        'Google no disponible',
        'El inicio de sesión con Google aún no está configurado en esta versión. Usá correo y contraseña, o actualizá la app.'
      );
      return;
    }
    setGoogleLoading(true);
    try {
      const outcome = await googleSignIn();
      if (outcome.type === 'cancelled') return;
      if (outcome.type === 'error') {
        Alert.alert('Google Sign-In', outcome.message);
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
      'Función disponible en la versión web. Visitá: srss.ecosdelseo.com/forgot-password'
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

  const year = new Date().getFullYear();

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Animated.View
          style={[s.brandWrap, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <View style={s.brandRow}>
            <BrandMark size={36} />
            <View style={s.eyebrow}>
              <View style={s.eyebrowDot} />
              <Text style={s.eyebrowText}>SRSS · Cusco</Text>
            </View>
          </View>
          <Text style={s.brandTitle}>
            Ingresá al <Text style={s.brandTitleAccent}>sistema</Text>
          </Text>
        </Animated.View>

        <Animated.View
          style={[s.card, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={s.cardSubtitle}>
            Accedé con tu cuenta institucional o Google.
          </Text>

          <Text style={s.fieldLabel}>Correo electrónico</Text>
          <TextInput
            style={[s.input, focused === 'email' && s.inputFocused]}
            placeholder="usuario@cusco.gob.pe"
            placeholderTextColor={colors.textPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[s.fieldLabel, s.fieldLabelSpaced]}>Contraseña</Text>
          <View
            style={[
              s.passwordRow,
              focused === 'password' && s.inputFocused,
            ]}
          >
            <TextInput
              style={s.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              style={s.eyeBtn}
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={17}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.btnText}>Continuar</Text>
              )}
            </Pressable>
          </Animated.View>

          <TouchableOpacity onPress={handleForgotPassword} style={s.forgotBtn}>
            <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>o</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogle}
            disabled={googleLoading || loading}
            style={({ pressed }) => [
              s.googleBtn,
              (googleLoading || loading) && s.googleBtnDisabled,
              pressed && s.googleBtnPressed,
              !googleReady && s.googleBtnMuted,
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={s.googleMark}>G</Text>
                <Text style={s.googleBtnText}>
                  {googleReady ? 'Continuar con Google' : 'Google no disponible'}
                </Text>
              </>
            )}
          </Pressable>

          <TouchableOpacity onPress={() => router.push('/register')} style={s.linkBtn}>
            <Text style={s.linkText}>
              ¿No tenés cuenta? <Text style={s.linkAccent}>Registrate</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={s.foot}>
          © {year} SRSS Cusco · Municipalidad Provincial del Cusco
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },

  brandWrap: {
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  eyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  eyebrowText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 10,
    color: colors.primaryDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  brandTitleAccent: {
    fontFamily: fontFamily.serif,
    color: colors.primary,
    fontStyle: 'italic',
    fontWeight: '500',
  },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardSubtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },

  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldLabelSpaced: {
    marginTop: spacing.sm + 2,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.ink,
    fontFamily: fontFamily.sansRegular,
    fontSize: 14,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },

  btnWrap: { marginTop: spacing.md },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: colors.primaryDark, opacity: 0.85 },
  btnPressed: { backgroundColor: colors.primaryDark },
  btnText: {
    fontFamily: fontFamily.sansSemibold,
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  forgotBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 10.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginHorizontal: 12,
  },

  googleBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnPressed: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.borderStrong,
  },
  googleBtnDisabled: {
    opacity: 0.55,
  },
  googleBtnMuted: {
    backgroundColor: colors.bgSurface,
  },
  googleMark: {
    fontFamily: fontFamily.sansBlack,
    fontSize: 14,
    color: '#4285F4',
    marginRight: 9,
    lineHeight: 16,
  },
  googleBtnText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.1,
  },

  linkBtn: { marginTop: spacing.md, alignItems: 'center' },
  linkText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  linkAccent: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.primary,
  },

  foot: {
    fontFamily: fontFamily.sansMedium,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 10.5,
    letterSpacing: 0.1,
    marginTop: spacing.md,
  },
});

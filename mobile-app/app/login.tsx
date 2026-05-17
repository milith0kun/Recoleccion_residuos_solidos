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
  const year = new Date().getFullYear();

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
          <BrandMark size={56} />
          <View style={s.eyebrow}>
            <View style={s.eyebrowDot} />
            <Text style={s.eyebrowText}>SRSS · Cusco</Text>
          </View>
          <Text style={s.brandTitle}>
            Recolección de <Text style={s.brandTitleAccent}>residuos</Text> segregados.
          </Text>
          <Text style={s.brandTagline}>
            Plataforma de gestión ambiental urbana del Cusco.
          </Text>
        </Animated.View>

        <Animated.View
          style={[s.card, { opacity: fade, transform: [{ translateY: slide }] }]}
        >
          <Text style={s.cardTitle}>Ingresar al sistema</Text>
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
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[s.fieldLabel, s.fieldLabelSpaced]}>Contraseña</Text>
          <TextInput
            style={[s.input, focused === 'password' && s.inputFocused]}
            placeholder="••••••••"
            placeholderTextColor={colors.textPlaceholder}
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
            disabled={googleDisabled}
            style={({ pressed }) => [
              s.googleBtn,
              googleDisabled && s.googleBtnDisabled,
              pressed && !googleDisabled && s.googleBtnPressed,
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <Text style={s.googleMark}>G</Text>
                <Text style={s.googleBtnText}>Continuar con Google</Text>
              </>
            )}
          </Pressable>

          {!googleReady && (
            <Text style={s.googleHint}>
              Configurá las credenciales de Google en .env
            </Text>
          )}

          <View style={s.bottomDivider} />

          <TouchableOpacity onPress={() => router.push('/register')} style={s.linkBtn}>
            <Text style={s.linkText}>
              ¿No tenés cuenta? <Text style={s.linkAccent}>Registrate</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={s.foot}>
          <Text style={s.footYear}>© {year} SRSS Cusco</Text>
          <Text style={s.footSep}>·</Text>
          <Text style={s.footAffil}>Municipalidad Provincial del Cusco</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 48,
  },

  brandWrap: {
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: 18,
    marginBottom: 16,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  eyebrowText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 11,
    color: colors.primaryDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 30,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  brandTitleAccent: {
    fontFamily: fontFamily.serif,
    color: colors.primary,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  brandTagline: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
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
  cardTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 22,
    lineHeight: 19,
  },

  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldLabelSpaced: {
    marginTop: 14,
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
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },

  btnWrap: { marginTop: 22 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
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
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12.5,
    color: colors.textSecondary,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginHorizontal: 14,
  },

  googleBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnPressed: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.borderStrong,
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleMark: {
    fontFamily: fontFamily.sansBlack,
    fontSize: 15,
    color: '#4285F4',
    marginRight: 10,
    lineHeight: 17,
  },
  googleBtnText: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13.5,
    color: colors.ink,
    letterSpacing: 0.1,
  },
  googleHint: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },

  bottomDivider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginTop: 22,
    marginBottom: 4,
  },

  linkBtn: { marginTop: 14, alignItems: 'center' },
  linkText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  linkAccent: {
    fontFamily: fontFamily.sansSemibold,
    color: colors.primary,
  },

  foot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
  },
  footYear: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  footSep: {
    color: colors.textFaint,
    fontSize: 12,
  },
  footAffil: {
    fontFamily: fontFamily.serif,
    fontStyle: 'italic',
    fontSize: 12.5,
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
});

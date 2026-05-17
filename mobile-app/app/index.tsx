import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, Easing, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { BrandMark } from '../src/components/branding/BrandMark';
import { colors, fontFamily } from '../src/theme/tokens';

export default function Index() {
  const { user, isLoading, isOperator } = useAuth();
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(6)).current;

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
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (isOperator) {
          router.replace('/(operator)/jornada');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, isLoading, isOperator]);

  return (
    <View style={s.root}>
      <Animated.View
        style={[s.brand, { opacity: fade, transform: [{ translateY: slide }] }]}
      >
        <BrandMark size={64} />
        <Text style={s.wordmark}>SRSS Cusco</Text>
        <Text style={s.tagline}>Gestión de residuos sólidos</Text>
      </Animated.View>

      <View style={s.spinnerWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    gap: 12,
  },
  wordmark: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  tagline: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  spinnerWrap: {
    position: 'absolute',
    bottom: 56,
  },
});

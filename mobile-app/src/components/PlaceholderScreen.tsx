import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppHeader } from './layout/AppShell';
import { colors, fontFamily, spacing } from '../theme/tokens';

interface PlaceholderScreenProps {
  title: string;
  section: string;
  message?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

/**
 * Pantalla "Próximamente": para rutas declaradas en el drawer cuyo contenido
 * aún no está implementado. Evita 404 mientras se hace iterativamente.
 */
export function PlaceholderScreen({
  title,
  section,
  message,
  icon = 'tool',
}: PlaceholderScreenProps) {
  return (
    <View style={s.root}>
      <AppHeader title={title} section={section} />
      <View style={s.body}>
        <View style={s.iconWrap}>
          <Feather name={icon} size={24} color={colors.primary} />
        </View>
        <Text style={s.title}>Próximamente</Text>
        <Text style={s.message}>
          {message ?? 'Esta sección está en construcción. Va a estar disponible muy pronto.'}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: 14,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 22,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  message: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});

import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fontFamily, radius, spacing } from './tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  rightSlot?: React.ReactNode;
}

/**
 * Cabecera estándar Atlas — eyebrow opcional, título serif, subtítulo en sans.
 */
export function ScreenHeader({ title, subtitle, eyebrow, rightSlot }: ScreenHeaderProps) {
  return (
    <View style={uiStyles.header}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={uiStyles.headerEyebrow}>{eyebrow}</Text> : null}
        <Text style={uiStyles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={uiStyles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot}
    </View>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
}

export function SectionTitle({ children, trailing, style }: SectionTitleProps) {
  return (
    <View style={[uiStyles.sectionRow, style]}>
      <Text style={uiStyles.sectionText}>{children}</Text>
      {trailing}
    </View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  tone?: 'default' | 'subtle' | 'accent';
}

/**
 * Card Atlas — fondo blanco, borde gris claro, sombra muy sutil.
 * tone="subtle" usa fondo bgSoft (gris cálido).
 * tone="accent" añade borde-izq verde.
 */
export function Card({ children, style, tone = 'default' }: CardProps) {
  return (
    <View
      style={[
        uiStyles.card,
        tone === 'subtle' && uiStyles.cardSubtle,
        tone === 'accent' && uiStyles.cardAccent,
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
  textStyle,
}: PrimaryButtonProps) {
  const variantStyle =
    variant === 'danger'
      ? uiStyles.btnDanger
      : variant === 'secondary'
      ? uiStyles.btnSecondary
      : variant === 'ghost'
      ? uiStyles.btnGhost
      : uiStyles.btnPrimary;

  const textVariant =
    variant === 'secondary' || variant === 'ghost'
      ? uiStyles.btnSecondaryText
      : uiStyles.btnPrimaryText;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading || disabled}
      style={[uiStyles.btn, variantStyle, (loading || disabled) && uiStyles.btnDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.ink : '#FFFFFF'} />
      ) : (
        <Text style={[textVariant, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View style={uiStyles.emptyBox}>
      <Text style={uiStyles.emptyTitle}>{title}</Text>
      {description ? <Text style={uiStyles.emptyDesc}>{description}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function LoadingScreen({ label = 'Cargando...' }: { label?: string }) {
  return (
    <View style={uiStyles.loadingScreen}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={uiStyles.loadingText}>{label}</Text>
    </View>
  );
}

interface BadgeProps {
  label: string;
  tone?: 'primary' | 'info' | 'warn' | 'danger' | 'muted';
}

export function Badge({ label, tone = 'primary' }: BadgeProps) {
  const map = {
    primary: { bg: colors.primarySoft, border: colors.primaryBorder, color: colors.primaryDark },
    info: { bg: colors.infoSoft, border: colors.infoBorder, color: colors.info },
    warn: { bg: colors.warnSoft, border: colors.warnBorder, color: colors.warn },
    danger: { bg: colors.dangerSoft, border: colors.dangerBorder, color: colors.danger },
    muted: { bg: colors.bgSurface, border: colors.border, color: colors.textSecondary },
  };
  const t = map[tone];
  return (
    <View
      style={[uiStyles.badge, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Text style={[uiStyles.badgeText, { color: t.color }]}>{label}</Text>
    </View>
  );
}

const uiStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  headerEyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '500',
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardSubtle: {
    backgroundColor: colors.bgSoft,
  },
  cardAccent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },

  btn: {
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnSecondary: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDisabled: { opacity: 0.55 },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  btnSecondaryText: {
    color: colors.ink,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 14,
    letterSpacing: 0.1,
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.sansMedium,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontSize: 13,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});

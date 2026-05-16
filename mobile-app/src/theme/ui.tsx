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
import { colors, radius, spacing } from './tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightSlot }: ScreenHeaderProps) {
  return (
    <View style={uiStyles.header}>
      <View style={{ flex: 1 }}>
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
  tone?: 'default' | 'subtle';
}

export function Card({ children, style, tone = 'default' }: CardProps) {
  return (
    <View
      style={[
        uiStyles.card,
        tone === 'subtle' && uiStyles.cardSubtle,
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
  variant?: 'primary' | 'secondary' | 'danger';
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
      : uiStyles.btnPrimary;

  const textVariant =
    variant === 'secondary' ? uiStyles.btnSecondaryText : uiStyles.btnPrimaryText;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading || disabled}
      style={[uiStyles.btn, variantStyle, (loading || disabled) && uiStyles.btnDisabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#FFF'} />
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
    primary: { bg: colors.primarySoft, border: colors.primaryBorder, color: colors.primary },
    info: { bg: colors.infoSoft, border: 'rgba(59,130,246,0.35)', color: colors.info },
    warn: { bg: colors.warnSoft, border: 'rgba(245,158,11,0.35)', color: colors.warn },
    danger: { bg: colors.dangerSoft, border: 'rgba(239,68,68,0.35)', color: colors.danger },
    muted: { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', color: colors.textMuted },
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
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  sectionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardSubtle: {
    backgroundColor: 'rgba(30,41,59,0.4)',
  },

  btn: {
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnSecondary: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#FFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  btnSecondaryText: { color: colors.textPrimary, fontWeight: '700', fontSize: 14 },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  loadingText: { color: colors.textMuted, marginTop: spacing.md, fontSize: 13, fontWeight: '500' },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
});

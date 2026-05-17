export const colors = {
  bg: '#FAFAF8',
  bgElevated: '#FFFFFF',
  bgSoft: '#F7F6F4',
  bgOverlay: 'rgba(255,255,255,0.85)',

  border: '#ECEAE6',
  borderSoft: '#F0EEEB',

  textPrimary: '#1A1A1A',
  textSecondary: '#5A5750',
  textMuted: '#8A8780',
  textFaint: '#B0ADA8',

  primary: '#059669',
  primaryDark: '#047857',
  primarySoft: 'rgba(5,150,105,0.08)',
  primaryBorder: 'rgba(5,150,105,0.35)',

  info: '#2563EB',
  infoSoft: 'rgba(37,99,235,0.08)',

  warn: '#D97706',
  warnSoft: 'rgba(217,119,6,0.08)',

  danger: '#DC2626',
  dangerSoft: 'rgba(220,38,38,0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const typography = {
  pageTitle: {
    fontSize: 26,
    fontWeight: '900' as const,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSub: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
  },
} as const;

export const layout = {
  screenPadding: spacing.xxl,
  screenPaddingTop: 60,
} as const;

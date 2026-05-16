export const colors = {
  bg: '#0F172A',
  bgElevated: '#1E293B',
  bgSoft: 'rgba(30,41,59,0.6)',
  bgOverlay: 'rgba(15,23,42,0.6)',

  border: '#334155',
  borderSoft: 'rgba(51,65,85,0.5)',

  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textFaint: '#64748B',

  primary: '#10B981',
  primarySoft: 'rgba(16,185,129,0.15)',
  primaryBorder: 'rgba(16,185,129,0.4)',

  info: '#3B82F6',
  infoSoft: 'rgba(59,130,246,0.15)',

  warn: '#F59E0B',
  warnSoft: 'rgba(245,158,11,0.15)',

  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.1)',
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

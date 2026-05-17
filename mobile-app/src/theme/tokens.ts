import { Platform } from 'react-native';

/**
 * Paleta Atlas — alineada con web-platform (`--color-atlas`).
 * Verde institucional profundo, fondos cálidos blancos, tipografía sobria.
 */
export const colors = {
  bg: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgSoft: '#F9FBFA',
  bgSurface: '#F1F4F2',
  bgOverlay: 'rgba(255,255,255,0.92)',

  border: '#E8EDEB',
  borderSoft: '#F0F2F0',
  borderStrong: '#DCE2E0',

  ink: '#001E2B',
  textPrimary: '#001E2B',
  textSecondary: '#5C6C75',
  textMuted: '#889397',
  textFaint: '#B2BAC0',
  textPlaceholder: '#B2BAC0',

  primary: '#00684A',
  primaryDark: '#00513A',
  primaryLight: '#00A35C',
  primarySoft: '#E3FCEF',
  primaryBorder: '#C1F1D6',

  info: '#1E5180',
  infoSoft: '#E3EEF9',
  infoBorder: '#C8DBF0',

  warn: '#8C6300',
  warnSoft: '#FFF5D6',
  warnBorder: '#FFE9A8',

  danger: '#8B3030',
  dangerSoft: '#FCE9E9',
  dangerBorder: '#F7CFCF',
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
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  pill: 999,
} as const;

/**
 * Familias tipográficas. Sans = Inter (cargado en _layout).
 * Serif del sistema (Georgia / serif) hasta que se decida cargar Newsreader.
 */
export const fontFamily = {
  sansRegular: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  sansBlack: 'Inter_800ExtraBold',
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
} as const;

export const typography = {
  /** Título grande estilo Atlas — serif, ligero, tracking ajustado. */
  display: {
    fontFamily: fontFamily.serif,
    fontSize: 32,
    fontWeight: '500' as const,
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  pageTitle: {
    fontFamily: fontFamily.serif,
    fontSize: 26,
    fontWeight: '500' as const,
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  pageSub: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  /** Eyebrow uppercase verde Atlas — sobre títulos hero. */
  eyebrow: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  sectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontFamily: fontFamily.sansSemibold,
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  /** Etiqueta de campo (uppercase 10.5 bold). */
  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 10.5,
    color: colors.textSecondary,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  /** Texto monoespaciado para chips de norma / códigos. */
  mono: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }) as string,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
} as const;

export const layout = {
  screenPadding: spacing.xxl,
  screenPaddingTop: 60,
} as const;

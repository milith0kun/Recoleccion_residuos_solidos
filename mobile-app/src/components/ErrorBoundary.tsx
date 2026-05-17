import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, radius, spacing } from '../theme/tokens';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback custom. Si no se provee, muestra el mensaje por defecto. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Texto que se muestra arriba del mensaje técnico (ej. "El mapa no pudo cargar"). */
  label?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ErrorBoundary clásico de React: captura excepciones de render en su árbol
 * de hijos y muestra un fallback en vez de tirar abajo toda la pantalla.
 *
 * Útil para envolver componentes nativos riesgosos (WebView, MapView, etc.)
 * cuyas excepciones podrían dejar la pantalla completamente en blanco.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) {
      console.warn('[ErrorBoundary]', error.message, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
    return (
      <View style={s.box}>
        <Text style={s.title}>{this.props.label ?? 'Algo no funcionó'}</Text>
        <Text style={s.message} numberOfLines={4}>
          {this.state.error.message || 'Error desconocido'}
        </Text>
        <TouchableOpacity style={s.btn} onPress={this.reset} activeOpacity={0.85}>
          <Text style={s.btnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 12,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  btn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  btnText: {
    color: '#FFFFFF',
    fontFamily: fontFamily.sansSemibold,
    fontSize: 13,
  },
});

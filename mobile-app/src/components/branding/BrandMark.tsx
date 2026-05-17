import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily } from '../../theme/tokens';

interface BrandMarkProps {
  size?: number;
}

/**
 * Logo SRSS Cusco — 3 tachos en tonos de verde (orgánicos, reciclables,
 * peligrosos). Replica el BrandMark del web sin SVG, usando Views nativas
 * para evitar la dependencia de react-native-svg.
 *
 * Geometría base (proporciones del web): viewBox 36×32.
 *  - cada tacho ocupa 12px de ancho con 1px de gap entre tachos
 *  - tapa rect 11×2.6 en y=6.5
 *  - cuerpo rect 9×20 en y=9.5 con radius 1.5
 */
export function BrandMark({ size = 36 }: BrandMarkProps) {
  const w = size;
  const h = Math.round(size * (32 / 36));
  const unit = w / 36;

  const binStyles = (bodyColor: string, lidColor: string) => ({
    lid: {
      width: 11 * unit,
      height: 2.6 * unit,
      borderRadius: 1.1 * unit,
      backgroundColor: lidColor,
    },
    body: {
      width: 9 * unit,
      height: 20 * unit,
      borderRadius: 1.5 * unit,
      backgroundColor: bodyColor,
      marginTop: 0.4 * unit,
      alignSelf: 'center' as const,
    },
  });

  const bin1 = binStyles('#00684A', '#00513A');
  const bin2 = binStyles('#00A35C', '#007F4A');
  const bin3 = binStyles('#5BC18C', '#3A9F6A');

  // Líneas decorativas internas (compostaje) — tacho 1
  const tickStyle = {
    height: 1 * unit,
    width: 5 * unit,
    backgroundColor: '#E3FCEF',
    opacity: 0.45,
    borderRadius: 0.5 * unit,
    marginTop: 2.5 * unit,
    alignSelf: 'center' as const,
  };

  return (
    <View style={[styles.root, { width: w, height: h }]}>
      {/* Tacho 1 — orgánicos */}
      <View style={styles.bin}>
        <View style={[bin1.lid, { marginLeft: 0.5 * unit }]} />
        <View style={[bin1.body, { marginLeft: 1.5 * unit, marginTop: 0.4 * unit }]}>
          <View style={[tickStyle, { marginTop: 4 * unit }]} />
          <View style={tickStyle} />
          <View style={tickStyle} />
        </View>
      </View>

      {/* Tacho 2 — reciclables */}
      <View style={styles.bin}>
        <View style={[bin2.lid, { marginLeft: 0.5 * unit }]} />
        <View style={[bin2.body, { marginLeft: 1.5 * unit, marginTop: 0.4 * unit }]}>
          {/* Símbolo de reciclaje simplificado: hoja vertical */}
          <View
            style={{
              width: 3 * unit,
              height: 8.5 * unit,
              backgroundColor: '#E3FCEF',
              opacity: 0.85,
              borderTopLeftRadius: 4 * unit,
              borderTopRightRadius: 4 * unit,
              borderBottomLeftRadius: 4 * unit,
              borderBottomRightRadius: 4 * unit,
              alignSelf: 'center',
              marginTop: 4 * unit,
            }}
          />
        </View>
      </View>

      {/* Tacho 3 — peligrosos (con marca circular) */}
      <View style={styles.bin}>
        <View style={[bin3.lid, { marginLeft: 0.5 * unit }]} />
        <View style={[bin3.body, { marginLeft: 1.5 * unit, marginTop: 0.4 * unit }]}>
          <View
            style={{
              width: 5.2 * unit,
              height: 5.2 * unit,
              borderRadius: 2.6 * unit,
              borderWidth: 1 * unit,
              borderColor: '#FFFFFF',
              opacity: 0.95,
              alignSelf: 'center',
              marginTop: 5.4 * unit,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 1.8 * unit,
                height: 1.8 * unit,
                borderRadius: 0.9 * unit,
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

interface BrandLockupProps {
  size?: number;
  variant?: 'light' | 'dark';
}

/**
 * BrandMark + wordmark "SRSS Cusco" en serif. Para headers, splash, login.
 */
export function BrandLockup({ size = 28, variant = 'light' }: BrandLockupProps) {
  const isDark = variant === 'dark';
  return (
    <View style={styles.lockup}>
      <BrandMark size={size} />
      <Text
        style={[
          styles.lockupText,
          {
            fontSize: Math.round(size * 0.62),
            color: isDark ? '#FFFFFF' : colors.ink,
          },
        ]}
      >
        SRSS Cusco
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bin: {
    flexDirection: 'column',
  },
  lockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockupText: {
    fontFamily: fontFamily.serif,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
});

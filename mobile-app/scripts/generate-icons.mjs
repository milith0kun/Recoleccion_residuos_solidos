#!/usr/bin/env node
/**
 * Genera los íconos de la app a partir de `assets/brand-mark.svg`.
 *
 *  - icon.png            (1024×1024, fondo blanco)        — App Store / iOS / Android legacy
 *  - adaptive-icon.png   (1024×1024, fondo transparente)  — Android adaptive (foreground)
 *  - splash-icon.png     (1024×1024, fondo transparente)  — splash con `resizeMode: contain`
 *  - favicon.png         (48×48, fondo blanco)            — web
 *
 * Ejecutar tras editar `brand-mark.svg`:
 *   node scripts/generate-icons.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');

const SOURCE = join(ASSETS, 'brand-mark.svg');
const BG = '#FFFFFF';

/**
 * Renderiza el SVG en un PNG cuadrado con padding (safe zone) y opcionalmente
 * fondo sólido. El padding es porcentaje del tamaño total (0–1).
 */
async function render({ size, padding, bg, outFile }) {
  const svg = await readFile(SOURCE);
  const inner = Math.round(size * (1 - padding * 2));

  // 1) renderizar SVG al tamaño "inner" (mantiene proporciones del viewBox 36×32 — width pleno, alto recortado)
  const glyph = await sharp(svg, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 2) componer sobre lienzo `size` × `size` con fondo (color o transparente)
  const canvas = bg
    ? sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: bg,
        },
      })
    : sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      });

  const offsetX = Math.round((size - inner) / 2);
  const offsetY = Math.round((size - inner) / 2);

  const result = await canvas
    .composite([{ input: glyph, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  await writeFile(outFile, result);
  console.log(`✓ ${outFile.replace(ROOT, '.')} (${size}×${size}, padding ${Math.round(padding * 100)}%)`);
}

async function main() {
  // icon.png — legacy / iOS: padding mínimo para que el logo respire pero ocupe ancho.
  await render({
    size: 1024,
    padding: 0.10,
    bg: null,
    outFile: join(ASSETS, 'icon.png'),
  });

  // adaptive-icon.png — Android adaptive foreground.
  // Safe zone Android: contenido en círculo radius 33% del canvas (padding mínimo 18%).
  // Vamos al borde para que el SO no recorte pero el logo se vea grande.
  await render({
    size: 1024,
    padding: 0.18,
    bg: null,
    outFile: join(ASSETS, 'adaptive-icon.png'),
  });

  // splash-icon.png — splash screen con resizeMode contain.
  await render({
    size: 1024,
    padding: 0.24,
    bg: null,
    outFile: join(ASSETS, 'splash-icon.png'),
  });

  // favicon.png — web tab. Mantiene fondo blanco por legibilidad.
  await render({
    size: 48,
    padding: 0.08,
    bg: BG,
    outFile: join(ASSETS, 'favicon.png'),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

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
const SOURCE_MONO = join(ASSETS, 'brand-mark-mono.svg');
const BG = '#FFFFFF';

/**
 * Renderiza un SVG en un PNG cuadrado con padding (safe zone) y opcionalmente
 * fondo sólido. El padding es porcentaje del tamaño total (0–1).
 */
async function render({ size, padding, bg, outFile, source = SOURCE }) {
  const svg = await readFile(source);
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
  // icon.png — legacy / iOS. Padding mínimo para que el logo se vea prominente.
  await render({
    size: 1024,
    padding: 0.06,
    bg: null,
    outFile: join(ASSETS, 'icon.png'),
  });

  // adaptive-icon.png — Android adaptive foreground.
  // El SO recorta en máscara (círculo/squircle) con safe zone ~ 18%.
  // Usamos 12% para que el logo se vea ~20% más grande que el estándar.
  // El SVG ya tiene su propio padding interno (18% top/bottom dentro del viewBox),
  // así que el contenido visible queda dentro de la safe zone aún con 12%.
  await render({
    size: 1024,
    padding: 0.12,
    bg: null,
    outFile: join(ASSETS, 'adaptive-icon.png'),
  });

  // splash-icon.png — splash screen con resizeMode contain.
  await render({
    size: 1024,
    padding: 0.20,
    bg: null,
    outFile: join(ASSETS, 'splash-icon.png'),
  });

  // favicon.png — web tab. Mantiene fondo blanco por legibilidad.
  await render({
    size: 48,
    padding: 0.06,
    bg: BG,
    outFile: join(ASSETS, 'favicon.png'),
  });

  // notification-icon.png — Android status bar.
  // Material Design exige icono monocromo blanco sobre transparente.
  // El SO le aplica color (definido en app.json plugin).
  await render({
    size: 96,
    padding: 0.18,
    bg: null,
    outFile: join(ASSETS, 'notification-icon.png'),
    source: SOURCE_MONO,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

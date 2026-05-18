// Genera assets/notification-icon.png 96x96 a partir de brand-mark-mono.svg
// usando sharp. El icono de notificaciones en Android tiene que ser
// monocromático (blanco con transparencia) — Android lo tinta con el color
// definido en el plugin de expo-notifications (#00684A).
//
// Uso:  node scripts/gen-notification-icon.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const svg = readFileSync(join(root, 'assets/brand-mark-mono.svg'));

const out = await sharp(svg, { density: 600 })
  .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

writeFileSync(join(root, 'assets/notification-icon.png'), out);
console.log('✓ assets/notification-icon.png regenerado (96x96, monocromo blanco).');

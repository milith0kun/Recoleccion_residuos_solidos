/**
 * Broadcast push de prueba a TODOS los usuarios con pushToken registrado.
 *   npx tsx scripts/broadcast-push.ts
 *
 * Usado para verificar end-to-end si las notificaciones llegan en
 * dispositivos reales (especialmente Android tras un EAS build).
 * Reporta:
 *   - cuántos users tienen token
 *   - cuántos tickets ok / cuántos rechazados
 *   - razones específicas de los rechazos (DeviceNotRegistered,
 *     InvalidCredentials, etc.) para diagnosticar configuración FCM.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

import mongoose from 'mongoose';
import User from '../src/lib/models/User';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI');
    process.exit(1);
  }

  console.log('Conectando a Mongo…');
  await mongoose.connect(uri);

  const users = await User.find({
    pushToken: { $ne: null },
    isActive: true,
  })
    .select('_id email firstName role pushToken pushTokenUpdatedAt')
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        email: string;
        firstName?: string;
        role: string;
        pushToken: string;
        pushTokenUpdatedAt?: Date;
      }[]
    >();

  console.log(`\nUsuarios con pushToken activo: ${users.length}`);
  if (users.length === 0) {
    console.log('\nNo hay tokens registrados. Verificar que la app haya:');
    console.log('  1) corrido en dispositivo físico (no emulador)');
    console.log('  2) recibido permisos de notificaciones');
    console.log('  3) llamado PATCH /users/me con su pushToken');
    await mongoose.disconnect();
    return;
  }

  console.log('\nDestinatarios:');
  for (const u of users) {
    const upd = u.pushTokenUpdatedAt ? new Date(u.pushTokenUpdatedAt).toLocaleString() : '—';
    console.log(
      `  - ${u.email.padEnd(40)} ${u.role.padEnd(8)} token=${u.pushToken.slice(0, 32)}…  upd=${upd}`,
    );
  }

  const valid = users.filter((u) => /^ExponentPushToken\[/.test(u.pushToken));
  if (valid.length !== users.length) {
    console.log(`\n⚠ ${users.length - valid.length} tokens con formato inválido — saltados.`);
  }

  const messages = valid.map((u) => ({
    to: u.pushToken,
    title: 'Push de prueba — SRSS Cusco',
    body: `Hola ${u.firstName ?? 'vecino'}, esto verifica que las notificaciones funcionan en tu dispositivo.`,
    sound: 'default' as const,
    data: { url: '/notifications', kind: 'system', test: true },
  }));

  console.log(`\nEnviando a Expo Push API (${messages.length} mensajes)…`);
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    console.error(`Expo respondió ${res.status}: ${await res.text()}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const json = (await res.json()) as { data?: ExpoTicket[] | ExpoTicket; errors?: unknown };
  const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];

  let ok = 0;
  const errors: { email: string; reason: string }[] = [];
  tickets.forEach((t, i) => {
    if (t.status === 'ok') ok++;
    else {
      errors.push({
        email: valid[i]?.email ?? `#${i}`,
        reason: t.message || t.details?.error || 'unknown',
      });
    }
  });

  console.log('\n═══════════════════════════════════════════');
  console.log(` ✓ Enviados OK : ${ok} / ${messages.length}`);
  console.log(` ✗ Con error  : ${errors.length}`);
  console.log('═══════════════════════════════════════════');

  if (errors.length > 0) {
    console.log('\nDetalles de los errores:');
    for (const e of errors) {
      console.log(`  - ${e.email.padEnd(40)} → ${e.reason}`);
    }
    console.log('\nGuía rápida de errores comunes:');
    console.log(
      '  DeviceNotRegistered    → el dispositivo desinstaló la app o el token expiró. Reabrir la app regenera el token.',
    );
    console.log(
      '  InvalidCredentials     → falta configurar FCM en EAS. Correr `eas credentials` y subir la key/json.',
    );
    console.log(
      '  MessageTooBig          → payload >4KB. Cortar el body o data.',
    );
    console.log(
      '  MismatchSenderId       → el FCM sender configurado en EAS no coincide con el del APK instalado.',
    );
  }

  await mongoose.disconnect();
  console.log('\nListo. Revisá la pantalla de tu celular en los próximos segundos.\n');
}

main().catch(async (e) => {
  console.error('broadcast error:', e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

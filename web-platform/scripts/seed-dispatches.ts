/**
 * Crea 2 dispatches de muestra para que el conductor del seed tenga
 * trabajo asignado y pueda ver el flujo end-to-end.
 *
 *   npx tsx scripts/seed-dispatches.ts
 *
 * Idempotente: borra todos los dispatches existentes del conductor seed
 * antes de crear los nuevos (así no se acumulan en ejecuciones
 * repetidas). Solo afecta al conductor del seed, no a otros usuarios.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

import mongoose from 'mongoose';
import User from '../src/lib/models/User';
import Route from '../src/lib/models/Route';
import Dispatch from '../src/lib/models/Dispatch';

async function generateCode(): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  const count = await Dispatch.countDocuments({ createdAt: { $gte: start, $lt: end } });
  return `DSP-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI');
    process.exit(1);
  }

  console.log('Conectando a Mongo…');
  await mongoose.connect(uri);

  const driver = await User.findOne({
    email: 'conductor@residuos.cusco.gob.pe',
  }).select('_id firstName lastName');
  if (!driver) {
    console.error('No se encontró el conductor del seed. Correr `npm run seed` primero.');
    process.exit(1);
  }
  console.log(`✓ Conductor: ${driver.firstName} ${driver.lastName} (${driver._id})`);

  const planner = await User.findOne({
    email: 'operador@residuos.cusco.gob.pe',
  }).select('_id firstName lastName');
  if (!planner) {
    console.error('No se encontró el operador planificador del seed.');
    process.exit(1);
  }
  console.log(`✓ Operador: ${planner.firstName} ${planner.lastName} (${planner._id})`);

  const routes = await Route.find({}).select('_id name vehicle').limit(2);
  if (routes.length === 0) {
    console.error('No hay rutas en la base. Correr `npm run seed` primero.');
    process.exit(1);
  }
  console.log(`✓ Rutas disponibles: ${routes.length}`);

  // Limpiar dispatches anteriores del conductor (idempotencia).
  const removed = await Dispatch.deleteMany({
    driver: driver._id,
    status: { $in: ['pending', 'accepted', 'rejected', 'cancelled'] },
  });
  console.log(`  Limpieza: ${removed.deletedCount} dispatches anteriores eliminados.`);

  // Dispatch 1: ACEPTADO, programado para ahora — el conductor solo tiene
  // que tocar "Iniciar" para arrancar el GPS tracking inmediato.
  const now = new Date();
  const code1 = await generateCode();
  await Dispatch.create({
    code: code1,
    route: routes[0]._id,
    driver: driver._id,
    assignedBy: planner._id,
    scheduledFor: now,
    vehicle: routes[0].vehicle,
    notes: 'Salida lista para iniciar. Tocá "Iniciar" en la app para arrancar el GPS y empezar el recorrido.',
    status: 'accepted',
    acceptedAt: now,
  });
  console.log(`✓ ${code1} → ${routes[0].name} · AHORA · ACEPTADA (listo para Iniciar)`);

  // Dispatch 2: pendiente, programado para mañana 6:00 AM (para probar
  // el flujo Aceptar/Rechazar).
  if (routes.length > 1) {
    const tomorrow6am = new Date();
    tomorrow6am.setDate(tomorrow6am.getDate() + 1);
    tomorrow6am.setHours(6, 0, 0, 0);
    const code2 = await generateCode();
    await Dispatch.create({
      code: code2,
      route: routes[1]._id,
      driver: driver._id,
      assignedBy: planner._id,
      scheduledFor: tomorrow6am,
      vehicle: routes[1].vehicle,
      notes: 'Salida vespertina. Probar el flujo de aceptar/rechazar.',
      status: 'pending',
    });
    console.log(`✓ ${code2} → ${routes[1].name} · mañana 06:00 · PENDIENTE`);
  }

  // Limpiar route-executions activas del conductor para evitar conflictos
  // si en una corrida anterior quedó una "in_progress" colgada.
  const RouteExecution = (await import('../src/lib/models/RouteExecution')).default;
  const cleanup = await RouteExecution.updateMany(
    { operator: driver._id, status: 'in_progress' },
    { $set: { status: 'cancelled', endedAt: new Date() } },
  );
  if (cleanup.modifiedCount > 0) {
    console.log(`  Cleanup: ${cleanup.modifiedCount} ejecuciones colgadas marcadas como canceladas.`);
  }

  await mongoose.disconnect();
  console.log('\n═══════════════════════════════════════════');
  console.log(' Dispatches creados. Ahora el conductor verá:');
  console.log('   • 1 aceptada (lista para Iniciar — arranca GPS tracking)');
  console.log('   • 1 pendiente (para probar Aceptar/Rechazar)');
  console.log('═══════════════════════════════════════════\n');
  console.log('Flujo de prueba:');
  console.log('  1) Abre la app como conductor.');
  console.log('  2) En "Aceptadas — listas para iniciar" tocá "Iniciar".');
  console.log('  3) Se activa el GPS y empieza a transmitir cada 10s.');
  console.log('  4) En la web ingresá como admin → /dashboard/tracking');
  console.log('     para ver el camión en vivo en el mapa.');
  console.log('');
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

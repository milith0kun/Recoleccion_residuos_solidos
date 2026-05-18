/**
 * Diagnóstico end-to-end del sistema de tracking GPS:
 *   npx tsx scripts/diagnose-tracking.ts
 *
 * Reporta:
 *  - RouteExecutions en estado in_progress (jornadas activas)
 *  - GpsTracks más recientes por ejecución
 *  - Si los timestamps están frescos o vienen retrasados
 *  - Si la zona del ciudadano coincide con alguna ruta activa
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
import RouteExecution from '../src/lib/models/RouteExecution';
import GpsTrack from '../src/lib/models/GpsTrack';
import Dispatch from '../src/lib/models/Dispatch';
import Vehicle from '../src/lib/models/Vehicle';
import Zone from '../src/lib/models/Zone';

// Forzar registro de los modelos referenciados por populate.
void Route;
void Vehicle;
void Zone;
void User;

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  return `${h}h atrás`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI');
    process.exit(1);
  }
  console.log('Conectando a Mongo…\n');
  await mongoose.connect(uri);

  // ── 1. Jornadas activas ────────────────────────────────────────────────
  console.log('▶ RouteExecutions con status="in_progress"');
  console.log('─'.repeat(80));
  const execs = await RouteExecution.find({ status: 'in_progress' })
    .populate('route', 'name zone')
    .populate('operator', 'firstName lastName email role')
    .populate('vehicle', 'plate')
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        route?: { _id: mongoose.Types.ObjectId; name: string; zone?: mongoose.Types.ObjectId };
        operator?: { _id: mongoose.Types.ObjectId; firstName: string; lastName: string; email: string; role: string };
        vehicle?: { plate: string };
        startedAt: Date;
      }>
    >();

  if (execs.length === 0) {
    console.log('  ✗ No hay jornadas activas. Para iniciar una:');
    console.log('    1) Como conductor en el app móvil → aceptar un dispatch + tocar Iniciar');
    console.log('    2) O ejecutar `npx tsx scripts/seed-dispatches.ts` y repetir paso 1');
  } else {
    for (const e of execs) {
      console.log(
        `  ${String(e._id).slice(-6)} · ${e.route?.name ?? '?'} · ${e.operator?.firstName ?? '?'} ${e.operator?.lastName ?? ''} (${e.operator?.role ?? '?'}) · iniciada ${timeAgo(e.startedAt)}`,
      );
    }
  }
  console.log();

  // ── 2. GpsTracks recibidos ─────────────────────────────────────────────
  console.log('▶ GpsTracks de las ejecuciones activas');
  console.log('─'.repeat(80));
  if (execs.length === 0) {
    console.log('  (sin ejecuciones)');
  } else {
    for (const e of execs) {
      const tracks = await GpsTrack.find({ routeExecution: e._id })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean<Array<{ location: { coordinates: [number, number] }; timestamp: Date; speed?: number }>>();

      console.log(`  Execution ${String(e._id).slice(-6)} (${e.route?.name ?? '?'}):`);
      if (tracks.length === 0) {
        console.log(`    ✗ NINGÚN punto GPS registrado todavía.`);
        console.log(`      → El conductor inició la jornada pero el GPS tracker NO está mandando puntos.`);
        console.log(`      → Causas posibles:`);
        console.log(`        - La app está en background (Android puede pausar useGpsTracker).`);
        console.log(`        - Permisos de ubicación denegados al pedirlos.`);
        console.log(`        - watchPositionAsync se canceló (cambio de pantalla, recarga).`);
        console.log(`        - El device no tiene GPS o no captura ubicación.`);
      } else {
        const totalTracks = await GpsTrack.countDocuments({ routeExecution: e._id });
        console.log(`    ✓ ${totalTracks} puntos GPS totales. Últimos 5:`);
        for (const t of tracks) {
          const [lng, lat] = t.location.coordinates;
          console.log(
            `      ${timeAgo(new Date(t.timestamp))} · [${lat.toFixed(5)}, ${lng.toFixed(5)}]${
              t.speed != null ? ` · ${t.speed.toFixed(1)} m/s` : ''
            }`,
          );
        }
        // Frescura del último punto
        const lastMs = Date.now() - new Date(tracks[0].timestamp).getTime();
        if (lastMs > 60_000) {
          console.log(`    ⚠ El último punto tiene ${Math.round(lastMs / 1000)}s — el tracker se detuvo.`);
        } else {
          console.log(`    ✓ Último punto recibido hace ${Math.round(lastMs / 1000)}s — está activo.`);
        }
      }
    }
  }
  console.log();

  // ── 3. Vista desde el ciudadano ───────────────────────────────────────
  console.log('▶ Vista del ciudadano (María Condori)');
  console.log('─'.repeat(80));
  const citizen = await User.findOne({ email: 'ciudadano@gmail.com' })
    .select('zone')
    .populate('zone', 'name')
    .lean<{ zone?: { _id: mongoose.Types.ObjectId; name?: string } | null }>();

  if (!citizen) {
    console.log('  ✗ Ciudadano del seed no encontrado.');
  } else {
    console.log(`  Zona del ciudadano: ${citizen.zone?.name ?? '(sin asignar)'}`);
    console.log(
      `  Ejecuciones activas que verá como inMyZone=true: ${
        execs.filter(
          (e) =>
            citizen.zone &&
            e.route?.zone &&
            String(e.route.zone) === String(citizen.zone._id),
        ).length
      }`,
    );
    console.log(`  Ejecuciones activas totales (siempre visibles desde el cambio fase 6): ${execs.length}`);
  }
  console.log();

  // ── 4. Dispatches del conductor ────────────────────────────────────────
  console.log('▶ Dispatches del conductor (Miguel Huamán)');
  console.log('─'.repeat(80));
  const driver = await User.findOne({ email: 'conductor@residuos.cusco.gob.pe' }).select('_id').lean<{ _id: mongoose.Types.ObjectId }>();
  if (driver) {
    const dispatches = await Dispatch.find({ driver: driver._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean<Array<{ code: string; status: string; scheduledFor: Date; execution?: mongoose.Types.ObjectId }>>();
    if (dispatches.length === 0) {
      console.log('  ✗ Sin dispatches. Correr `npx tsx scripts/seed-dispatches.ts`.');
    } else {
      for (const d of dispatches) {
        console.log(
          `  ${d.code} · ${d.status.padEnd(12)} · sched ${d.scheduledFor.toLocaleString()}${
            d.execution ? ` · exec=${String(d.execution).slice(-6)}` : ''
          }`,
        );
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDiagnóstico completado.\n');
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

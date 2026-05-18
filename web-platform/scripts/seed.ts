/**
 * Seed standalone idempotente. Ejecutar con:
 *   npx tsx scripts/seed.ts
 *
 * Carga .env.local manualmente y se conecta directo a MongoDB usando los
 * mismos modelos del backend. NO borra nada: usa findOneAndUpdate+upsert
 * para crear/actualizar cada registro. Seguro de correr múltiples veces.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Cargar .env.local manualmente (no usamos dotenv para no añadir dependencias).
const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/lib/models/User';
import Zone from '../src/lib/models/Zone';
import WasteType from '../src/lib/models/WasteType';
import Vehicle from '../src/lib/models/Vehicle';
import Route from '../src/lib/models/Route';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI en .env.local');
    process.exit(1);
  }

  console.log('Conectando a MongoDB…');
  await mongoose.connect(uri);
  console.log('Conectado.');

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await User.findOneAndUpdate(
    { email: 'admin@residuos.cusco.gob.pe' },
    {
      email: 'admin@residuos.cusco.gob.pe',
      password: adminPassword,
      dni: '70000001',
      firstName: 'Carlos',
      lastName: 'Quispe Mamani',
      role: 'admin',
      phone: '984111222',
      address: 'Av. Sol 123, Cusco',
      isActive: true,
      isVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log('✓ admin:', admin.email);

  // ── Operator (planificador) ───────────────────────────────────────────────
  const opPassword = await bcrypt.hash('operator123', 12);
  const operatorUser = await User.findOneAndUpdate(
    { email: 'operador@residuos.cusco.gob.pe' },
    {
      email: 'operador@residuos.cusco.gob.pe',
      password: opPassword,
      dni: '70000004',
      firstName: 'Lucía',
      lastName: 'Vargas Quispe',
      role: 'operator',
      phone: '984777888',
      address: 'Av. Tullumayo 200, Cusco',
      isActive: true,
      isVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log('✓ operator:', operatorUser.email);

  // ── Driver (conductor) ────────────────────────────────────────────────────
  const drvPassword = await bcrypt.hash('driver123', 12);
  const driver = await User.findOneAndUpdate(
    { email: 'conductor@residuos.cusco.gob.pe' },
    {
      email: 'conductor@residuos.cusco.gob.pe',
      password: drvPassword,
      dni: '70000002',
      firstName: 'Miguel',
      lastName: 'Huamán Torres',
      role: 'driver',
      phone: '984333444',
      address: 'Calle Saphi 45, Cusco',
      isActive: true,
      isVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log('✓ driver:', driver.email);

  // ── Citizen ───────────────────────────────────────────────────────────────
  const citPassword = await bcrypt.hash('citizen123', 12);
  const citizen = await User.findOneAndUpdate(
    { email: 'ciudadano@gmail.com' },
    {
      email: 'ciudadano@gmail.com',
      password: citPassword,
      dni: '70000003',
      firstName: 'María',
      lastName: 'Condori López',
      role: 'citizen',
      phone: '984555666',
      address: 'Jr. Ayacucho 321, Cusco',
      location: { type: 'Point', coordinates: [-71.9780, -13.5170] },
      isActive: true,
      isVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log('✓ citizen:', citizen.email);
  // Nota: la zona del citizen se asigna más abajo, después de crear las
  // zonas (necesitamos el _id de Centro Histórico).

  // ── Zonas ────────────────────────────────────────────────────────────────
  const zone1 = await Zone.findOneAndUpdate(
    { name: 'Centro Histórico' },
    {
      name: 'Centro Histórico',
      description: 'Zona monumental del centro de la ciudad del Cusco',
      district: 'Cusco',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.9850, -13.5100], [-71.9700, -13.5100],
          [-71.9700, -13.5250], [-71.9850, -13.5250],
          [-71.9850, -13.5100],
        ]],
      },
      color: '#10B981',
      isActive: true,
      createdBy: admin._id,
    },
    { upsert: true, new: true }
  );

  await Zone.findOneAndUpdate(
    { name: 'San Blas' },
    {
      name: 'San Blas',
      description: 'Barrio artesanal de San Blas',
      district: 'Cusco',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.9700, -13.5100], [-71.9550, -13.5100],
          [-71.9550, -13.5200], [-71.9700, -13.5200],
          [-71.9700, -13.5100],
        ]],
      },
      color: '#3B82F6',
      isActive: true,
      createdBy: admin._id,
    },
    { upsert: true, new: true }
  );

  const zone3 = await Zone.findOneAndUpdate(
    { name: 'Wanchaq' },
    {
      name: 'Wanchaq',
      description: 'Distrito residencial y comercial de Wanchaq',
      district: 'Wanchaq',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-71.9650, -13.5250], [-71.9450, -13.5250],
          [-71.9450, -13.5400], [-71.9650, -13.5400],
          [-71.9650, -13.5250],
        ]],
      },
      color: '#F59E0B',
      isActive: true,
      createdBy: admin._id,
    },
    { upsert: true, new: true }
  );
  console.log('✓ zonas: 3');

  // Asignar la zona Centro Histórico al ciudadano del seed para que pueda
  // ver inMyZone=true cuando un camión opere allí y reciba los pushes
  // por zona.
  await User.findByIdAndUpdate(citizen._id, {
    $set: { zone: zone1._id, profileComplete: true },
  });
  console.log(`✓ citizen.zone asignada a "Centro Histórico"`);

  // ── Waste types ───────────────────────────────────────────────────────────
  const wasteTypes = [
    {
      name: 'Residuos Orgánicos', category: 'organic',
      description: 'Restos de alimentos, cáscaras, hojas y materiales biodegradables',
      examples: ['Cáscaras de fruta', 'Restos de comida', 'Hojas secas', 'Residuos de jardín'],
      handlingInstructions: 'Depositar en bolsa o contenedor marrón. Evitar mezclar con plásticos.',
      colorCode: '#8B4513',
    },
    {
      name: 'Plásticos', category: 'recyclable',
      description: 'Envases plásticos, botellas PET, bolsas',
      examples: ['Botellas PET', 'Envases de yogurt', 'Bolsas plásticas', 'Tapas'],
      handlingInstructions: 'Enjuagar, aplastar y depositar en contenedor blanco.',
      colorCode: '#FFFFFF',
    },
    {
      name: 'Vidrio', category: 'recyclable',
      description: 'Botellas y envases de vidrio',
      examples: ['Botellas de vidrio', 'Frascos', 'Envases de conservas'],
      handlingInstructions: 'Depositar con cuidado en contenedor verde. No mezclar con cerámica.',
      colorCode: '#22C55E',
    },
    {
      name: 'Papel y Cartón', category: 'recyclable',
      description: 'Papel, cartón, periódicos, revistas',
      examples: ['Periódicos', 'Cajas de cartón', 'Papel de oficina', 'Revistas'],
      handlingInstructions: 'Mantener seco. Depositar en contenedor azul.',
      colorCode: '#3B82F6',
    },
    {
      name: 'Residuos No Reciclables', category: 'non_recyclable',
      description: 'Materiales que no pueden ser reciclados',
      examples: ['Pañales', 'Toallas higiénicas', 'Cerámica rota', 'Colillas'],
      handlingInstructions: 'Depositar en contenedor negro. Cerrar bien la bolsa.',
      colorCode: '#1F2937',
    },
    {
      name: 'Residuos Peligrosos', category: 'hazardous',
      description: 'Materiales que requieren manejo especial',
      examples: ['Pilas', 'Baterías', 'Medicamentos vencidos', 'Aceite usado'],
      handlingInstructions: 'NO mezclar con otros residuos. Llevar a punto de acopio especial.',
      colorCode: '#EF4444',
    },
  ];
  for (const wt of wasteTypes) {
    await WasteType.findOneAndUpdate({ name: wt.name }, wt, { upsert: true });
  }
  console.log(`✓ waste types: ${wasteTypes.length}`);
  const allWasteTypes = await WasteType.find({});

  // ── Vehículos ─────────────────────────────────────────────────────────────
  const vehicle1 = await Vehicle.findOneAndUpdate(
    { plate: 'ABC-123' },
    { plate: 'ABC-123', type: 'compactor', capacity: 8, brand: 'Volvo', model: 'FMX', year: 2022, status: 'available' },
    { upsert: true, new: true }
  );
  const vehicle2 = await Vehicle.findOneAndUpdate(
    { plate: 'DEF-456' },
    { plate: 'DEF-456', type: 'open_truck', capacity: 5, brand: 'Mercedes', model: 'Atego', year: 2021, status: 'available' },
    { upsert: true, new: true }
  );
  console.log('✓ vehículos: 2');

  // ── Rutas ─────────────────────────────────────────────────────────────────
  await Route.findOneAndUpdate(
    { name: 'Ruta Centro AM' },
    {
      name: 'Ruta Centro AM',
      zone: zone1._id,
      vehicle: vehicle1._id,
      operator: operatorUser._id,
      wasteTypes: allWasteTypes.filter(w => w.category !== 'hazardous').map(w => w._id),
      schedule: { dayOfWeek: [1, 3, 5], startTime: '06:00', estimatedDuration: 180 },
      waypoints: [
        { order: 1, name: 'Plaza de Armas',       location: { type: 'Point', coordinates: [-71.9781, -13.5163] }, estimatedArrival: '06:00' },
        { order: 2, name: 'Calle Hatunrumiyoc',   location: { type: 'Point', coordinates: [-71.9745, -13.5155] }, estimatedArrival: '06:30' },
        { order: 3, name: 'Mercado San Pedro',    location: { type: 'Point', coordinates: [-71.9815, -13.5197] }, estimatedArrival: '07:00' },
        { order: 4, name: 'Av. El Sol',           location: { type: 'Point', coordinates: [-71.9770, -13.5210] }, estimatedArrival: '07:30' },
        { order: 5, name: 'Calle Mantas',         location: { type: 'Point', coordinates: [-71.9788, -13.5175] }, estimatedArrival: '08:00' },
      ],
      path: {
        type: 'LineString',
        coordinates: [
          [-71.9781, -13.5163], [-71.9745, -13.5155], [-71.9815, -13.5197],
          [-71.9770, -13.5210], [-71.9788, -13.5175],
        ],
      },
      status: 'active',
      createdBy: admin._id,
    },
    { upsert: true }
  );

  await Route.findOneAndUpdate(
    { name: 'Ruta Wanchaq PM' },
    {
      name: 'Ruta Wanchaq PM',
      zone: zone3._id,
      vehicle: vehicle2._id,
      operator: operatorUser._id,
      wasteTypes: allWasteTypes.filter(w => w.category === 'organic' || w.category === 'recyclable').map(w => w._id),
      schedule: { dayOfWeek: [2, 4, 6], startTime: '14:00', estimatedDuration: 150 },
      waypoints: [
        { order: 1, name: 'Óvalo Pachacútec',   location: { type: 'Point', coordinates: [-71.9575, -13.5310] }, estimatedArrival: '14:00' },
        { order: 2, name: 'Av. de la Cultura',   location: { type: 'Point', coordinates: [-71.9550, -13.5330] }, estimatedArrival: '14:30' },
        { order: 3, name: 'Parque Zarzuela',     location: { type: 'Point', coordinates: [-71.9520, -13.5350] }, estimatedArrival: '15:00' },
      ],
      path: {
        type: 'LineString',
        coordinates: [[-71.9575, -13.5310], [-71.9550, -13.5330], [-71.9520, -13.5350]],
      },
      status: 'active',
      createdBy: admin._id,
    },
    { upsert: true }
  );
  console.log('✓ rutas: 2');

  await mongoose.disconnect();
  console.log('\n══════════════════════════════════════════════');
  console.log(' Seed completado. Credenciales:');
  console.log('══════════════════════════════════════════════');
  console.log(' admin    : admin@residuos.cusco.gob.pe / admin123');
  console.log(' operator : operador@residuos.cusco.gob.pe / operator123');
  console.log(' driver   : conductor@residuos.cusco.gob.pe / driver123');
  console.log(' citizen  : ciudadano@gmail.com / citizen123');
  console.log('══════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

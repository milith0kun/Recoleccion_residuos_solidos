import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connection';
import User from '@/lib/models/User';
import Zone from '@/lib/models/Zone';
import WasteType from '@/lib/models/WasteType';
import Vehicle from '@/lib/models/Vehicle';
import Route from '@/lib/models/Route';
import { successResponse, errorResponse } from '@/lib/utils/response';

export async function POST() {
  try {
    await connectDB();

    await User.deleteMany({});
    await Zone.deleteMany({});
    await WasteType.deleteMany({});
    await Vehicle.deleteMany({});
    await Route.deleteMany({});

    // Create admin
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

    // Create operator
    const opPassword = await bcrypt.hash('operator123', 12);
    const operator = await User.findOneAndUpdate(
      { email: 'operador@residuos.cusco.gob.pe' },
      {
        email: 'operador@residuos.cusco.gob.pe',
        password: opPassword,
        dni: '70000002',
        firstName: 'Miguel',
        lastName: 'Huamán Torres',
        role: 'operator',
        phone: '984333444',
        address: 'Calle Saphi 45, Cusco',
        isActive: true,
        isVerified: true,
      },
      { upsert: true, new: true }
    );

    // Create citizen
    const citPassword = await bcrypt.hash('citizen123', 12);
    await User.findOneAndUpdate(
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

    // Create zones (Cusco real coordinates)
    const zone1 = await Zone.findOneAndUpdate(
      { name: 'Centro Histórico' },
      {
        name: 'Centro Histórico',
        description: 'Zona monumental del centro de la ciudad del Cusco',
        district: 'Cusco',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-71.9850, -13.5100],
            [-71.9700, -13.5100],
            [-71.9700, -13.5250],
            [-71.9850, -13.5250],
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
            [-71.9700, -13.5100],
            [-71.9550, -13.5100],
            [-71.9550, -13.5200],
            [-71.9700, -13.5200],
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
            [-71.9650, -13.5250],
            [-71.9450, -13.5250],
            [-71.9450, -13.5400],
            [-71.9650, -13.5400],
            [-71.9650, -13.5250],
          ]],
        },
        color: '#F59E0B',
        isActive: true,
        createdBy: admin._id,
      },
      { upsert: true, new: true }
    );

    // Create waste types
    const wasteTypes = [
      {
        name: 'Residuos Orgánicos',
        category: 'organic',
        description: 'Restos de alimentos, cáscaras, hojas y materiales biodegradables',
        examples: ['Cáscaras de fruta', 'Restos de comida', 'Hojas secas', 'Residuos de jardín'],
        handlingInstructions: 'Depositar en bolsa o contenedor marrón. Evitar mezclar con plásticos.',
        colorCode: '#8B4513',
      },
      {
        name: 'Plásticos',
        category: 'recyclable',
        description: 'Envases plásticos, botellas PET, bolsas',
        examples: ['Botellas PET', 'Envases de yogurt', 'Bolsas plásticas', 'Tapas'],
        handlingInstructions: 'Enjuagar, aplastar y depositar en contenedor blanco.',
        colorCode: '#FFFFFF',
      },
      {
        name: 'Vidrio',
        category: 'recyclable',
        description: 'Botellas y envases de vidrio',
        examples: ['Botellas de vidrio', 'Frascos', 'Envases de conservas'],
        handlingInstructions: 'Depositar con cuidado en contenedor verde. No mezclar con cerámica.',
        colorCode: '#22C55E',
      },
      {
        name: 'Papel y Cartón',
        category: 'recyclable',
        description: 'Papel, cartón, periódicos, revistas',
        examples: ['Periódicos', 'Cajas de cartón', 'Papel de oficina', 'Revistas'],
        handlingInstructions: 'Mantener seco. Depositar en contenedor azul.',
        colorCode: '#3B82F6',
      },
      {
        name: 'Residuos No Reciclables',
        category: 'non_recyclable',
        description: 'Materiales que no pueden ser reciclados',
        examples: ['Pañales', 'Toallas higiénicas', 'Cerámica rota', 'Colillas'],
        handlingInstructions: 'Depositar en contenedor negro. Cerrar bien la bolsa.',
        colorCode: '#1F2937',
      },
      {
        name: 'Residuos Peligrosos',
        category: 'hazardous',
        description: 'Materiales que requieren manejo especial',
        examples: ['Pilas', 'Baterías', 'Medicamentos vencidos', 'Aceite usado'],
        handlingInstructions: 'NO mezclar con otros residuos. Llevar a punto de acopio especial.',
        colorCode: '#EF4444',
      },
    ];

    for (const wt of wasteTypes) {
      await WasteType.findOneAndUpdate({ name: wt.name }, wt, { upsert: true });
    }

    const allWasteTypes = await WasteType.find({});

    // Create vehicles
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

    // Create routes
    await Route.findOneAndUpdate(
      { name: 'Ruta Centro AM' },
      {
        name: 'Ruta Centro AM',
        zone: zone1._id,
        vehicle: vehicle1._id,
        operator: operator._id,
        wasteTypes: allWasteTypes.filter(w => w.category !== 'hazardous').map(w => w._id),
        schedule: { dayOfWeek: [1, 3, 5], startTime: '06:00', estimatedDuration: 180 },
        waypoints: [
          { order: 1, name: 'Plaza de Armas', location: { type: 'Point', coordinates: [-71.9781, -13.5163] }, estimatedArrival: '06:00' },
          { order: 2, name: 'Calle Hatunrumiyoc', location: { type: 'Point', coordinates: [-71.9745, -13.5155] }, estimatedArrival: '06:30' },
          { order: 3, name: 'Mercado San Pedro', location: { type: 'Point', coordinates: [-71.9815, -13.5197] }, estimatedArrival: '07:00' },
          { order: 4, name: 'Av. El Sol', location: { type: 'Point', coordinates: [-71.9770, -13.5210] }, estimatedArrival: '07:30' },
          { order: 5, name: 'Calle Mantas', location: { type: 'Point', coordinates: [-71.9788, -13.5175] }, estimatedArrival: '08:00' },
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
        operator: operator._id,
        wasteTypes: allWasteTypes.filter(w => w.category === 'organic' || w.category === 'recyclable').map(w => w._id),
        schedule: { dayOfWeek: [2, 4, 6], startTime: '14:00', estimatedDuration: 150 },
        waypoints: [
          { order: 1, name: 'Óvalo Pachacútec', location: { type: 'Point', coordinates: [-71.9575, -13.5310] }, estimatedArrival: '14:00' },
          { order: 2, name: 'Av. de la Cultura', location: { type: 'Point', coordinates: [-71.9550, -13.5330] }, estimatedArrival: '14:30' },
          { order: 3, name: 'Parque Zarzuela', location: { type: 'Point', coordinates: [-71.9520, -13.5350] }, estimatedArrival: '15:00' },
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

    return successResponse({
      message: 'Datos semilla creados exitosamente',
      credentials: {
        admin: { email: 'admin@residuos.cusco.gob.pe', password: 'admin123' },
        operator: { email: 'operador@residuos.cusco.gob.pe', password: 'operator123' },
        citizen: { email: 'ciudadano@gmail.com', password: 'citizen123' },
      },
    }, 'Seed completado', 201);
  } catch (err) {
    console.error('Seed error:', err);
    return errorResponse('Error al ejecutar seed: ' + (err as Error).message, 500);
  }
}

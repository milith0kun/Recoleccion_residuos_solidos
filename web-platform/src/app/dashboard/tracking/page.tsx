'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Radio, 
  Truck, 
  Navigation, 
  Activity, 
  User, 
  Info, 
  Play, 
  Square,
  Map as MapIcon,
  Circle
} from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

interface RouteData {
  _id: string;
  name: string;
  zone: { name: string; color: string; geometry?: { coordinates: number[][][] } };
  vehicle: { plate: string };
  operator: { firstName: string; lastName: string };
  waypoints: { order: number; name: string; location: { coordinates: [number, number] }; estimatedArrival: string }[];
  path: { coordinates: number[][] };
}

interface SimulatedVehicle {
  routeId: string;
  routeName: string;
  plate: string;
  operator: string;
  position: [number, number];
  speed: number;
  progress: number;
  status: 'en_ruta' | 'detenido' | 'completado';
  trail: [number, number][];
}

export default function TrackingPage() {
  const { apiFetch } = useApi();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [vehicles, setVehicles] = useState<Map<string, SimulatedVehicle>>(new Map());
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true)); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch('/api/v1/routes?status=active');
        setRoutes(data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [apiFetch]);

  const startSimulation = useCallback(() => {
    if (routes.length === 0) return;
    setSimulating(true);

    const initial = new Map<string, SimulatedVehicle>();
    routes.forEach(route => {
      if (route.path?.coordinates?.length > 1) {
        const startCoord = route.path.coordinates[0];
        initial.set(route._id, {
          routeId: route._id,
          routeName: route.name,
          plate: route.vehicle?.plate || 'N/A',
          operator: `${route.operator?.firstName || ''} ${route.operator?.lastName || ''}`,
          position: [startCoord[1], startCoord[0]],
          speed: 15 + Math.random() * 10,
          progress: 0,
          status: 'en_ruta',
          trail: [[startCoord[1], startCoord[0]]],
        });
      }
    });
    setVehicles(initial);

    intervalRef.current = setInterval(() => {
      setVehicles(prev => {
        const next = new Map(prev);
        routes.forEach(route => {
          const v = next.get(route._id);
          if (!v || v.status === 'completado') return;

          const coords = route.path.coordinates;
          const newProgress = Math.min(v.progress + 0.02 + Math.random() * 0.01, 1);

          if (newProgress >= 1) {
            v.status = 'completado';
            v.progress = 1;
            return;
          }

          const totalSegments = coords.length - 1;
          const segIndex = Math.floor(newProgress * totalSegments);
          const segProgress = (newProgress * totalSegments) - segIndex;
          const from = coords[Math.min(segIndex, coords.length - 1)];
          const to = coords[Math.min(segIndex + 1, coords.length - 1)];

          const lat = from[1] + (to[1] - from[1]) * segProgress;
          const lng = from[0] + (to[0] - from[0]) * segProgress;

          v.position = [lat, lng];
          v.progress = newProgress;
          v.speed = 10 + Math.random() * 20;
          v.trail = [...v.trail.slice(-50), [lat, lng]];

          next.set(route._id, { ...v });
        });
        return next;
      });
    }, 1000);
  }, [routes]);

  const stopSimulation = useCallback(() => {
    setSimulating(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVehicles(new Map());
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const mapCenter = useMemo(() => [-13.52, -71.967] as [number, number], []);
  const vehicleList = useMemo(() => Array.from(vehicles.values()), [vehicles]);

  const statusColors: Record<string, string> = {
    en_ruta: '#10B981',
    detenido: '#F59E0B',
    completado: '#3B82F6',
  };

  const statusBg: Record<string, string> = {
    en_ruta: 'bg-emerald-50 text-emerald-600',
    detenido: 'bg-amber-50 text-amber-600',
    completado: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Radio className={`w-8 h-8 ${simulating ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            Seguimiento en Tiempo Real
          </h1>
          <p className="text-slate-500 font-medium">Monitoreo GPS de la flota de recolección en Cusco.</p>
        </div>
        <button
          onClick={simulating ? stopSimulation : startSimulation}
          className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${
            simulating 
              ? 'bg-white border-2 border-rose-100 text-rose-600 hover:bg-rose-50 shadow-rose-500/5' 
              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'
          }`}
        >
          {simulating ? (
            <><Square className="w-5 h-5 fill-current" /> Detener Simulación</>
          ) : (
            <><Play className="w-5 h-5 fill-current" /> Iniciar Tracking GPS</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map Card */}
        <div className="lg:col-span-8 bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="relative h-[600px] w-full rounded-[1.5rem] overflow-hidden border border-slate-50">
            {leafletLoaded && !loading ? (
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {routes.map(r => r.zone?.geometry && (
                  <Polygon
                    key={`zone-${r._id}`}
                    positions={r.zone.geometry.coordinates[0].map(c => [c[1], c[0]] as [number, number])}
                    pathOptions={{ color: r.zone.color, fillOpacity: 0.03, weight: 1, dashArray: '8,8' }}
                  />
                ))}

                {routes.map(r => r.path?.coordinates?.length > 1 && (
                  <Polyline
                    key={`path-${r._id}`}
                    positions={r.path.coordinates.map(c => [c[1], c[0]] as [number, number])}
                    pathOptions={{ color: '#E2E8F0', weight: 3, dashArray: '1,8' }}
                  />
                ))}

                {vehicleList.map(v => v.trail.length > 1 && (
                  <Polyline
                    key={`trail-${v.routeId}`}
                    positions={v.trail}
                    pathOptions={{ color: statusColors[v.status], weight: 4, opacity: 0.4 }}
                  />
                ))}

                {vehicleList.map(v => (
                  <CircleMarker
                    key={`vehicle-${v.routeId}`}
                    center={v.position}
                    radius={12}
                    pathOptions={{ color: '#fff', fillColor: statusColors[v.status], fillOpacity: 1, weight: 4 }}
                  >
                    <Popup>
                      <div className="p-2 font-sans min-w-[200px]">
                        <div className="flex items-center justify-between mb-3">
                          <strong className="text-slate-900 text-base">🚛 {v.plate}</strong>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${statusBg[v.status]}`}>
                            {v.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="space-y-1.5 border-t border-slate-50 pt-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                            <Navigation className="w-3 h-3" /> Ruta: <span className="text-slate-700">{v.routeName}</span>
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                            <User className="w-3 h-3" /> Op: <span className="text-slate-700">{v.operator}</span>
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                            <Activity className="w-3 h-3" /> Vel: <span className="text-slate-700">{v.speed.toFixed(0)} km/h</span>
                          </p>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {routes.map(r => r.waypoints?.map(wp => (
                  <CircleMarker
                    key={`wp-${r._id}-${wp.order}`}
                    center={[wp.location.coordinates[1], wp.location.coordinates[0]]}
                    radius={4}
                    pathOptions={{ color: '#CBD5E1', fillColor: '#fff', fillOpacity: 1, weight: 2 }}
                  >
                    <Popup>
                      <div className="p-1">
                        <strong className="text-xs text-slate-900">{wp.name}</strong>
                      </div>
                    </Popup>
                  </CircleMarker>
                )))}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 bg-slate-50">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Cargando Mapa de Tracking...</p>
              </div>
            )}
          </div>
          
          {/* Legend Float */}
          <div className="absolute top-10 right-10 z-[1000] bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/50 shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Leyenda de Estado</p>
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Vehículos Activos</h3>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400">
                {vehicleList.length}
              </div>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {vehicleList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="p-6 rounded-full bg-slate-50 text-slate-200">
                    <Truck className="w-12 h-12" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-tighter px-6">
                    {simulating ? 'Localizando unidades...' : 'Inicia la simulación para visualizar el movimiento de la flota.'}
                  </p>
                </div>
              ) : (
                vehicleList.map(v => (
                  <div key={v.routeId} className="group p-5 rounded-3xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-emerald-100 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white shadow-sm ${statusBg[v.status].split(' ')[1]}`}>
                          <Truck className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black text-slate-900 tracking-tight uppercase">{v.plate}</span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${statusBg[v.status]}`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase mb-1.5">
                          <span>Progreso de Ruta</span>
                          <span className={statusBg[v.status].split(' ')[1]}>{(v.progress * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white border border-slate-100 overflow-hidden shadow-inner p-0.5">
                          <div
                            className="h-full rounded-full transition-all duration-1000 shadow-sm"
                            style={{ width: `${v.progress * 100}%`, background: statusColors[v.status] }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px] uppercase tracking-tighter">{v.routeName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{v.speed.toFixed(0)} KM/H</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {simulating && (
              <div className="mt-8 p-6 rounded-[1.5rem] bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">En Línea</span>
                </div>
                <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                  Recepción de coordenadas activa. Se están procesando datos de {vehicleList.length} unidades en tiempo real.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

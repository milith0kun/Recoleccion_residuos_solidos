'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Radio,
  Truck,
  Navigation,
  Activity,
  User,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const POLL_INTERVAL_MS = 5000;

interface ActiveVehicle {
  executionId: string;
  routeId: string;
  routeName: string;
  operatorName: string;
  vehicle: { plate: string; type: string } | null;
  lastLocation: { lng: number; lat: number; timestamp: string; speed?: number } | null;
  lastSeenAt: string | null;
  isStale: boolean;
  startedAt: string;
}

interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

function formatSecondsAgo(iso: string | null): string {
  if (!iso) return 'sin señal';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5) return 'ahora';
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  return `hace ${hours}h`;
}

export default function TrackingPage() {
  const { apiFetch } = useApi();
  const [vehicles, setVehicles] = useState<ActiveVehicle[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [selectedExecId, setSelectedExecId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const mapRef = useRef<LeafletMap | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  const fetchActive = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/gps/active');
      const list: ActiveVehicle[] = res.data?.data ?? [];
      setVehicles(list);
    } catch (err) {
      console.error('Error fetching active GPS:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const fetchTrail = useCallback(
    async (executionId: string) => {
      try {
        const res = await apiFetch(`/api/v1/gps/track?routeExecution=${executionId}`);
        const points: { lat: number; lng: number; timestamp: string }[] = res.data?.points ?? [];
        // API returns newest-first; reverse for chronological polyline
        setTrail(points.slice(0, 20).reverse());
      } catch (err) {
        console.error('Error fetching trail:', err);
        setTrail([]);
      }
    },
    [apiFetch]
  );

  // Polling for active executions
  useEffect(() => {
    fetchActive();
    intervalRef.current = setInterval(fetchActive, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActive]);

  // Tick clock for "hace Xs" labels
  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Refetch trail when selection changes & periodically
  useEffect(() => {
    if (!selectedExecId) {
      setTrail([]);
      return;
    }
    fetchTrail(selectedExecId);
    const id = setInterval(() => fetchTrail(selectedExecId), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [selectedExecId, fetchTrail]);

  const handleSelect = useCallback((v: ActiveVehicle) => {
    setSelectedExecId(v.executionId);
    if (v.lastLocation && mapRef.current) {
      mapRef.current.flyTo([v.lastLocation.lat, v.lastLocation.lng], 15, { duration: 0.8 });
    }
  }, []);

  const mapCenter = useMemo(() => {
    const withLoc = vehicles.find(v => v.lastLocation);
    if (withLoc?.lastLocation) {
      return [withLoc.lastLocation.lat, withLoc.lastLocation.lng] as [number, number];
    }
    return [-13.52, -71.967] as [number, number];
  }, [vehicles]);

  const staleNow = useCallback(
    (lastSeen: string | null): boolean => {
      if (!lastSeen) return true;
      return now - new Date(lastSeen).getTime() > 30 * 1000;
    },
    [now]
  );

  const liveCount = vehicles.filter(v => !staleNow(v.lastSeenAt)).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Radio className={`w-8 h-8 ${liveCount > 0 ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            Seguimiento en Tiempo Real
          </h1>
          <p className="text-slate-500 font-medium">
            Monitoreo GPS de la flota de recolección · actualización cada 5s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
              {liveCount} en línea
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <Truck className="w-4 h-4 text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
              {vehicles.length} activas
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Map Card */}
        <div className="lg:col-span-8 bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="relative h-[600px] w-full rounded-[1.5rem] overflow-hidden border border-slate-50">
            {leafletLoaded && !loading ? (
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                ref={(instance) => { mapRef.current = instance as LeafletMap | null; }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {/* Trail for selected execution */}
                {trail.length > 1 && (
                  <Polyline
                    positions={trail.map(p => [p.lat, p.lng] as [number, number])}
                    pathOptions={{ color: '#10B981', weight: 4, opacity: 0.45 }}
                  />
                )}

                {/* Vehicle markers */}
                {vehicles.map(v => {
                  if (!v.lastLocation) return null;
                  const stale = staleNow(v.lastSeenAt);
                  const isSelected = v.executionId === selectedExecId;
                  const color = stale ? '#F59E0B' : '#10B981';
                  return (
                    <CircleMarker
                      key={v.executionId}
                      center={[v.lastLocation.lat, v.lastLocation.lng]}
                      radius={isSelected ? 14 : 11}
                      pathOptions={{
                        color: '#fff',
                        fillColor: color,
                        fillOpacity: 1,
                        weight: isSelected ? 5 : 4,
                      }}
                      eventHandlers={{
                        click: () => handleSelect(v),
                      }}
                    >
                      <Popup>
                        <div className="p-2 font-sans min-w-[220px]">
                          <div className="flex items-center justify-between mb-3">
                            <strong className="text-slate-900 text-base">
                              {v.vehicle?.plate ?? 'Sin vehículo'}
                            </strong>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                stale
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {stale ? 'Sin señal' : 'En vivo'}
                            </span>
                          </div>
                          <div className="space-y-1.5 border-t border-slate-50 pt-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                              <Navigation className="w-3 h-3" />
                              Ruta: <span className="text-slate-700">{v.routeName}</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                              <User className="w-3 h-3" />
                              Op: <span className="text-slate-700">{v.operatorName}</span>
                            </p>
                            {typeof v.lastLocation.speed === 'number' && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                <Activity className="w-3 h-3" />
                                Vel:{' '}
                                <span className="text-slate-700">
                                  {v.lastLocation.speed.toFixed(0)} km/h
                                </span>
                              </p>
                            )}
                            <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                              {stale ? (
                                <WifiOff className="w-3 h-3 text-amber-500" />
                              ) : (
                                <Wifi className="w-3 h-3 text-emerald-500" />
                              )}
                              Última señal:{' '}
                              <span className="text-slate-700">
                                {formatSecondsAgo(v.lastSeenAt)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 bg-slate-50">
                <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Cargando Mapa de Tracking...
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="absolute top-10 right-10 z-[1000] bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/50 shadow-2xl space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
              Estado GPS
            </p>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                En vivo
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                Sin señal &gt;30s
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-1 bg-emerald-500 opacity-60 rounded-full" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                Trail seleccionado
              </span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Vehículos Activos
              </h3>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400">
                {vehicles.length}
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="p-6 rounded-full bg-slate-50 text-slate-200">
                    <Truck className="w-12 h-12" />
                  </div>
                  <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-tighter px-6">
                    No hay camiones operando ahora
                  </p>
                  <p className="text-xs font-medium text-slate-300 leading-relaxed px-6 normal-case">
                    Cuando un operador inicie su ruta desde la app móvil, aparecerá aquí en tiempo real.
                  </p>
                </div>
              ) : (
                vehicles.map(v => {
                  const stale = staleNow(v.lastSeenAt);
                  const isSelected = v.executionId === selectedExecId;
                  return (
                    <button
                      type="button"
                      key={v.executionId}
                      onClick={() => handleSelect(v)}
                      className={`w-full text-left group p-5 rounded-3xl border transition-all duration-300 ${
                        isSelected
                          ? 'bg-white border-emerald-200 shadow-md ring-2 ring-emerald-100'
                          : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-emerald-100 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl bg-white shadow-sm ${
                              stale ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            <Truck className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black text-slate-900 tracking-tight uppercase">
                            {v.vehicle?.plate ?? '—'}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1 ${
                            stale
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {stale ? (
                            <>
                              <AlertTriangle className="w-3 h-3" /> sin señal
                            </>
                          ) : (
                            <>
                              <Wifi className="w-3 h-3" /> en vivo
                            </>
                          )}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-3 h-3 text-slate-300" />
                          <span className="text-[11px] font-bold text-slate-600 truncate">
                            {v.routeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-300" />
                          <span className="text-[11px] font-bold text-slate-500 truncate">
                            {v.operatorName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {formatSecondsAgo(v.lastSeenAt)}
                          </span>
                          {v.lastLocation && typeof v.lastLocation.speed === 'number' && (
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {v.lastLocation.speed.toFixed(0)} km/h
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {vehicles.length > 0 && (
              <div className="mt-8 p-6 rounded-[1.5rem] bg-emerald-50 border border-emerald-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                    Polling activo
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-800 leading-relaxed">
                  Recibiendo coordenadas cada {POLL_INTERVAL_MS / 1000}s. Selecciona un vehículo para ver su trail.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

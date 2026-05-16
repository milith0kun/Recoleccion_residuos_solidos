'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Truck,
  Clock,
  Calendar,
  User,
  Route as RouteIcon,
  Search,
  CheckCircle2,
  Clock3,
  Play,
  Pause,
  Flag,
  Plus,
  Trash2,
  Save,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import type { LeafletMouseEvent, Map as LeafletMap, CircleMarker as LeafletCircleMarker } from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });

// Helper child rendered inside MapContainer to capture clicks (uses hook).
const MapClickCapture = dynamic(
  () => import('@/components/map/MapClickCapture'),
  { ssr: false }
);

type RouteStatus = 'draft' | 'pending' | 'active' | 'completed' | 'inactive';

interface Waypoint {
  order: number;
  name: string;
  location: { type?: 'Point'; coordinates: [number, number] };
  estimatedArrival: string;
}

interface RouteData {
  _id: string;
  name: string;
  status: RouteStatus;
  zone: { _id: string; name: string; district: string; color: string; geometry?: { coordinates: number[][][] } };
  vehicle: { plate: string; type: string };
  operator: { firstName: string; lastName: string; email: string };
  wasteTypes: { name: string; category: string; colorCode: string }[];
  schedule: { dayOfWeek: number[]; startTime: string; estimatedDuration: number };
  waypoints: Waypoint[];
  path: { coordinates: number[][] };
}

const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const statusMeta: Record<RouteStatus, {
  label: string;
  badgeBg: string;
  badgeText: string;
  ring: string;
  dotBg: string;
  pulse?: boolean;
}> = {
  draft:     { label: 'Borrador',  badgeBg: 'bg-slate-50',    badgeText: 'text-slate-400',   ring: 'border-slate-200',   dotBg: 'bg-slate-400' },
  pending:   { label: 'Pendiente', badgeBg: 'bg-amber-50',    badgeText: 'text-amber-600',   ring: 'border-amber-200',   dotBg: 'bg-amber-500' },
  active:    { label: 'Activa',    badgeBg: 'bg-emerald-50',  badgeText: 'text-emerald-700', ring: 'border-emerald-300', dotBg: 'bg-emerald-600', pulse: true },
  completed: { label: 'Completada',badgeBg: 'bg-sky-50',      badgeText: 'text-sky-600',     ring: 'border-sky-200',     dotBg: 'bg-sky-500' },
  inactive:  { label: 'Inactiva',  badgeBg: 'bg-red-50',      badgeText: 'text-red-400',     ring: 'border-red-200',     dotBg: 'bg-red-400' },
};

const statusOrder: RouteStatus[] = ['draft', 'pending', 'active', 'completed', 'inactive'];

/* --------------------------- Path style by status --------------------------- */
function pathStyleFor(status: RouteStatus) {
  switch (status) {
    case 'active':
      return { color: '#059669', weight: 6, opacity: 1.0, dashArray: undefined, lineCap: 'round' as const };
    case 'completed':
      return { color: '#0EA5E9', weight: 4, opacity: 0.6, dashArray: '12,8', lineCap: 'round' as const };
    case 'pending':
    case 'draft':
      return { color: '#94A3B8', weight: 3, opacity: 0.4, dashArray: '4,8', lineCap: 'round' as const };
    case 'inactive':
      return { color: '#FCA5A5', weight: 2, opacity: 0.3, dashArray: '2,10', lineCap: 'round' as const };
  }
}

/* -------------------------------- Component -------------------------------- */
export default function RoutesPage() {
  const { apiFetch } = useApi();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RouteStatus | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Edit mode for waypoints
  const [editMode, setEditMode] = useState(false);
  const [draftWaypoints, setDraftWaypoints] = useState<Waypoint[]>([]);
  const [addingMode, setAddingMode] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  const fetchRoutes = useCallback(async () => {
    const data = await apiFetch('/api/v1/routes');
    const list: RouteData[] = data.data || [];
    return list;
  }, [apiFetch]);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchRoutes();
      setRoutes(list);
      setSelectedRoute(prev => (prev && list.some(r => r._id === prev) ? prev : list[0]?._id ?? null));
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  }, [fetchRoutes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchRoutes();
        if (cancelled) return;
        setRoutes(list);
        if (list.length > 0) setSelectedRoute(list[0]._id);
      } catch (err) {
        console.error(err);
        if (!cancelled) toast.error('Error al cargar rutas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchRoutes]);

  const activeRoute = useMemo(
    () => routes.find(r => r._id === selectedRoute) || null,
    [routes, selectedRoute]
  );

  const mapCenter = useMemo(() => [-13.5226, -71.9673] as [number, number], []);

  const filteredRoutes = useMemo(() => {
    return routes.filter(r => {
      if (!showInactive && r.status === 'inactive') return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search.trim() && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [routes, search, statusFilter, showInactive]);

  const visibleOnMap = useMemo(() => {
    return routes.filter(r => showInactive || r.status !== 'inactive');
  }, [routes, showInactive]);

  /* -------------------------- Status counters -------------------------- */
  const counts = useMemo(() => {
    const map: Record<RouteStatus, number> = {
      draft: 0, pending: 0, active: 0, completed: 0, inactive: 0,
    };
    routes.forEach(r => { map[r.status] = (map[r.status] || 0) + 1; });
    return map;
  }, [routes]);

  /* -------------------------- Status actions --------------------------- */
  const patchStatus = async (id: string, status: RouteStatus) => {
    try {
      setBusy(true);
      await apiFetch(`/api/v1/routes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Estado actualizado: ${statusMeta[status].label}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  /* --------------------- Waypoint edit-mode handlers -------------------- */
  const enterEdit = () => {
    if (!activeRoute) return;
    setDraftWaypoints(activeRoute.waypoints.map(w => ({ ...w, location: { type: 'Point', coordinates: [...w.location.coordinates] as [number, number] } })));
    setEditMode(true);
    setAddingMode(false);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraftWaypoints([]);
    setAddingMode(false);
  };

  const addWaypoint = useCallback((e: LeafletMouseEvent) => {
    setDraftWaypoints(prev => {
      const order = (prev[prev.length - 1]?.order ?? 0) + 1;
      const wp: Waypoint = {
        order,
        name: `Parada ${order}`,
        location: { type: 'Point', coordinates: [e.latlng.lng, e.latlng.lat] },
        estimatedArrival: '',
      };
      return [...prev, wp];
    });
    setAddingMode(false);
  }, []);

  const moveWaypoint = (order: number, lng: number, lat: number) => {
    setDraftWaypoints(prev =>
      prev.map(w =>
        w.order === order
          ? { ...w, location: { type: 'Point', coordinates: [lng, lat] } }
          : w
      )
    );
  };

  const removeWaypoint = (order: number) => {
    setDraftWaypoints(prev =>
      prev
        .filter(w => w.order !== order)
        .map((w, idx) => ({ ...w, order: idx + 1, name: w.name.startsWith('Parada ') ? `Parada ${idx + 1}` : w.name }))
    );
  };

  const renameWaypoint = (order: number, name: string) => {
    setDraftWaypoints(prev => prev.map(w => w.order === order ? { ...w, name } : w));
  };

  const draftPath = useMemo(() => {
    return draftWaypoints.map(w => w.location.coordinates);
  }, [draftWaypoints]);

  const saveWaypoints = async () => {
    if (!activeRoute) return;
    try {
      setBusy(true);
      await apiFetch(`/api/v1/routes/${activeRoute._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          waypoints: draftWaypoints,
          path: { type: 'LineString', coordinates: draftPath },
        }),
      });
      toast.success('Paradas actualizadas');
      setEditMode(false);
      setDraftWaypoints([]);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  /* ----------------- Polyline + waypoints (effective) ------------------ */
  const effectiveWaypoints: Waypoint[] = useMemo(() => {
    if (!activeRoute) return [];
    return editMode ? draftWaypoints : activeRoute.waypoints;
  }, [activeRoute, editMode, draftWaypoints]);

  /* ============================ RENDER ============================ */
  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Rutas de Recolección</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Planificación estratégica y control de itinerarios logísticos.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInactive(s => !s)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
              showInactive
                ? 'bg-red-50 text-red-500 border-red-100'
                : 'bg-white text-slate-400 border-slate-100 hover:text-slate-600'
            }`}
          >
            {showInactive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Ver inactivas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar - Route list */}
        <div className="lg:col-span-4 space-y-5 max-h-[860px] overflow-y-auto pr-3 custom-scrollbar scroll-smooth">
          <div className="sticky top-0 bg-[#FAFAF8]/85 backdrop-blur-md pb-4 z-20 space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar ruta específica..."
                className="w-full pl-12 pr-4 py-3.5 rounded-[1.25rem] bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm outline-none"
              />
            </div>

            {/* Status chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                }`}
              >
                Todas · {routes.length}
              </button>
              {statusOrder.map(s => {
                const m = statusMeta[s];
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(active ? 'all' : s)}
                    className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${
                      active ? `${m.badgeBg} ${m.badgeText} ${m.ring}` : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${m.dotBg} ${m.pulse && active ? 'animate-pulse' : ''}`} />
                    {m.label} · {counts[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando itinerarios...</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 border border-slate-100 text-center">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin resultados</p>
            </div>
          ) : filteredRoutes.map((route, idx) => {
            const m = statusMeta[route.status];
            const isSelected = selectedRoute === route._id;
            return (
              <div
                key={route._id}
                className={`w-full text-left rounded-[2rem] transition-all duration-500 border-2 group relative overflow-hidden ${
                  isSelected
                    ? 'bg-white border-emerald-500 shadow-xl shadow-emerald-500/10 ring-8 ring-emerald-500/5 translate-x-2'
                    : 'bg-white border-white hover:border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1'
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <button
                  onClick={() => { if (!editMode) setSelectedRoute(route._id); }}
                  className="w-full text-left p-6 pb-2"
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 rounded-full -mr-12 -mt-12 opacity-5" />
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-black text-sm tracking-tight ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {route.name}
                    </h3>
                    <span className={`text-[9px] font-black px-3 py-1 rounded-xl uppercase tracking-widest border ${m.badgeBg} ${m.badgeText} ${m.ring} flex items-center gap-1.5`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dotBg} ${m.pulse ? 'animate-pulse' : ''}`} />
                      {m.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 mb-5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="p-1.5 rounded-lg bg-slate-50">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{route.vehicle?.plate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="p-1.5 rounded-lg bg-slate-50">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {route.operator?.firstName?.[0]}. {route.operator?.lastName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      {route.schedule.dayOfWeek.map(d => (
                        <span key={d} className="text-[9px] font-black w-7 h-6 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-transparent">
                          {dayLabels[d]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <span className="text-[11px] font-black tracking-widest">{route.schedule.startTime}</span>
                    </div>
                  </div>
                </button>

                {/* Quick state actions */}
                <div className="px-6 pb-5 pt-2 flex flex-wrap gap-2 border-t border-slate-50">
                  {route.status === 'draft' || route.status === 'pending' ? (
                    <button
                      disabled={busy}
                      onClick={() => patchStatus(route._id, 'active')}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Play className="w-3 h-3" /> Iniciar
                    </button>
                  ) : null}
                  {route.status === 'active' ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => patchStatus(route._id, 'completed')}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Flag className="w-3 h-3" /> Completada
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => patchStatus(route._id, 'inactive')}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Pause className="w-3 h-3" /> Pausar
                      </button>
                    </>
                  ) : null}
                  {route.status === 'completed' ? (
                    <button
                      disabled={busy}
                      onClick={() => patchStatus(route._id, 'draft')}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      Reabrir
                    </button>
                  ) : null}
                  {route.status === 'inactive' ? (
                    <button
                      disabled={busy}
                      onClick={() => patchStatus(route._id, 'draft')}
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      Reactivar
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main - Map + details */}
        <div className="lg:col-span-8 space-y-8">
          {/* Map Card */}
          <div className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 overflow-hidden relative">
            <div className={`relative h-[560px] w-full rounded-[2rem] overflow-hidden border border-slate-50 shadow-inner bg-slate-50 ${addingMode ? 'cursor-crosshair' : ''}`}>
              {leafletLoaded && !loading ? (
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  <MapClickCapture onClick={addWaypoint} enabled={editMode && addingMode} />

                  {/* Active zone polygon (for selected) */}
                  {activeRoute?.zone?.geometry && (
                    <Polygon
                      positions={activeRoute.zone.geometry.coordinates[0].map(c => [c[1], c[0]] as [number, number])}
                      pathOptions={{ color: activeRoute.zone.color, fillOpacity: 0.06, weight: 3, dashArray: '10,10' }}
                    />
                  )}

                  {/* All visible routes paths (faded for non-selected) */}
                  {visibleOnMap.map(r => {
                    if (!r.path?.coordinates || r.path.coordinates.length < 2) return null;
                    const baseStyle = pathStyleFor(r.status);
                    const isSel = r._id === activeRoute?._id;
                    return (
                      <Polyline
                        key={`pl-${r._id}`}
                        positions={r.path.coordinates.map(c => [c[1], c[0]] as [number, number])}
                        pathOptions={{
                          ...baseStyle,
                          opacity: isSel ? baseStyle.opacity : Math.max(0.15, baseStyle.opacity * 0.35),
                          weight: isSel ? baseStyle.weight : Math.max(1, baseStyle.weight - 2),
                        }}
                      />
                    );
                  })}

                  {/* Edit-mode draft polyline */}
                  {editMode && draftPath.length > 1 && (
                    <Polyline
                      positions={draftPath.map(c => [c[1], c[0]] as [number, number])}
                      pathOptions={{ color: '#059669', weight: 5, opacity: 0.7, dashArray: '4,8' }}
                    />
                  )}

                  {/* Selected route waypoints */}
                  {effectiveWaypoints.map(wp => {
                    const lat = wp.location.coordinates[1];
                    const lng = wp.location.coordinates[0];
                    return (
                      <CircleMarker
                        key={`wp-${wp.order}`}
                        center={[lat, lng]}
                        radius={editMode ? 9 : 8}
                        pathOptions={{
                          color: '#fff',
                          fillColor: editMode ? '#10B981' : '#059669',
                          fillOpacity: 1,
                          weight: 3,
                        }}
                        eventHandlers={
                          editMode
                            ? {
                                mousedown: (ev) => {
                                  const layer = ev.target as LeafletCircleMarker & { _map?: LeafletMap };
                                  const map = layer._map;
                                  if (!map) return;
                                  map.dragging.disable();
                                  const onMove = (mv: LeafletMouseEvent) => {
                                    moveWaypoint(wp.order, mv.latlng.lng, mv.latlng.lat);
                                  };
                                  const onUp = () => {
                                    map.off('mousemove', onMove);
                                    map.off('mouseup', onUp);
                                    map.dragging.enable();
                                  };
                                  map.on('mousemove', onMove);
                                  map.on('mouseup', onUp);
                                },
                              }
                            : undefined
                        }
                      >
                        <Popup>
                          <div className="p-2 font-sans min-w-[160px]">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-600/20">
                                {wp.order}
                              </div>
                              <strong className="text-slate-900 text-sm font-black tracking-tight">{wp.name}</strong>
                            </div>
                            {wp.estimatedArrival && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <Clock className="w-3.5 h-3.5 text-emerald-500" /> {wp.estimatedArrival}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-6">
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Cargando Cartografía Operativa...</p>
                </div>
              )}
            </div>

            {/* Map Info Overlay */}
            <div className="absolute top-10 right-10 z-[500] bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white shadow-2xl shadow-slate-900/10 hidden md:flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500 text-white shadow-lg">
                <RouteIcon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {editMode ? 'Modo Edición · Paradas' : 'Monitoreo de Itinerario'}
              </span>
            </div>

            {/* Editor controls */}
            {activeRoute && (
              <div className="absolute bottom-10 left-10 right-10 z-[500] flex flex-wrap gap-2 items-center justify-between bg-white/95 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white shadow-2xl shadow-slate-900/10">
                {!editMode ? (
                  <>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor de Itinerario</p>
                      <p className="text-xs font-bold text-slate-700 tracking-tight">{activeRoute.waypoints.length} paradas registradas</p>
                    </div>
                    <button
                      onClick={enterEdit}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Editar paradas
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${addingMode ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                        {addingMode ? 'Clic en el mapa para agregar' : `${draftWaypoints.length} paradas en edición`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setAddingMode(m => !m)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors ${
                          addingMode
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" /> {addingMode ? 'Cancelar agregar' : 'Agregar parada'}
                      </button>
                      <button
                        onClick={saveWaypoints}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" /> Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:border-red-200 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Details Card */}
          {activeRoute && (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-40" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-[1.5rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/20">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Detalles del Itinerario</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{activeRoute.name}</p>
                  </div>
                </div>
                <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 text-right">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Duración Estimada</p>
                  <p className="text-2xl font-black text-emerald-700 tracking-tighter">
                    {activeRoute.schedule.estimatedDuration} <span className="text-sm font-bold opacity-70">MIN</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
                {/* Waypoints timeline */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {editMode ? 'Paradas en edición' : 'Cronograma de Paradas'}
                      </p>
                    </div>
                  </div>

                  <div className="relative pl-8 space-y-5">
                    <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500 via-slate-100 to-slate-50" />
                    {effectiveWaypoints.map(wp => (
                      <div key={wp.order} className="relative flex items-center gap-4 group/item">
                        <div className="absolute left-[-24px] w-4 h-4 rounded-full border-4 border-white bg-emerald-500 shadow-sm" />
                        <div className="flex-1 p-4 rounded-3xl bg-slate-50/50 border border-slate-100 transition-all">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-[10px] font-black text-slate-300 uppercase shrink-0">#{wp.order}</span>
                              {editMode ? (
                                <input
                                  value={wp.name}
                                  onChange={e => renameWaypoint(wp.order, e.target.value)}
                                  className="text-sm font-black text-slate-800 tracking-tight bg-transparent border-b border-emerald-100 focus:border-emerald-500 outline-none flex-1 min-w-0"
                                />
                              ) : (
                                <span className="text-sm font-black text-slate-800 tracking-tight truncate">{wp.name}</span>
                              )}
                            </div>
                            {wp.estimatedArrival && !editMode && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/50 px-3 py-1 rounded-lg border border-emerald-100/50">
                                <Clock3 className="w-3.5 h-3.5" /> {wp.estimatedArrival}
                              </div>
                            )}
                            {editMode && (
                              <button
                                onClick={() => removeWaypoint(wp.order)}
                                className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="Eliminar parada"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {effectiveWaypoints.length === 0 && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Sin paradas. Usa &quot;Agregar parada&quot; en el mapa.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right col info */}
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Residuos Clasificados</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {activeRoute.wasteTypes.map((wt) => (
                        <div key={wt.name} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <div className="w-3 h-3 rounded-full" style={{ background: wt.colorCode }} />
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest truncate">{wt.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xl shadow-emerald-600/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="flex items-center gap-4 mb-6 relative">
                      <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-lg font-black uppercase tracking-widest">Geofencing Activo</h4>
                    </div>
                    <div className="space-y-4 relative">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-100">Sector</span>
                        <span className="text-sm font-bold text-white">{activeRoute.zone.name}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-100">Distrito</span>
                        <span className="text-sm font-bold text-white">{activeRoute.zone.district}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

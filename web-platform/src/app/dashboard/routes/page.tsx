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
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);

  // Edit mode for waypoints
  const [editMode, setEditMode] = useState(false);
  const [draftWaypoints, setDraftWaypoints] = useState<Waypoint[]>([]);
  const [addingMode, setAddingMode] = useState(false);
  const [busy, setBusy] = useState(false);

  // Active tab for details panel
  const [detailsTab, setDetailsTab] = useState<'schedule' | 'waste' | 'zone'>('schedule');

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
      if (zoneFilter !== 'all' && r.zone?._id !== zoneFilter) return false;
      if (search.trim() && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [routes, search, statusFilter, zoneFilter, showInactive]);

  const zones = useMemo(() => {
    const map = new Map<string, string>();
    routes.forEach((r) => {
      if (r.zone?._id && r.zone?.name) map.set(r.zone._id, r.zone.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [routes]);

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

  const duplicateRoute = async (route: RouteData) => {
    try {
      setBusy(true);
      await apiFetch('/api/v1/routes', {
        method: 'POST',
        body: JSON.stringify({
          templateFrom: route._id,
          name: `${route.name} (copia)`,
          status: 'draft',
        }),
      });
      toast.success('Ruta duplicada como plantilla editable');
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
    <div className="adm-page animate-fade-in">
      <style>{routeStyles}</style>

      <header className="adm-header">
        <div>
          <h1 className="adm-title">
            Rutas <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>de recolección</em>.
          </h1>
          <p className="adm-sub">
            Planificación de itinerarios y control de operadores asignados.
          </p>
        </div>
        <div className="adm-header-actions">
          <button
            onClick={() => setShowInactive((s) => !s)}
            className={showInactive ? 'adm-btn-secondary rt-toggle--on' : 'adm-btn-secondary'}
          >
            {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{showInactive ? 'Ocultar inactivas' : 'Ver inactivas'}</span>
          </button>
        </div>
      </header>

      <div className="rt-grid">
        {/* Sidebar - Route list */}
        <div className="rt-list">
          <div className="rt-list-head">
            <div className="adm-search" style={{ maxWidth: 'none' }}>
              <Search size={14} className="adm-search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ruta"
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <select
                className="adm-filter"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="all">Todas las zonas</option>
                {zones.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            {/* Status chips */}
            <div className="rt-chips">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rt-chip ${statusFilter === 'all' ? 'rt-chip--active' : ''}`}
              >
                Todas · {routes.length}
              </button>
              {statusOrder.map((s) => {
                const m = statusMeta[s];
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(active ? 'all' : s)}
                    className={`rt-chip rt-chip--${s} ${active ? 'rt-chip--active' : ''}`}
                  >
                    <span className="rt-chip-dot" />
                    {m.label} · {counts[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="rt-state">
              <div className="adm-spinner" />
              <p className="rt-state-text">Sincronizando itinerarios…</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="adm-section rt-empty">
              <p>
                {zoneFilter !== 'all'
                  ? 'No existen rutas registradas para la zona seleccionada.'
                  : 'Sin resultados'}
              </p>
            </div>
          ) : filteredRoutes.map((route) => {
            const m = statusMeta[route.status];
            const isSelected = selectedRoute === route._id;
            return (
              <button
                key={route._id}
                onClick={() => { if (!editMode) setSelectedRoute(route._id); }}
                className={`rt-card rt-card--${route.status} ${isSelected ? 'rt-card--selected' : ''}`}
                type="button"
              >
                <div className="rt-card-head">
                  <h3 className="rt-card-title">{route.name}</h3>
                  <span className={`rt-status rt-status--${route.status}`}>
                    <span className={`rt-status-dot ${m.pulse ? 'rt-status-dot--pulse' : ''}`} />
                    {m.label}
                  </span>
                </div>

                <div className="rt-card-row">
                  <span className="rt-card-row-icon">
                    <Truck size={11} />
                  </span>
                  <span className="rt-card-row-value">
                    {route.vehicle?.plate ?? '—'}
                  </span>
                  <span className="rt-card-row-sep" />
                  <span className="rt-card-row-value rt-card-row-value--muted">
                    {route.operator?.firstName?.[0]}. {route.operator?.lastName}
                  </span>
                </div>

                <div className="rt-card-foot">
                  <div className="rt-days">
                    {route.schedule.dayOfWeek.map(d => (
                      <span key={d} className="rt-day">{dayLabels[d]}</span>
                    ))}
                  </div>
                  <span className="rt-time">{route.schedule.startTime}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Main - Action bar + Map + details */}
        <div className="rt-main">
          {/* Context action bar (only when a route is selected) */}
          {activeRoute && (
            <section className="adm-section rt-actionbar">
              <div className="rt-actionbar-info">
                <div className="rt-actionbar-name-row">
                  <h2 className="rt-actionbar-name">{activeRoute.name}</h2>
                  <span className={`rt-status rt-status--${activeRoute.status}`}>
                    <span className={`rt-status-dot ${statusMeta[activeRoute.status].pulse ? 'rt-status-dot--pulse' : ''}`} />
                    {statusMeta[activeRoute.status].label}
                  </span>
                </div>
                <div className="rt-actionbar-meta">
                  <span className="rt-actionbar-meta-chip">
                    <Truck size={11} />
                    {activeRoute.vehicle?.plate ?? '—'}
                  </span>
                  <span className="rt-actionbar-meta-chip">
                    <User size={11} />
                    {activeRoute.operator?.firstName} {activeRoute.operator?.lastName}
                  </span>
                  <span className="rt-actionbar-meta-chip">
                    <Calendar size={11} />
                    {activeRoute.schedule.dayOfWeek.map(d => dayLabels[d]).join(' · ')}
                  </span>
                  <span className="rt-actionbar-meta-chip">
                    <Clock size={11} />
                    {activeRoute.schedule.startTime} · {activeRoute.schedule.estimatedDuration} min
                  </span>
                </div>
              </div>
              <div className="rt-actionbar-actions">
                {(activeRoute.status === 'draft' || activeRoute.status === 'pending') && (
                  <button
                    disabled={busy}
                    onClick={() => patchStatus(activeRoute._id, 'active')}
                    className="adm-btn-primary"
                  >
                    <Play size={13} /> Iniciar ruta
                  </button>
                )}
                {activeRoute.status === 'active' && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => patchStatus(activeRoute._id, 'completed')}
                      className="adm-btn-primary"
                    >
                      <Flag size={13} /> Marcar completada
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => patchStatus(activeRoute._id, 'inactive')}
                      className="adm-btn-ghost"
                      style={{ color: '#B23A3A' }}
                    >
                      <Pause size={13} /> Pausar
                    </button>
                  </>
                )}
                {activeRoute.status === 'completed' && (
                  <button
                    disabled={busy}
                    onClick={() => patchStatus(activeRoute._id, 'draft')}
                    className="adm-btn-secondary"
                  >
                    Reabrir ruta
                  </button>
                )}
                {activeRoute.status === 'inactive' && (
                  <button
                    disabled={busy}
                    onClick={() => patchStatus(activeRoute._id, 'draft')}
                    className="adm-btn-secondary"
                  >
                    Reactivar ruta
                  </button>
                )}
                {!editMode ? (
                  <button onClick={enterEdit} className="adm-btn-secondary">
                    <Plus size={13} /> Editar paradas
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveWaypoints}
                      disabled={busy}
                      className="adm-btn-primary"
                    >
                      <Save size={13} /> Guardar paradas
                    </button>
                    <button onClick={cancelEdit} className="adm-btn-ghost">
                      <X size={13} /> Cancelar
                    </button>
                  </>
                )}
                <button
                  disabled={busy}
                  onClick={() => duplicateRoute(activeRoute)}
                  className="adm-btn-secondary"
                >
                  Duplicar ruta
                </button>
              </div>
            </section>
          )}

          {/* Map Card */}
          <section className="adm-section rt-map-card">
            <div className={`rt-map-wrap ${addingMode ? 'rt-map-wrap--add' : ''}`}>
              {leafletLoaded && !loading ? (
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                  <MapClickCapture onClick={addWaypoint} enabled={editMode && addingMode} />

                  {/* Active zone polygon (for selected) */}
                  {activeRoute?.zone?.geometry && (
                    <Polygon
                      positions={activeRoute.zone.geometry.coordinates[0].map(c => [c[1], c[0]] as [number, number])}
                      pathOptions={{ color: activeRoute.zone.color, fillOpacity: 0.05, weight: 2, dashArray: '8,8' }}
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
                      pathOptions={{ color: '#00684A', weight: 5, opacity: 0.7, dashArray: '4,8' }}
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
                        radius={editMode ? 9 : 7}
                        pathOptions={{
                          color: '#FFFFFF',
                          fillColor: editMode ? '#00A35C' : '#00684A',
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
                          <div className="rt-popup">
                            <div className="rt-popup-head">
                              <span className="rt-popup-order">{wp.order}</span>
                              <strong>{wp.name}</strong>
                            </div>
                            {wp.estimatedArrival && (
                              <div className="rt-popup-time">
                                <Clock size={11} /> {wp.estimatedArrival}
                              </div>
                            )}
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              ) : (
                <div className="rt-map-loading">
                  <div className="adm-spinner" />
                  <p>Cargando cartografía operativa…</p>
                </div>
              )}

              {/* Map Info Overlay */}
              <div className="rt-map-overlay">
                <span className="rt-map-overlay-icon">
                  <RouteIcon size={14} strokeWidth={2} />
                </span>
                <span className="rt-map-overlay-text">
                  {editMode ? 'Modo edición · paradas' : 'Monitoreo de itinerario'}
                </span>
              </div>

              {/* Inline edit hint (only when in edit mode — Save/Cancel live in action bar above) */}
              {activeRoute && editMode && (
                <div className="rt-editor">
                  <span className={`adm-status ${addingMode ? 'adm-status--green' : 'adm-status--neutral'}`}>
                    <span className="adm-status-dot" />
                    {addingMode ? 'Clic en el mapa para agregar' : `${draftWaypoints.length} paradas en edición`}
                  </span>
                  <button
                    onClick={() => setAddingMode(m => !m)}
                    className={addingMode ? 'adm-btn-primary' : 'adm-btn-secondary'}
                  >
                    <Plus size={13} /> {addingMode ? 'Cancelar agregar' : 'Agregar parada'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Details Card with tabs */}
          {activeRoute && (
            <section className="adm-section rt-details">
              <div className="rt-details-tabs">
                <button
                  type="button"
                  onClick={() => setDetailsTab('schedule')}
                  className={`adm-tab ${detailsTab === 'schedule' ? 'adm-tab--active' : ''}`}
                >
                  Cronograma
                  <span className="rt-tab-count">{effectiveWaypoints.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab('waste')}
                  className={`adm-tab ${detailsTab === 'waste' ? 'adm-tab--active' : ''}`}
                >
                  Residuos
                  <span className="rt-tab-count">{activeRoute.wasteTypes.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsTab('zone')}
                  className={`adm-tab ${detailsTab === 'zone' ? 'adm-tab--active' : ''}`}
                >
                  Zona &amp; geofencing
                </button>
              </div>

              {detailsTab === 'schedule' && (
                <div className="rt-tab-panel">
                  <div className="rt-panel-head">
                    <div>
                      <h3 className="rt-panel-title">
                        Cronograma <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>de paradas</em>
                      </h3>
                      <p className="rt-panel-sub">
                        {editMode
                          ? 'Editá nombres, arrastrá marcadores en el mapa o agregá nuevas paradas.'
                          : `${effectiveWaypoints.length} paradas registradas · duración estimada ${activeRoute.schedule.estimatedDuration} min.`}
                      </p>
                    </div>
                  </div>

                  <div className="rt-timeline">
                    {effectiveWaypoints.map(wp => (
                      <div key={wp.order} className="rt-tl-row">
                        <span className="rt-tl-dot" />
                        <div className="rt-tl-card">
                          <span className="rt-tl-order">#{wp.order}</span>
                          {editMode ? (
                            <input
                              value={wp.name}
                              onChange={e => renameWaypoint(wp.order, e.target.value)}
                              className="rt-tl-input"
                            />
                          ) : (
                            <span className="rt-tl-name">{wp.name}</span>
                          )}
                          {wp.estimatedArrival && !editMode && (
                            <span className="rt-tl-time">
                              <Clock3 size={11} /> {wp.estimatedArrival}
                            </span>
                          )}
                          {editMode && (
                            <button
                              onClick={() => removeWaypoint(wp.order)}
                              className="rt-tl-remove"
                              title="Eliminar parada"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {effectiveWaypoints.length === 0 && (
                      <p className="rt-tl-empty">
                        Sin paradas. Activá &quot;Editar paradas&quot; arriba para agregar.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {detailsTab === 'waste' && (
                <div className="rt-tab-panel">
                  <div className="rt-panel-head">
                    <div>
                      <h3 className="rt-panel-title">
                        Residuos <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>clasificados</em>
                      </h3>
                      <p className="rt-panel-sub">
                        {activeRoute.wasteTypes.length} categorías recolectadas según NTP 900.058.
                      </p>
                    </div>
                  </div>

                  <div className="rt-waste-grid">
                    {activeRoute.wasteTypes.map((wt) => (
                      <div key={wt.name} className="rt-waste-chip">
                        <span className="rt-waste-dot" style={{ background: wt.colorCode }} />
                        <span className="rt-waste-body">
                          <span className="rt-waste-name">{wt.name}</span>
                          <span className="rt-waste-cat">{wt.category}</span>
                        </span>
                      </div>
                    ))}
                    {activeRoute.wasteTypes.length === 0 && (
                      <p className="rt-tl-empty" style={{ gridColumn: '1 / -1' }}>
                        Sin tipos de residuo asignados a esta ruta.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {detailsTab === 'zone' && (
                <div className="rt-tab-panel">
                  <div className="rt-panel-head">
                    <div>
                      <h3 className="rt-panel-title">
                        Zona <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>operativa</em>
                      </h3>
                      <p className="rt-panel-sub">
                        Geofencing activo dentro de la zona asignada.
                      </p>
                    </div>
                  </div>

                  <div className="rt-zone-grid">
                    <div className="rt-zone-row">
                      <span className="rt-zone-label">Sector</span>
                      <span className="rt-zone-value">{activeRoute.zone.name}</span>
                    </div>
                    <div className="rt-zone-row">
                      <span className="rt-zone-label">Distrito</span>
                      <span className="rt-zone-value">{activeRoute.zone.district}</span>
                    </div>
                    <div className="rt-zone-row">
                      <span className="rt-zone-label">Color en mapa</span>
                      <span className="rt-zone-value rt-zone-value--color">
                        <span
                          className="rt-zone-swatch"
                          style={{ background: activeRoute.zone.color }}
                        />
                        {activeRoute.zone.color}
                      </span>
                    </div>
                    <div className="rt-zone-row">
                      <span className="rt-zone-label">Estado de monitoreo</span>
                      <span className="rt-zone-value">
                        <span className="adm-status adm-status--green">
                          <CheckCircle2 size={11} />
                          Geofencing activo
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const routeStyles = `
  /* Layout grid */
  .rt-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
  }
  @media (min-width: 1024px) {
    .rt-grid { grid-template-columns: 340px minmax(0, 1fr); }
  }
  .rt-main {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  /* Toggle button "Ver inactivas" */
  .rt-toggle--on {
    background: #FCE9E9 !important;
    color: #8B3030 !important;
    border-color: #F7CFCF !important;
  }
  .rt-toggle--on:hover { background: #F8DCDC !important; }

  /* Route list sidebar */
  .rt-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 860px;
    overflow-y: auto;
    padding-right: 2px;
    min-width: 0;
  }
  @media (max-width: 1023px) {
    .rt-list { max-height: none; padding-right: 0; }
  }
  .rt-list-head {
    position: sticky;
    top: 0;
    background: rgba(250, 250, 248, 0.96);
    backdrop-filter: blur(8px);
    z-index: 20;
    padding-bottom: 8px;
    margin-bottom: 2px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Filter chips */
  .rt-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .rt-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 999px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: #5C6C75;
    cursor: pointer;
    letter-spacing: -0.003em;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }
  .rt-chip:hover {
    background: #F1F4F2;
    border-color: #C1F1D6;
    color: #001E2B;
  }
  .rt-chip--active {
    background: #00684A;
    border-color: #00684A;
    color: #FFFFFF;
  }
  .rt-chip--active:hover { background: #00513A; }
  .rt-chip-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #94A3B8;
  }
  .rt-chip--draft .rt-chip-dot     { background: #94A3B8; }
  .rt-chip--pending .rt-chip-dot   { background: #D97706; }
  .rt-chip--active .rt-chip-dot    { background: #00A35C; }
  .rt-chip--completed .rt-chip-dot { background: #0EA5E9; }
  .rt-chip--inactive .rt-chip-dot  { background: #F87171; }
  .rt-chip--active.rt-chip--active .rt-chip-dot,
  .rt-chip--draft.rt-chip--active .rt-chip-dot,
  .rt-chip--pending.rt-chip--active .rt-chip-dot,
  .rt-chip--completed.rt-chip--active .rt-chip-dot,
  .rt-chip--inactive.rt-chip--active .rt-chip-dot { background: #FFFFFF; }

  /* Route cards */
  .rt-card {
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  }
  .rt-card:hover { border-color: #DCE2E0; background: #FAFEFC; }
  .rt-card--selected {
    border-color: #00684A;
    box-shadow: 0 0 0 3px rgba(0, 104, 74, 0.08);
    background: #FFFFFF;
  }
  .rt-card-main {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 12px 14px 10px;
    cursor: pointer;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .rt-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .rt-card-title {
    font-size: 14px;
    font-weight: 700;
    color: #001E2B;
    letter-spacing: -0.008em;
    margin: 0;
  }
  .rt-card--selected .rt-card-title { color: #00513A; }

  .rt-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .rt-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
  .rt-status-dot--pulse { animation: rt-pulse 1.8s ease-in-out infinite; }
  @keyframes rt-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .rt-status--draft     { background: #F1F4F2; color: #5C6C75; }
  .rt-status--pending   { background: #FFF5D6; color: #8C6300; }
  .rt-status--active    { background: #E3FCEF; color: #00513A; }
  .rt-status--completed { background: #E3EEF9; color: #1E5180; }
  .rt-status--inactive  { background: #FCE9E9; color: #8B3030; }

  /* Card row (single-line vehicle · operator) */
  .rt-card-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    min-width: 0;
  }
  .rt-card-row-icon {
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    color: #889397;
    flex-shrink: 0;
  }
  .rt-card-row-value {
    font-size: 11.5px;
    font-weight: 600;
    color: #001E2B;
    letter-spacing: -0.003em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rt-card-row-value--muted { color: #5C6C75; font-weight: 500; }
  .rt-card-row-sep {
    width: 1px;
    height: 10px;
    background: #E8EDEB;
    flex-shrink: 0;
    margin: 0 2px;
  }
  /* Card itself is now the click target (no inner button) — make it a button visually */
  .rt-card {
    text-align: left;
    cursor: pointer;
    padding: 12px 14px 10px;
    font-family: 'Geist', 'Outfit', sans-serif;
  }

  .rt-card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #F1F3F0;
  }
  .rt-days { display: inline-flex; gap: 3px; flex-wrap: wrap; }
  .rt-day {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 20px;
    padding: 0 5px;
    background: #F1F4F2;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 700;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .rt-time {
    font-size: 11.5px;
    font-weight: 700;
    color: #00684A;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  /* Context action bar (above map when a route is selected) */
  .rt-actionbar {
    padding: 14px 18px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
    justify-content: space-between;
    animation: fadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .rt-actionbar-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    flex: 1;
  }
  .rt-actionbar-name-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .rt-actionbar-name {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 22px;
    font-weight: 500;
    color: #001E2B;
    letter-spacing: -0.014em;
    line-height: 1.15;
    font-variation-settings: "opsz" 36;
    margin: 0;
  }
  .rt-actionbar-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .rt-actionbar-meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    background: #F9FBFA;
    border: 1px solid #E8EDEB;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    color: #5C6C75;
    letter-spacing: -0.003em;
  }
  .rt-actionbar-meta-chip svg { color: #889397; flex-shrink: 0; }
  .rt-actionbar-actions {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  /* Loading / empty states for list */
  .rt-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px 20px;
  }
  .rt-state-text {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .rt-empty {
    text-align: center;
    padding: 40px 22px !important;
  }
  .rt-empty p {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Map card */
  .rt-map-card {
    padding: 12px;
    overflow: hidden;
  }
  .rt-map-wrap {
    position: relative;
    height: 560px;
    width: 100%;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #E8EDEB;
    background: #F1F4F2;
  }
  .rt-map-wrap--add { cursor: crosshair; }
  .rt-map-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
  }
  .rt-map-loading p {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 11.5px;
    font-weight: 600;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Map info overlay (top-right) */
  .rt-map-overlay {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 6px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid #E8EDEB;
    border-radius: 8px;
    box-shadow: 0 4px 14px rgba(0, 30, 43, 0.08);
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .rt-map-overlay-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: #E3FCEF;
    color: #00684A;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    box-shadow: inset 0 0 0 1px #C1F1D6;
  }
  .rt-map-overlay-text {
    font-size: 11px;
    font-weight: 700;
    color: #001E2B;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  @media (max-width: 639px) {
    .rt-map-overlay-text { display: none; }
  }

  /* Inline edit indicator (only visible in edit mode, inside the map) */
  .rt-editor {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    z-index: 500;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    box-shadow: 0 6px 18px rgba(0, 30, 43, 0.10);
  }

  /* Details card with tabs */
  .rt-details {
    padding: 0;
    animation: fadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
    overflow: hidden;
  }
  .rt-details-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    border-bottom: 1px solid #E8EDEB;
    padding: 0 18px;
    background: #FAFBFA;
    overflow-x: auto;
  }
  .rt-details-tabs .adm-tab {
    padding: 10px 14px 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .rt-tab-count {
    display: inline-grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #E8EDEB;
    color: #5C6C75;
    font-size: 10px;
    font-weight: 700;
  }
  .rt-details-tabs .adm-tab--active .rt-tab-count {
    background: #E3FCEF;
    color: #00684A;
  }

  .rt-tab-panel {
    padding: 18px 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .rt-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #F1F3F0;
  }
  .rt-panel-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    color: #001E2B;
    letter-spacing: -0.012em;
    line-height: 1.15;
    font-variation-settings: "opsz" 36;
    margin: 0;
  }
  .rt-panel-sub {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12.5px;
    color: #5C6C75;
    margin: 4px 0 0;
    letter-spacing: -0.003em;
  }

  /* Zone tab */
  .rt-zone-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }
  @media (min-width: 600px) {
    .rt-zone-grid { grid-template-columns: 1fr 1fr; }
  }
  .rt-zone-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: #F9FBFA;
    border: 1px solid #E8EDEB;
    border-radius: 6px;
  }
  .rt-zone-label {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 10.5px;
    font-weight: 700;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .rt-zone-value {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #001E2B;
    letter-spacing: -0.003em;
  }
  .rt-zone-value--color {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 12px;
    letter-spacing: 0;
  }
  .rt-zone-swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px rgba(0,30,43,0.12);
  }

  /* Timeline */
  .rt-timeline {
    position: relative;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rt-timeline::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 8px;
    bottom: 8px;
    width: 1px;
    background: linear-gradient(to bottom, #00A35C 0%, #C1F1D6 50%, #E8EDEB 100%);
  }
  .rt-tl-row {
    position: relative;
    display: flex;
    align-items: center;
  }
  .rt-tl-dot {
    position: absolute;
    left: -18px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #00A35C;
    border: 2px solid #FFFFFF;
    box-shadow: 0 0 0 1px #C1F1D6;
    flex-shrink: 0;
  }
  .rt-tl-card {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: #F9FAFA;
    border: 1px solid #E8EDEB;
    border-radius: 6px;
    min-width: 0;
  }
  .rt-tl-order {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: #889397;
    flex-shrink: 0;
    letter-spacing: 0.04em;
  }
  .rt-tl-name {
    flex: 1;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #001E2B;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.005em;
  }
  .rt-tl-input {
    flex: 1;
    background: transparent;
    border: 0;
    border-bottom: 1px solid #C1F1D6;
    padding: 2px 0;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: #001E2B;
    outline: none;
    min-width: 0;
  }
  .rt-tl-input:focus { border-bottom-color: #00684A; }
  .rt-tl-time {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    background: #E3FCEF;
    border: 1px solid #C1F1D6;
    border-radius: 4px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 10.5px;
    font-weight: 700;
    color: #00684A;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .rt-tl-remove {
    background: transparent;
    border: 0;
    color: #B23A3A;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s ease;
    flex-shrink: 0;
  }
  .rt-tl-remove:hover { background: #FCEEEE; }
  .rt-tl-empty {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    color: #5C6C75;
    letter-spacing: -0.003em;
    padding: 4px 0;
  }

  /* Waste types grid */
  .rt-waste-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }
  @media (min-width: 480px) {
    .rt-waste-grid { grid-template-columns: 1fr 1fr; }
  }
  .rt-waste-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 11px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 6px;
  }
  .rt-waste-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.95);
  }
  .rt-waste-name {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #001E2B;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.003em;
  }

  /* Waste types — extra "category" sub-label in the new tab */
  .rt-waste-body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .rt-waste-cat {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 10.5px;
    font-weight: 600;
    color: #889397;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Leaflet popup overrides for waypoints */
  .rt-popup {
    min-width: 160px;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .rt-popup-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .rt-popup-order {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: #00684A;
    color: #FFFFFF;
    display: grid;
    place-items: center;
    font-size: 10.5px;
    font-weight: 700;
  }
  .rt-popup-head strong {
    font-size: 13px;
    font-weight: 700;
    color: #001E2B;
    letter-spacing: -0.005em;
  }
  .rt-popup-time {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    background: #E3FCEF;
    border: 1px solid #C1F1D6;
    border-radius: 5px;
    font-size: 11px;
    font-weight: 700;
    color: #00684A;
  }
`;

'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Info,
  MapPin,
  Layers,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Undo2,
  CheckCircle2,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  CircleMarker as LeafletCircleMarker,
} from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });
const MapClickCapture = dynamic(() => import('@/components/map/MapClickCapture'), { ssr: false });

interface ZoneData {
  _id: string;
  name: string;
  description: string;
  district: string;
  color: string;
  isActive: boolean;
  geometry: { type: string; coordinates: number[][][] };
  createdAt: string;
}

/* ---------------------- Polygon Drawer (drawing state) ---------------------- */

interface DrawerState {
  // GeoJSON-friendly: array of [lng, lat] tuples (without closing duplicate)
  vertices: [number, number][];
  closed: boolean;
}

interface PolygonDrawerProps {
  color: string;
  initial?: DrawerState;
  onChange: (state: DrawerState) => void;
}

function PolygonDrawer({ color, initial, onChange }: PolygonDrawerProps) {
  const [state, setStateRaw] = useState<DrawerState>(initial || { vertices: [], closed: false });

  const mapCenter = useMemo(() => [-13.5226, -71.9673] as [number, number], []);

  const update = useCallback(
    (updater: (prev: DrawerState) => DrawerState) => {
      setStateRaw(prev => {
        const next = updater(prev);
        // Inform parent in the same tick via a microtask to avoid setState-in-render.
        queueMicrotask(() => onChange(next));
        return next;
      });
    },
    [onChange]
  );

  const handleClick = useCallback((e: LeafletMouseEvent) => {
    update(prev => {
      if (prev.closed) return prev;
      return { ...prev, vertices: [...prev.vertices, [e.latlng.lng, e.latlng.lat]] };
    });
  }, [update]);

  const undo = () => update(prev => ({ ...prev, vertices: prev.vertices.slice(0, -1), closed: false }));
  const reset = () => update(() => ({ vertices: [], closed: false }));
  const close = () => {
    update(prev => {
      if (prev.vertices.length < 3) return prev;
      return { ...prev, closed: true };
    });
  };

  const moveVertex = (index: number, lng: number, lat: number) => {
    update(prev => {
      const next = prev.vertices.slice();
      next[index] = [lng, lat];
      return { ...prev, vertices: next };
    });
  };

  // Positions in [lat,lng] for react-leaflet
  const positionsLatLng: [number, number][] = useMemo(
    () => state.vertices.map(([lng, lat]) => [lat, lng] as [number, number]),
    [state.vertices]
  );

  const constructionLines: [number, number][] = useMemo(() => {
    return positionsLatLng;
  }, [positionsLatLng]);

  const drawingActive = !state.closed;
  const vertexCount = state.vertices.length;

  let hint: string;
  if (state.closed) {
    hint = `Polígono cerrado · ${vertexCount} vértices · Arrastra para ajustar`;
  } else if (vertexCount === 0) {
    hint = 'Haz clic en el mapa para empezar a dibujar';
  } else if (vertexCount < 3) {
    hint = `${vertexCount} ${vertexCount === 1 ? 'punto' : 'puntos'} · Agrega al menos ${3 - vertexCount} más`;
  } else {
    hint = `${vertexCount} puntos · Listo para cerrar`;
  }

  return (
    <div className="relative h-[420px] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
      <div className={`absolute inset-0 ${drawingActive ? 'leaflet-crosshair' : ''}`}>
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <MapClickCapture onClick={handleClick} enabled={drawingActive} />

          {/* Construction polyline (open polygon) */}
          {!state.closed && constructionLines.length > 1 && (
            <Polyline
              positions={constructionLines}
              pathOptions={{ color: '#059669', weight: 2, dashArray: '8,8' }}
            />
          )}

          {/* Closed polygon preview */}
          {state.closed && positionsLatLng.length >= 3 && (
            <Polygon
              positions={positionsLatLng}
              pathOptions={{
                color: '#047857',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.25,
              }}
            />
          )}

          {/* Vertices */}
          {positionsLatLng.map(([lat, lng], idx) => (
            <CircleMarker
              key={`v-${idx}`}
              center={[lat, lng]}
              radius={6}
              pathOptions={{
                color: '#FFFFFF',
                fillColor: '#10B981',
                fillOpacity: 1,
                weight: 2,
              }}
              eventHandlers={
                state.closed
                  ? {
                      mousedown: (ev) => {
                        const layer = ev.target as LeafletCircleMarker & { _map?: LeafletMap };
                        const map = layer._map;
                        if (!map) return;
                        map.dragging.disable();
                        const onMove = (mv: LeafletMouseEvent) => {
                          moveVertex(idx, mv.latlng.lng, mv.latlng.lat);
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
            />
          ))}
        </MapContainer>
      </div>

      {/* Overlay panel */}
      <div className="absolute top-4 left-4 right-4 z-[500] bg-white/95 backdrop-blur-xl rounded-2xl border border-white shadow-xl shadow-slate-900/10 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
            <Pencil className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {state.closed ? 'Editor de Polígono' : 'Dibujar Zona'}
            </p>
            <p className="text-[11px] font-bold text-slate-700 tracking-tight truncate">{hint}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!state.closed && (
            <>
              <button
                type="button"
                onClick={undo}
                disabled={vertexCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Undo2 className="w-3 h-3" /> Deshacer
              </button>
              <button
                type="button"
                onClick={close}
                disabled={vertexCount < 3}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" /> Cerrar polígono
              </button>
            </>
          )}
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 font-black text-[10px] uppercase tracking-widest transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Zones Page -------------------------------- */

export default function ZonesPage() {
  const { apiFetch } = useApi();
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    district: '',
    color: '#10B981',
  });
  const [drawerState, setDrawerState] = useState<DrawerState>({ vertices: [], closed: false });
  const [drawerInitial, setDrawerInitial] = useState<DrawerState | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  const fetchZones = useCallback(async () => {
    const data = await apiFetch('/api/v1/zones');
    return data.data as ZoneData[];
  }, [apiFetch]);

  const refresh = useCallback(async () => {
    try {
      const list = await fetchZones();
      setZones(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchZones]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchZones();
        if (!cancelled) setZones(list);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchZones]);

  const mapCenter = useMemo(() => [-13.5226, -71.9673] as [number, number], []);

  const handleOpenModal = (zone?: ZoneData) => {
    if (zone) {
      setEditingId(zone._id);
      setFormData({
        name: zone.name,
        description: zone.description,
        district: zone.district,
        color: zone.color,
      });
      // Strip closing duplicate point from coords for the drawer state
      const ring = zone.geometry.coordinates[0];
      const stripped = ring.length > 0
        ? ring.slice(0, -1).map(([lng, lat]) => [lng, lat] as [number, number])
        : [];
      const initial: DrawerState = { vertices: stripped, closed: stripped.length >= 3 };
      setDrawerInitial(initial);
      setDrawerState(initial);
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', district: '', color: '#10B981' });
      const blank: DrawerState = { vertices: [], closed: false };
      setDrawerInitial(blank);
      setDrawerState(blank);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const canSave =
    !!formData.name.trim() &&
    !!formData.description.trim() &&
    !!formData.district.trim() &&
    drawerState.closed &&
    drawerState.vertices.length >= 3 &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    // Build GeoJSON polygon: close the ring by repeating the first point.
    const ring = drawerState.vertices.map(([lng, lat]) => [lng, lat]);
    if (ring.length > 0) {
      const first = ring[0];
      ring.push([first[0], first[1]]);
    }

    const payload = {
      ...formData,
      geometry: { type: 'Polygon', coordinates: [ring] },
    };

    try {
      setSaving(true);
      if (editingId) {
        await apiFetch(`/api/v1/zones/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Zona actualizada exitosamente');
      } else {
        await apiFetch('/api/v1/zones', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Zona creada exitosamente');
      }
      handleCloseModal();
      await refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al guardar zona';
      // The API returns descriptive overlap messages like:
      //   El polígono se superpone con la zona "Centro Histórico"
      if (msg.toLowerCase().includes('superpone')) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta zona?')) return;
    try {
      await apiFetch(`/api/v1/zones/${id}`, { method: 'DELETE' });
      toast.success('Zona eliminada exitosamente');
      await refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al eliminar zona';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <style>{`
        .leaflet-crosshair, .leaflet-crosshair .leaflet-container,
        .leaflet-crosshair .leaflet-interactive { cursor: crosshair !important; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Zonas de Recolección</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Visualización geográfica de los sectores operativos en Cusco.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
            <Layers className="w-4 h-4" />
            <span>{zones.length} Sectores Activos</span>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-5 h-5" />
            Añadir Zona
          </button>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 overflow-hidden">
        <div className="relative h-[600px] w-full rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-50">
          {leafletLoaded && !loading ? (
            <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {zones.map((zone) => {
                const positions = zone.geometry.coordinates[0].map(
                  (coord) => [coord[1], coord[0]] as [number, number]
                );
                return (
                  <Polygon
                    key={zone._id}
                    positions={positions}
                    pathOptions={{ color: zone.color, fillColor: zone.color, fillOpacity: 0.2, weight: 4 }}
                  >
                    <Popup>
                      <div className="p-2 font-sans min-w-[150px]">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: zone.color }} />
                          <strong className="text-slate-900 text-sm font-black uppercase tracking-tight">{zone.name}</strong>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">{zone.district}</p>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{zone.description}</p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Cartografía...</p>
            </div>
          )}

          {/* Legend Overlay */}
          <div className="absolute top-8 right-8 z-[500] bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-2xl shadow-slate-900/10 max-w-[240px] hidden md:block">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-slate-900 text-white shadow-lg">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Leyenda</span>
            </div>
            <div className="space-y-3">
              {zones.slice(0, 5).map(z => (
                <div key={z._id} className="flex items-center justify-between group/item cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ background: z.color }} />
                    <span className="text-[11px] font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors truncate">{z.name}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {zones.map((zone, idx) => (
          <div
            key={zone._id}
            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-2 group relative overflow-hidden"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.05] group-hover:opacity-[0.1] transition-opacity" style={{ background: zone.color }} />

            <div className="flex items-start justify-between mb-6 relative">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full shadow-[0_0_12px] shadow-current transition-transform group-hover:scale-125 duration-500" style={{ background: zone.color, color: zone.color }} />
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{zone.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{zone.district}</p>
                </div>
              </div>
              <span className="text-[9px] font-black px-3 py-1.5 rounded-xl bg-slate-50 text-slate-400 uppercase border border-slate-100 tracking-tighter">
                {Math.max(0, zone.geometry.coordinates[0].length - 1)} Puntos
              </span>
            </div>

            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed h-[60px] overflow-hidden line-clamp-3 italic">
              &quot;{zone.description}&quot;
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-50 text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Cusco Región
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(zone)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(zone._id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Zona' : 'Añadir Zona'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Distrito</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                value={formData.district}
                onChange={e => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
            <textarea
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
              rows={2}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Color</label>
            <input
              required
              type="color"
              className="w-24 h-10 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
              value={formData.color}
              onChange={e => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Polígono de la Zona</label>
            <PolygonDrawer
              key={`${editingId ?? 'new'}-${isModalOpen ? 'open' : 'closed'}`}
              color={formData.color}
              initial={drawerInitial}
              onChange={setDrawerState}
            />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
              Clic para agregar vértices · Mínimo 3 puntos · Arrastra vértices tras cerrar
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editingId ? 'Guardar Cambios' : 'Guardar Zona'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

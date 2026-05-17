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
    <div className="adm-page animate-fade-in">
      <style>{`
        .leaflet-crosshair, .leaflet-crosshair .leaflet-container,
        .leaflet-crosshair .leaflet-interactive { cursor: crosshair !important; }
        .zones-map-wrap {
          position: relative;
          height: clamp(360px, 55vh, 520px);
          width: 100%;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #E8EDEB;
          background: #F9FBFA;
        }
        @media (max-width: 767px) {
          .zones-legend {
            top: 10px !important;
            right: 10px !important;
            padding: 10px 12px !important;
            font-size: 11.5px !important;
          }
        }
        .zones-legend {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 500;
          background: rgba(255,255,255,0.95);
          backdrop-filter: saturate(150%) blur(8px);
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid #E8EDEB;
          box-shadow: 0 4px 12px rgba(0,30,43,0.08);
          max-width: 220px;
          font-family: 'Geist', 'Outfit', sans-serif;
        }
        .zones-legend-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #5C6C75;
          margin-bottom: 10px;
        }
        .zones-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          font-size: 12px;
          font-weight: 500;
          color: #001E2B;
        }
        .zones-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>

      <header className="adm-header">
        <div>
          <h1 className="adm-title">Zonas de recolección</h1>
          <p className="adm-sub">
            Visualización geográfica de los sectores operativos en Cusco.
          </p>
        </div>
        <div className="adm-header-actions">
          <button onClick={() => handleOpenModal()} className="adm-btn-primary">
            <Plus size={15} />
            <span>Añadir zona</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-stat-pills" style={{ marginLeft: 0 }}>
          <span className="adm-stat-pill"><strong>{zones.length}</strong> total</span>
          <span className="adm-stat-pill adm-stat-pill--green">
            <Layers size={12} />
            <strong>{zones.length}</strong> activas
          </span>
        </div>
      </div>

      <section className="adm-section" style={{ padding: 16 }}>
        <div className="zones-map-wrap">
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
                    pathOptions={{
                      color: zone.color,
                      fillColor: zone.color,
                      fillOpacity: 0.18,
                      weight: 2.5,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160, fontFamily: 'Geist, Outfit, sans-serif' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: zone.color,
                            }}
                          />
                          <strong style={{ fontSize: 13, color: '#001E2B' }}>{zone.name}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: '#5C6C75', marginBottom: 6 }}>
                          {zone.district}
                        </div>
                        <p style={{ fontSize: 12, color: '#001E2B', lineHeight: 1.45, margin: 0 }}>
                          {zone.description}
                        </p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>
          ) : (
            <div className="adm-state" style={{ height: '100%', justifyContent: 'center' }}>
              <span className="adm-spinner" />
              <p>Sincronizando cartografía…</p>
            </div>
          )}

          {leafletLoaded && !loading && zones.length > 0 && (
            <div className="zones-legend">
              <div className="zones-legend-title">
                <Info size={12} />
                Leyenda
              </div>
              {zones.slice(0, 6).map((z) => (
                <div key={z._id} className="zones-legend-item">
                  <span className="zones-legend-dot" style={{ background: z.color }} />
                  <span>{z.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-state">
            <span className="adm-spinner" />
            <p>Cargando zonas…</p>
          </div>
        ) : zones.length === 0 ? (
          <div className="adm-state">
            <div className="adm-state-icon">
              <MapPin size={22} />
            </div>
            <p className="adm-state-title">Sin zonas registradas</p>
            <p className="adm-state-desc">
              Definí la primera zona dibujando su polígono sobre el mapa.
            </p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Zona</th>
                <th>Distrito</th>
                <th>Color</th>
                <th>Vértices</th>
                <th>Descripción</th>
                <th className="adm-th-actions" />
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone._id}>
                  <td>
                    <div className="adm-row-title-cell">
                      <span
                        className="adm-row-mini-avatar"
                        style={{
                          background: `${zone.color}1A`,
                          color: zone.color,
                          borderColor: `${zone.color}40`,
                        }}
                      >
                        <MapPin size={14} />
                      </span>
                      <strong>{zone.name}</strong>
                    </div>
                  </td>
                  <td className="adm-cell-muted">{zone.district}</td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: zone.color,
                          border: '1px solid #E8EDEB',
                        }}
                      />
                      <span className="adm-cell-mono adm-cell-muted">{zone.color.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="adm-cell-mono">
                    {Math.max(0, zone.geometry.coordinates[0].length - 1)} pts
                  </td>
                  <td className="adm-cell-muted">
                    {zone.description.length > 80
                      ? `${zone.description.slice(0, 80)}…`
                      : zone.description}
                  </td>
                  <td className="adm-td-actions">
                    <div className="adm-actions">
                      <button
                        onClick={() => handleOpenModal(zone)}
                        className="adm-icon-btn"
                        title="Editar zona"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(zone._id)}
                        className="adm-icon-btn adm-icon-btn--danger"
                        title="Eliminar zona"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="adm-table-foot">
          {zones.length} zona{zones.length !== 1 ? 's' : ''} registrada{zones.length !== 1 ? 's' : ''}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar zona' : 'Añadir zona'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-form-grid">
            <div className="adm-form-field">
              <label className="adm-form-label">Nombre</label>
              <input
                required
                type="text"
                className="adm-form-input"
                placeholder="Ej: Centro Histórico"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Distrito</label>
              <input
                required
                type="text"
                className="adm-form-input"
                placeholder="Ej: Cusco"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              />
            </div>
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Descripción</label>
              <textarea
                required
                className="adm-form-textarea"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Color de identificación</label>
              <input
                required
                type="color"
                className="adm-form-input"
                style={{ height: 44, padding: 4 }}
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
              <span className="adm-form-hint">
                Color que identifica la zona en mapas y listados.
              </span>
            </div>
          </div>

          <div className="adm-form-field" style={{ marginTop: 4 }}>
            <label className="adm-form-label">Polígono de la zona</label>
            <PolygonDrawer
              key={`${editingId ?? 'new'}-${isModalOpen ? 'open' : 'closed'}`}
              color={formData.color}
              initial={drawerInitial}
              onChange={setDrawerState}
            />
            <span className="adm-form-hint">
              Clic para agregar vértices · Mínimo 3 puntos · Arrastrá vértices tras cerrar el
              polígono.
            </span>
          </div>

          <div className="adm-form-actions">
            <button type="button" onClick={handleCloseModal} className="adm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={!canSave} className="adm-btn-primary">
              {editingId ? 'Guardar cambios' : 'Crear zona'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

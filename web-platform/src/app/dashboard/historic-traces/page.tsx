'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  Route as RouteIcon,
  Trash2,
  Star,
  Pencil,
  Sparkles,
  User,
  MapPin,
  Clock,
  Activity,
  Users,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';
import { Modal } from '@/components/ui/Modal';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), {
  ssr: false,
});
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), {
  ssr: false,
});
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), {
  ssr: false,
});
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), {
  ssr: false,
});

type SelectionMethod = 'manual' | 'most_complete' | 'median' | 'most_confirmed';

interface RouteLite {
  _id: string;
  name: string;
  zone?: { name?: string };
  path?: { coordinates: number[][] };
}

interface TraceListItem {
  _id: string;
  route: string;
  execution?: string;
  driver?: { _id: string; firstName: string; lastName: string } | null;
  date: string;
  totalDistanceKm: number;
  durationMin: number;
  waypointsVisited: number;
  waypointsSkipped: number;
  communityConfirmations: number;
  isOfficial: boolean;
  isSynthetic?: boolean;
  selectionMethod?: SelectionMethod;
}

interface TraceFull extends TraceListItem {
  points: { type: 'LineString'; coordinates: number[][] };
}

const methodMeta: Record<SelectionMethod, { label: string; desc: string }> = {
  manual: { label: 'Manual', desc: 'Elegida a mano por un operador' },
  most_complete: { label: 'Más paradas', desc: 'Mayor cobertura de waypoints reales' },
  median: { label: 'Mediana', desc: 'Promedio geométrico de todas las trazas' },
  most_confirmed: { label: 'Más confirmaciones', desc: 'Mayor cantidad de avistamientos ciudadanos' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function completeness(t: TraceListItem): number {
  const total = t.waypointsVisited + t.waypointsSkipped;
  if (total === 0) return 0;
  return Math.round((t.waypointsVisited / total) * 100);
}

export default function HistoricTracesPage() {
  const { apiFetch } = useApi();
  const [routes, setRoutes] = useState<RouteLite[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<TraceFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftPoints, setDraftPoints] = useState<string>('');

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/v1/routes');
        const list: RouteLite[] = (res.data as RouteLite[]) ?? [];
        if (!cancelled) {
          setRoutes(list);
          if (list.length > 0 && !selectedRouteId) setSelectedRouteId(list[0]._id);
        }
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar las rutas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, selectedRouteId]);

  const loadTraces = useCallback(
    async (routeId: string) => {
      if (!routeId) return;
      try {
        const res = await apiFetch(`/api/v1/routes/${routeId}/traces`);
        const list: TraceListItem[] = res.data ?? [];
        setTraces(list);
        const official = list.find((t) => t.isOfficial);
        setSelectedTraceId(official?._id ?? list[0]?._id ?? null);
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar las trazas');
        setTraces([]);
        setSelectedTraceId(null);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    if (selectedRouteId) loadTraces(selectedRouteId);
  }, [selectedRouteId, loadTraces]);

  useEffect(() => {
    if (!selectedTraceId) {
      setTraceDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/v1/traces/${selectedTraceId}`);
        if (!cancelled) setTraceDetail(res.data as TraceFull);
      } catch (err) {
        console.error(err);
        if (!cancelled) setTraceDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedTraceId, apiFetch]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r._id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );

  const programmedLatLng = useMemo<[number, number][]>(() => {
    const coords = selectedRoute?.path?.coordinates ?? [];
    return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [selectedRoute]);

  const traceLatLng = useMemo<[number, number][]>(() => {
    const coords = traceDetail?.points?.coordinates ?? [];
    return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [traceDetail]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (traceLatLng.length > 0) return traceLatLng[Math.floor(traceLatLng.length / 2)];
    if (programmedLatLng.length > 0) return programmedLatLng[Math.floor(programmedLatLng.length / 2)];
    return [-13.52, -71.967];
  }, [traceLatLng, programmedLatLng]);

  const handlePromote = useCallback(
    async (traceId: string) => {
      setBusy(traceId);
      try {
        await apiFetch(`/api/v1/traces/${traceId}/promote`, { method: 'PATCH' });
        toast.success('Traza promovida a oficial');
        await loadTraces(selectedRouteId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo promover');
      } finally {
        setBusy(null);
      }
    },
    [apiFetch, loadTraces, selectedRouteId],
  );

  const handleDelete = useCallback(
    async (traceId: string) => {
      if (!confirm('¿Eliminar esta traza histórica? Esta acción no se puede deshacer.')) return;
      setBusy(traceId);
      try {
        await apiFetch(`/api/v1/traces/${traceId}`, { method: 'DELETE' });
        toast.success('Traza eliminada');
        if (selectedTraceId === traceId) setSelectedTraceId(null);
        await loadTraces(selectedRouteId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
      } finally {
        setBusy(null);
      }
    },
    [apiFetch, loadTraces, selectedRouteId, selectedTraceId],
  );

  const handleAutoSelect = useCallback(
    async (method: SelectionMethod) => {
      setBusy('auto');
      try {
        const res = await apiFetch(`/api/v1/routes/${selectedRouteId}/traces/auto-select`, {
          method: 'POST',
          body: JSON.stringify({ method }),
        });
        toast.success(`Traza oficial actualizada (${methodMeta[method].label})`);
        await loadTraces(selectedRouteId);
        if (res.data?._id) setSelectedTraceId(res.data._id);
        setAutoModalOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo auto-seleccionar');
      } finally {
        setBusy(null);
      }
    },
    [apiFetch, loadTraces, selectedRouteId],
  );

  const openEditor = useCallback(() => {
    if (!traceDetail) return;
    setDraftPoints(
      traceDetail.points.coordinates.map((p) => `${p[0]},${p[1]}`).join('\n'),
    );
    setEditModalOpen(true);
  }, [traceDetail]);

  const handleSaveEdit = useCallback(async () => {
    if (!traceDetail) return;
    const lines = draftPoints.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const coords: number[][] = [];
    for (const line of lines) {
      const parts = line.split(',').map((s) => Number(s.trim()));
      if (parts.length !== 2 || parts.some(Number.isNaN)) {
        toast.error(`Línea inválida: "${line}". Formato: lng,lat`);
        return;
      }
      coords.push(parts);
    }
    if (coords.length < 2) {
      toast.error('Necesitas al menos 2 puntos');
      return;
    }
    setBusy('edit');
    try {
      await apiFetch(`/api/v1/traces/${traceDetail._id}/edit`, {
        method: 'PATCH',
        body: JSON.stringify({ points: coords }),
      });
      toast.success('Traza editada');
      setEditModalOpen(false);
      await loadTraces(selectedRouteId);
      // refetch detail
      const res = await apiFetch(`/api/v1/traces/${traceDetail._id}`);
      setTraceDetail(res.data as TraceFull);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(null);
    }
  }, [apiFetch, draftPoints, loadTraces, selectedRouteId, traceDetail]);

  const officialCount = traces.filter((t) => t.isOfficial).length;

  return (
    <div className="adm-page animate-fade-in">
      <style>{pageStyles}</style>

      <header className="adm-header">
        <div>
          <h1 className="adm-title">
            Trazas <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>históricas</em>.
          </h1>
          <p className="adm-sub">
            Recorridos reales registrados por los conductores. Promueve la más representativa como oficial para que aparezca en la app ciudadana.
          </p>
        </div>
        <div className="adm-header-actions">
          <span className="adm-stat-pill">
            <RouteIcon size={12} style={{ marginRight: 2 }} />
            <strong>{traces.length}</strong>
            <span>registradas</span>
          </span>
          <span className={`adm-stat-pill ${officialCount > 0 ? 'adm-stat-pill--green' : ''}`}>
            <Star size={12} style={{ marginRight: 2 }} />
            <strong>{officialCount}</strong>
            <span>oficial</span>
          </span>
        </div>
      </header>

      <div className="ht-route-bar">
        <label className="ht-route-label">
          <RouteIcon size={14} />
          <span>Ruta</span>
        </label>
        <select
          className="ht-route-select"
          value={selectedRouteId}
          onChange={(e) => setSelectedRouteId(e.target.value)}
          disabled={loading}
        >
          {loading && <option>Cargando rutas…</option>}
          {!loading && routes.length === 0 && <option>Sin rutas disponibles</option>}
          {routes.map((r) => (
            <option key={r._id} value={r._id}>
              {r.name}
              {r.zone?.name ? ` — ${r.zone.name}` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="adm-btn-primary"
          onClick={() => setAutoModalOpen(true)}
          disabled={!selectedRouteId || traces.length === 0}
        >
          <Sparkles size={14} />
          <span>Auto-seleccionar</span>
        </button>
      </div>

      <div className="ht-grid">
        <section className="adm-section ht-list-card">
          <div className="adm-section-header" style={{ marginBottom: 14 }}>
            <div>
              <h3 className="adm-section-title">Recorridos registrados</h3>
              <p className="adm-section-sub">
                Cada fila es una jornada completada. Selecciona una para ver su trazo.
              </p>
            </div>
          </div>

          <div className="ht-list">
            {traces.length === 0 ? (
              <div className="adm-state">
                <div className="adm-state-icon">
                  <RouteIcon size={22} strokeWidth={2} />
                </div>
                <p className="adm-state-title">Sin trazas para esta ruta</p>
                <p className="adm-state-desc">
                  Cuando un conductor complete una jornada, su recorrido GPS aparecerá acá automáticamente.
                </p>
              </div>
            ) : (
              traces.map((t) => {
                const isSelected = t._id === selectedTraceId;
                const isBusy = busy === t._id;
                const pct = completeness(t);
                return (
                  <article
                    key={t._id}
                    className={`ht-row ${isSelected ? 'ht-row--selected' : ''}`}
                    onClick={() => setSelectedTraceId(t._id)}
                  >
                    <div className="ht-row-head">
                      <div className="ht-row-date">
                        <Clock size={12} />
                        <span>{formatDate(t.date)}</span>
                      </div>
                      <div className="ht-row-badges">
                        {t.isOfficial && (
                          <span className="ht-badge ht-badge--official">
                            <Star size={11} />
                            <span>Oficial</span>
                          </span>
                        )}
                        {t.isSynthetic && (
                          <span className="ht-badge ht-badge--synthetic">
                            <Sparkles size={11} />
                            <span>Sintética</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ht-row-meta">
                      <div className="ht-row-meta-item">
                        <User size={11} />
                        <span>
                          {t.driver
                            ? `${t.driver.firstName} ${t.driver.lastName}`
                            : '—'}
                        </span>
                      </div>
                      <div className="ht-row-meta-item">
                        <MapPin size={11} />
                        <span>{t.totalDistanceKm.toFixed(1)} km</span>
                      </div>
                      <div className="ht-row-meta-item">
                        <Activity size={11} />
                        <span>{t.durationMin} min</span>
                      </div>
                      <div className="ht-row-meta-item">
                        <Users size={11} />
                        <span>{t.communityConfirmations}</span>
                      </div>
                    </div>

                    <div className="ht-row-progress">
                      <div className="ht-row-progress-bar">
                        <div
                          className="ht-row-progress-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="ht-row-progress-text">
                        {t.waypointsVisited} / {t.waypointsVisited + t.waypointsSkipped} paradas · {pct}%
                      </span>
                    </div>

                    <div className="ht-row-actions" onClick={(e) => e.stopPropagation()}>
                      {!t.isOfficial && (
                        <button
                          type="button"
                          className="ht-action ht-action--promote"
                          onClick={() => handlePromote(t._id)}
                          disabled={isBusy}
                          title="Marcar como oficial"
                        >
                          <Star size={12} />
                          <span>Promover</span>
                        </button>
                      )}
                      {isSelected && (
                        <button
                          type="button"
                          className="ht-action"
                          onClick={openEditor}
                          disabled={isBusy}
                          title="Editar puntos"
                        >
                          <Pencil size={12} />
                          <span>Editar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="ht-action ht-action--danger"
                        onClick={() => handleDelete(t._id)}
                        disabled={isBusy || t.isOfficial}
                        title={t.isOfficial ? 'Despromueve primero para eliminar' : 'Eliminar'}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="adm-section ht-map-card">
          <div className="ht-map-wrap">
            {leafletLoaded ? (
              <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {programmedLatLng.length > 1 && (
                  <Polyline
                    positions={programmedLatLng}
                    pathOptions={{
                      color: '#94A3B8',
                      weight: 3,
                      opacity: 0.55,
                      dashArray: '6,8',
                    }}
                  />
                )}

                {traceLatLng.length > 1 && (
                  <Polyline
                    positions={traceLatLng}
                    pathOptions={{ color: '#00684A', weight: 5, opacity: 0.85 }}
                  />
                )}

                {traceLatLng.length > 0 && (
                  <>
                    <CircleMarker
                      center={traceLatLng[0]}
                      radius={7}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: '#00A35C',
                        fillOpacity: 1,
                        weight: 3,
                      }}
                    >
                      <Popup>Inicio del recorrido</Popup>
                    </CircleMarker>
                    <CircleMarker
                      center={traceLatLng[traceLatLng.length - 1]}
                      radius={7}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: '#001E2B',
                        fillOpacity: 1,
                        weight: 3,
                      }}
                    >
                      <Popup>Fin del recorrido</Popup>
                    </CircleMarker>
                  </>
                )}
              </MapContainer>
            ) : (
              <div className="ht-map-loading">
                <div className="adm-spinner" />
                <p>Cargando mapa…</p>
              </div>
            )}

            <div className="ht-legend">
              <span className="adm-eyebrow" style={{ margin: 0 }}>
                Capas
              </span>
              <div className="ht-legend-row">
                <span className="ht-legend-line" style={{ background: '#00684A' }} />
                <span>Traza seleccionada</span>
              </div>
              <div className="ht-legend-row">
                <span
                  className="ht-legend-line"
                  style={{
                    background:
                      'repeating-linear-gradient(90deg,#94A3B8 0 6px,transparent 6px 14px)',
                  }}
                />
                <span>Ruta programada</span>
              </div>
            </div>

            {traceDetail && (
              <div className="ht-detail-panel">
                <div className="ht-detail-head">
                  <span className="adm-eyebrow" style={{ margin: 0 }}>
                    Detalle
                  </span>
                  {traceDetail.selectionMethod && (
                    <span className="ht-badge ht-badge--method">
                      {methodMeta[traceDetail.selectionMethod].label}
                    </span>
                  )}
                </div>
                <div className="ht-detail-grid">
                  <div className="ht-detail-item">
                    <span className="ht-detail-label">Distancia</span>
                    <span className="ht-detail-value">
                      {traceDetail.totalDistanceKm.toFixed(2)} km
                    </span>
                  </div>
                  <div className="ht-detail-item">
                    <span className="ht-detail-label">Duración</span>
                    <span className="ht-detail-value">{traceDetail.durationMin} min</span>
                  </div>
                  <div className="ht-detail-item">
                    <span className="ht-detail-label">Puntos GPS</span>
                    <span className="ht-detail-value">
                      {traceDetail.points.coordinates.length}
                    </span>
                  </div>
                  <div className="ht-detail-item">
                    <span className="ht-detail-label">Confirmaciones</span>
                    <span className="ht-detail-value">
                      {traceDetail.communityConfirmations}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={autoModalOpen}
        onClose={() => setAutoModalOpen(false)}
        title="Auto-seleccionar la mejor traza"
        description={`Elige cómo quieres calcular la traza oficial de ${selectedRoute?.name ?? ''}.`}
        size="md"
      >
        <div className="ht-methods">
          {(['most_complete', 'most_confirmed', 'median'] as SelectionMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              className="ht-method-card"
              onClick={() => handleAutoSelect(m)}
              disabled={busy === 'auto'}
            >
              <div className="ht-method-icon">
                {m === 'most_complete' && <CheckCircle2 size={18} />}
                {m === 'most_confirmed' && <Users size={18} />}
                {m === 'median' && <Sparkles size={18} />}
              </div>
              <div className="ht-method-body">
                <span className="ht-method-title">{methodMeta[m].label}</span>
                <span className="ht-method-desc">{methodMeta[m].desc}</span>
              </div>
            </button>
          ))}
          <div className="ht-method-note">
            <AlertTriangle size={12} />
            <span>
              La traza oficial actual será reemplazada. La mediana genera una traza nueva sintética a partir de todas las históricas.
            </span>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar puntos del trazo"
        description="Una coordenada por línea, formato lng,lat. Al guardar la traza queda marcada como sintética."
        size="lg"
      >
        <div className="ht-editor">
          <textarea
            className="ht-editor-textarea"
            value={draftPoints}
            onChange={(e) => setDraftPoints(e.target.value)}
            rows={18}
            spellCheck={false}
          />
          <div className="ht-editor-actions">
            <button
              type="button"
              className="adm-btn-ghost"
              onClick={() => setEditModalOpen(false)}
              disabled={busy === 'edit'}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              onClick={handleSaveEdit}
              disabled={busy === 'edit'}
            >
              <Save size={14} />
              <span>Guardar cambios</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const pageStyles = `
  .ht-route-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .ht-route-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .ht-route-select {
    flex: 1;
    min-width: 240px;
    padding: 8px 12px;
    border: 1px solid #E8EDEB;
    border-radius: 8px;
    background: #FAFBFA;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13px;
    color: #001E2B;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .ht-route-select:hover { background: #FFFFFF; border-color: #C1F1D6; }
  .ht-route-select:focus { outline: 2px solid #00A35C; outline-offset: -1px; }

  .ht-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }
  @media (min-width: 1100px) {
    .ht-grid { grid-template-columns: minmax(0, 460px) minmax(0, 1fr); }
  }

  .ht-list-card { padding: 20px; display: flex; flex-direction: column; }
  .ht-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    max-height: clamp(420px, 65vh, 720px);
    margin: 0 -4px;
    padding: 0 4px;
  }

  .ht-row {
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    background: #FFFFFF;
    padding: 14px 14px 12px;
    cursor: pointer;
    transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .ht-row:hover { border-color: #C1F1D6; background: #FAFEFC; }
  .ht-row--selected {
    border-color: #00A35C;
    background: #FAFEFC;
    box-shadow: 0 0 0 3px rgba(0, 104, 74, 0.08);
  }
  .ht-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }
  .ht-row-date {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #001E2B;
  }
  .ht-row-date svg { color: #889397; }
  .ht-row-badges { display: inline-flex; gap: 6px; }
  .ht-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
  .ht-badge--official {
    background: #E3FCEF;
    color: #00513A;
    border: 1px solid #C1F1D6;
  }
  .ht-badge--synthetic {
    background: #F1F0FC;
    color: #4338CA;
    border: 1px solid #DDD6FE;
  }
  .ht-badge--method {
    background: #F1F4F2;
    color: #00684A;
    border: 1px solid #E8EDEB;
    font-size: 10.5px;
    padding: 3px 10px;
  }
  .ht-row-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    margin-bottom: 10px;
  }
  .ht-row-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    color: #5C6C75;
  }
  .ht-row-meta-item svg { color: #889397; flex-shrink: 0; }
  .ht-row-meta-item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ht-row-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .ht-row-progress-bar {
    flex: 1;
    height: 4px;
    background: #F1F3F0;
    border-radius: 2px;
    overflow: hidden;
  }
  .ht-row-progress-fill {
    height: 100%;
    background: #00A35C;
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .ht-row-progress-text {
    font-size: 10.5px;
    font-weight: 600;
    color: #5C6C75;
    white-space: nowrap;
  }
  .ht-row-actions {
    display: flex;
    gap: 6px;
    padding-top: 8px;
    border-top: 1px solid #F1F3F0;
  }
  .ht-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border: 1px solid #E8EDEB;
    background: #FFFFFF;
    color: #5C6C75;
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  }
  .ht-action:hover:not(:disabled) {
    background: #F1F4F2;
    color: #00684A;
    border-color: #C1F1D6;
  }
  .ht-action:disabled { opacity: 0.4; cursor: not-allowed; }
  .ht-action--promote {
    background: #E3FCEF;
    border-color: #C1F1D6;
    color: #00513A;
  }
  .ht-action--promote:hover:not(:disabled) {
    background: #C1F1D6;
    color: #00513A;
  }
  .ht-action--danger:hover:not(:disabled) {
    background: #FCEEEE;
    color: #B23A3A;
    border-color: #F5C9C9;
  }

  .ht-map-card { padding: 14px; }
  .ht-map-wrap {
    position: relative;
    height: clamp(420px, 65vh, 720px);
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #E8EDEB;
    background: #F1F4F2;
  }
  .ht-map-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
  }
  .ht-map-loading p {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .ht-legend {
    position: absolute;
    top: 14px;
    right: 14px;
    z-index: 1000;
    background: rgba(255,255,255,0.96);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 4px 14px rgba(0, 30, 43, 0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 180px;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .ht-legend-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 500;
    color: #001E2B;
  }
  .ht-legend-line {
    width: 22px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .ht-detail-panel {
    position: absolute;
    bottom: 14px;
    left: 14px;
    z-index: 1000;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    padding: 12px 14px;
    box-shadow: 0 4px 14px rgba(0, 30, 43, 0.08);
    font-family: 'Geist', 'Outfit', sans-serif;
    min-width: 240px;
  }
  .ht-detail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .ht-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
  }
  .ht-detail-item { display: flex; flex-direction: column; gap: 2px; }
  .ht-detail-label {
    font-size: 10px;
    font-weight: 700;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .ht-detail-value {
    font-size: 14px;
    font-weight: 700;
    color: #001E2B;
  }

  /* Auto-select modal */
  .ht-methods { display: flex; flex-direction: column; gap: 10px; }
  .ht-method-card {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 14px 16px;
    border: 1px solid #E8EDEB;
    background: #FFFFFF;
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s ease, border-color 0.12s ease;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .ht-method-card:hover:not(:disabled) {
    background: #FAFEFC;
    border-color: #C1F1D6;
  }
  .ht-method-card:disabled { opacity: 0.5; cursor: not-allowed; }
  .ht-method-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #F1F4F2;
    color: #00684A;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .ht-method-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .ht-method-title {
    font-size: 14px;
    font-weight: 700;
    color: #001E2B;
  }
  .ht-method-desc {
    font-size: 12.5px;
    color: #5C6C75;
    line-height: 1.4;
  }
  .ht-method-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    background: #FFF8E6;
    border: 1px solid #F0DCA5;
    border-radius: 8px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    color: #8C5A00;
    line-height: 1.45;
    margin-top: 4px;
  }
  .ht-method-note svg { color: #C28A00; flex-shrink: 0; margin-top: 2px; }

  /* Editor modal */
  .ht-editor { display: flex; flex-direction: column; gap: 12px; }
  .ht-editor-textarea {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #E8EDEB;
    border-radius: 8px;
    background: #FAFBFA;
    font-family: 'Geist Mono', ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 12.5px;
    color: #001E2B;
    line-height: 1.55;
    resize: vertical;
  }
  .ht-editor-textarea:focus {
    outline: 2px solid #00A35C;
    outline-offset: -1px;
    background: #FFFFFF;
  }
  .ht-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
`;

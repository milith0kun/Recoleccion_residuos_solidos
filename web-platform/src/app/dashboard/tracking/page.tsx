'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Truck,
  Navigation,
  Activity,
  User,
  Wifi,
  WifiOff,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import type { Map as LeafletMap } from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(m => m.Polyline), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const DEFAULT_POLL_INTERVAL_MS = 5000;
const POLL_INTERVAL_MS = Math.max(
  3000,
  Number.parseInt(process.env.NEXT_PUBLIC_TRACKING_POLL_MS || `${DEFAULT_POLL_INTERVAL_MS}`, 10) ||
    DEFAULT_POLL_INTERVAL_MS
);

const DEFAULT_STALE_THRESHOLD_MS = 120000;
const STALE_THRESHOLD_MS = Math.max(
  30000,
  Number.parseInt(
    process.env.NEXT_PUBLIC_TRACKING_STALE_MS || `${DEFAULT_STALE_THRESHOLD_MS}`,
    10
  ) || DEFAULT_STALE_THRESHOLD_MS
);

interface ActiveVehicle {
  executionId: string;
  routeId: string;
  routeName: string;
  operatorName: string;
  vehicle: { plate: string; type: string } | null;
  lastLocation: { lng: number; lat: number; timestamp: string; speed?: number } | null;
  distanceToUserMeters?: number | null;
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
  const [now, setNow] = useState<number>(() => Date.now());
  const mapRef = useRef<LeafletMap | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  const fetchActiveData = useCallback(async (): Promise<ActiveVehicle[]> => {
    const res = await apiFetch('/api/v1/gps/active');
    return res.data?.data ?? [];
  }, [apiFetch]);

  const fetchTrailData = useCallback(
    async (executionId: string): Promise<TrailPoint[]> => {
      const res = await apiFetch(`/api/v1/gps/track?routeExecution=${executionId}`);
      const points: { lat: number; lng: number; timestamp: string }[] = res.data?.points ?? [];
      return points.slice(0, 20).reverse();
    },
    [apiFetch]
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const list = await fetchActiveData();
        if (!cancelled) setVehicles(list);
      } catch (err) {
        if (!cancelled) console.error('Error fetching active GPS:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    intervalRef.current = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActiveData]);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedExecId) {
        if (!cancelled) setTrail([]);
        return;
      }
      try {
        const pts = await fetchTrailData(selectedExecId);
        if (!cancelled) setTrail(pts);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching trail:', err);
          setTrail([]);
        }
      }
    };
    run();
    if (!selectedExecId) {
      return () => { cancelled = true; };
    }
    const id = setInterval(run, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedExecId, fetchTrailData]);

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
      return now - new Date(lastSeen).getTime() > STALE_THRESHOLD_MS;
    },
    [now]
  );

  const staleThresholdLabel = `${Math.floor(STALE_THRESHOLD_MS / 1000)}s`;

  const liveCount = vehicles.filter(v => !staleNow(v.lastSeenAt)).length;

  return (
    <div className="adm-page animate-fade-in">
      <style>{trackingStyles}</style>

      <header className="adm-header">
        <div>
          <h1 className="adm-title">
            Seguimiento <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>en vivo</em>.
          </h1>
          <p className="adm-sub">
            Monitoreo GPS de la flota de recolección · actualización cada {POLL_INTERVAL_MS / 1000}s.
          </p>
        </div>
        <div className="adm-header-actions">
          <span className={`adm-stat-pill ${liveCount > 0 ? 'adm-stat-pill--green' : ''}`}>
            <span className="adm-status-dot" />
            <strong>{liveCount}</strong>
            <span>en línea</span>
          </span>
          <span className="adm-stat-pill">
            <Truck size={12} style={{ marginRight: 2 }} />
            <strong>{vehicles.length}</strong>
            <span>activas</span>
          </span>
        </div>
      </header>

      <div className="trk-grid">
        {/* Mapa */}
        <section className="adm-section trk-map-card">
          <div className="trk-map-wrap">
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

                {trail.length > 1 && (
                  <Polyline
                    positions={trail.map(p => [p.lat, p.lng] as [number, number])}
                    pathOptions={{ color: '#00684A', weight: 4, opacity: 0.55 }}
                  />
                )}

                {vehicles.map(v => {
                  if (!v.lastLocation) return null;
                  const stale = staleNow(v.lastSeenAt);
                  const isSelected = v.executionId === selectedExecId;
                  const color = stale ? '#D97706' : '#00A35C';
                  return (
                    <CircleMarker
                      key={v.executionId}
                      center={[v.lastLocation.lat, v.lastLocation.lng]}
                      radius={isSelected ? 13 : 10}
                      pathOptions={{
                        color: '#FFFFFF',
                        fillColor: color,
                        fillOpacity: 1,
                        weight: isSelected ? 4 : 3,
                      }}
                      eventHandlers={{ click: () => handleSelect(v) }}
                    >
                      <Popup>
                        <div className="trk-popup">
                          <div className="trk-popup-head">
                            <strong>{v.vehicle?.plate ?? 'Sin vehículo'}</strong>
                            <span
                              className={`adm-status ${
                                stale ? 'adm-status--amber' : 'adm-status--green'
                              }`}
                            >
                              <span className="adm-status-dot" />
                              {stale ? 'Sin señal' : 'En vivo'}
                            </span>
                          </div>
                          <div className="trk-popup-body">
                            <div className="trk-popup-row">
                              <Navigation size={12} />
                              <span className="trk-popup-label">Ruta</span>
                              <span className="trk-popup-value">{v.routeName}</span>
                            </div>
                            <div className="trk-popup-row">
                              <User size={12} />
                              <span className="trk-popup-label">Operador</span>
                              <span className="trk-popup-value">{v.operatorName}</span>
                            </div>
                            {typeof v.lastLocation.speed === 'number' && (
                              <div className="trk-popup-row">
                                <Activity size={12} />
                                <span className="trk-popup-label">Velocidad</span>
                                <span className="trk-popup-value">
                                  {v.lastLocation.speed.toFixed(0)} km/h
                                </span>
                              </div>
                            )}
                            <div className="trk-popup-row">
                              {stale ? (
                                <WifiOff size={12} style={{ color: '#D97706' }} />
                              ) : (
                                <Wifi size={12} style={{ color: '#00A35C' }} />
                              )}
                              <span className="trk-popup-label">Última señal</span>
                              <span className="trk-popup-value">
                                {formatSecondsAgo(v.lastSeenAt)}
                              </span>
                            </div>
                            {typeof v.distanceToUserMeters === 'number' && (
                              <div className="trk-popup-row">
                                <Navigation size={12} />
                                <span className="trk-popup-label">Distancia</span>
                                <span className="trk-popup-value">
                                  {v.distanceToUserMeters < 1000
                                    ? `${v.distanceToUserMeters} m`
                                    : `${(v.distanceToUserMeters / 1000).toFixed(1)} km`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="trk-loading">
                <div className="adm-spinner" />
                <p>Cargando mapa de tracking…</p>
              </div>
            )}

            {/* Leyenda flotante */}
            <div className="trk-legend">
              <span className="adm-eyebrow" style={{ margin: 0 }}>Estado GPS</span>
              <div className="trk-legend-row">
                <span className="trk-legend-dot" style={{ background: '#00A35C' }} />
                <span>En vivo</span>
              </div>
              <div className="trk-legend-row">
                <span className="trk-legend-dot" style={{ background: '#D97706' }} />
                <span>Sin señal &gt; {staleThresholdLabel}</span>
              </div>
              <div className="trk-legend-row">
                <span className="trk-legend-line" />
                <span>Trail seleccionado</span>
              </div>
            </div>
          </div>
        </section>

        {/* Panel lateral */}
        <aside className="trk-aside">
          <section className="adm-section trk-vehicles">
            <div className="adm-section-header" style={{ marginBottom: 14 }}>
              <div>
                <h3 className="adm-section-title">Vehículos activos</h3>
                <p className="adm-section-sub">
                  Selecciona uno para ver su trail en el mapa.
                </p>
              </div>
              <span className="trk-count">{vehicles.length}</span>
            </div>

            <div className="trk-vehicles-list">
              {vehicles.length === 0 ? (
                <div className="adm-state">
                  <div className="adm-state-icon">
                    <Truck size={22} strokeWidth={2} />
                  </div>
                  <p className="adm-state-title">
                    No hay camiones operando ahora
                  </p>
                  <p className="adm-state-desc">
                    Cuando un operador inicie su ruta desde la app móvil aparecerá acá en tiempo real.
                  </p>
                </div>
              ) : (
                vehicles.map(v => {
                  const stale = staleNow(v.lastSeenAt);
                  const isSelected = v.executionId === selectedExecId;
                  const Icon = stale ? AlertTriangle : Radio;
                  return (
                    <button
                      type="button"
                      key={v.executionId}
                      onClick={() => handleSelect(v)}
                      className={`adm-tile trk-vehicle ${isSelected ? 'trk-vehicle--selected' : ''}`}
                    >
                      <span className={`adm-tile-icon ${stale ? 'trk-vehicle-icon--stale' : ''}`}>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      <span className="adm-tile-body">
                        <span className="trk-vehicle-row">
                          <span className="adm-tile-title">
                            {v.vehicle?.plate ?? '—'}
                          </span>
                          <span
                            className={`adm-status ${
                              stale ? 'adm-status--amber' : 'adm-status--green'
                            }`}
                            style={{ fontSize: 10 }}
                          >
                            <span className="adm-status-dot" />
                            {stale ? 'Sin señal' : 'En vivo'}
                          </span>
                        </span>
                        <span className="trk-vehicle-meta">
                          <Navigation size={11} />
                          <span>{v.routeName}</span>
                        </span>
                        {typeof v.distanceToUserMeters === 'number' && (
                          <span className="trk-vehicle-meta">
                            <Navigation size={11} />
                            <span>
                              Aprox. {v.distanceToUserMeters < 1000
                                ? `${v.distanceToUserMeters} m`
                                : `${(v.distanceToUserMeters / 1000).toFixed(1)} km`} de tu domicilio
                            </span>
                          </span>
                        )}
                        <span className="trk-vehicle-meta">
                          <User size={11} />
                          <span>{v.operatorName}</span>
                        </span>
                        <span className="trk-vehicle-foot">
                          <span>{formatSecondsAgo(v.lastSeenAt)}</span>
                          {v.lastLocation && typeof v.lastLocation.speed === 'number' && (
                            <span className="trk-speed">
                              <Activity size={10} />
                              {v.lastLocation.speed.toFixed(0)} km/h
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {vehicles.length > 0 && (
              <div className="trk-polling">
                <span className="adm-status adm-status--green">
                  <span className="adm-status-dot" />
                  Polling activo
                </span>
                <p className="adm-sub" style={{ margin: 0, fontSize: 12 }}>
                  Coordenadas cada {POLL_INTERVAL_MS / 1000}s · tocá un vehículo para enfocar el mapa.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

const trackingStyles = `
  .trk-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 1100px) {
    .trk-grid { grid-template-columns: minmax(0, 1fr) 360px; }
  }

  /* Map card */
  .trk-map-card {
    padding: 14px;
    overflow: hidden;
  }
  .trk-map-wrap {
    position: relative;
    height: clamp(380px, 60vh, 620px);
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #E8EDEB;
    background: #F1F4F2;
  }
  @media (max-width: 767px) {
    .trk-map-wrap { height: clamp(320px, 55vh, 460px); }
    .trk-vehicles { padding: 16px; }
    .trk-legend {
      top: 10px;
      right: 10px;
      padding: 10px 12px;
      min-width: 150px;
      font-size: 11.5px;
    }
  }
  .leaflet-container {
    background: #FAFBFA;
  }
  .trk-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 14px;
  }
  .trk-loading p {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Legend overlay */
  .trk-legend {
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
  .trk-legend-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 500;
    color: #001E2B;
  }
  .trk-legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
  }
  .trk-legend-line {
    width: 18px;
    height: 2px;
    background: #00684A;
    opacity: 0.55;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* Aside */
  .trk-aside {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .trk-vehicles {
    display: flex;
    flex-direction: column;
    padding: 22px;
    height: 100%;
  }
  .trk-count {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: #F1F4F2;
    border: 1px solid #E8EDEB;
    color: #00684A;
    display: grid;
    place-items: center;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .trk-vehicles-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    margin: 0 -4px;
    padding: 0 4px;
  }

  /* Vehicle tile */
  .trk-vehicle {
    align-items: flex-start;
    padding: 14px 14px;
    text-align: left;
    cursor: pointer;
  }
  .trk-vehicle--selected {
    background: #FAFEFC;
    border-color: #C1F1D6;
    box-shadow: 0 0 0 3px rgba(0, 104, 74, 0.06);
  }
  .trk-vehicle-icon--stale {
    background: #FFF1D6 !important;
    color: #8C5A00 !important;
    box-shadow: inset 0 0 0 1px #F0DCA5 !important;
  }
  .trk-vehicle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .trk-vehicle-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #5C6C75;
    margin-top: 3px;
  }
  .trk-vehicle-meta svg {
    color: #889397;
    flex-shrink: 0;
  }
  .trk-vehicle-meta span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .trk-vehicle-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid #F1F3F0;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: #5C6C75;
    letter-spacing: 0.02em;
  }
  .trk-speed {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #00513A;
  }

  /* Polling banner (usa .adm-status--green + .adm-sub) */
  .trk-polling {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 8px;
    background: #F9FBFA;
    border: 1px solid #E8EDEB;
  }

  /* Popup container (overrides Leaflet ya viven en globals.css) */
  .trk-popup {
    min-width: 220px;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .trk-popup-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid #E8EDEB;
  }
  .trk-popup-head strong {
    font-size: 14px;
    font-weight: 700;
    color: #001E2B;
    letter-spacing: -0.005em;
  }
  .trk-popup-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .trk-popup-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #5C6C75;
  }
  .trk-popup-row svg {
    color: #889397;
    flex-shrink: 0;
  }
  .trk-popup-label {
    font-weight: 600;
    color: #5C6C75;
    flex-shrink: 0;
  }
  .trk-popup-value {
    color: #001E2B;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

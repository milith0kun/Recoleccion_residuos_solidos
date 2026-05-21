'use client';

import { useApi } from '@/hooks/useApi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, AlertTriangle, Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import type { LeafletMouseEvent } from 'leaflet';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const MapClickCapture = dynamic(() => import('@/components/map/MapClickCapture'), { ssr: false });

interface IncidentData {
  _id: string;
  title: string;
  description: string;
  type: string;
  severity: string;
  status: string;
  address?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  createdAt: string;
  resolutionNote?: string;
  zone?: { _id: string; name?: string; district?: string } | null;
}

const severityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

const severityTone: Record<string, string> = {
  low: 'adm-status--green',
  medium: 'adm-status--amber',
  high: 'adm-status--amber',
  critical: 'adm-status--rose',
};

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  resolved: 'Resuelto',
};

const statusTone: Record<string, string> = {
  open: 'adm-status--rose',
  in_progress: 'adm-status--amber',
  resolved: 'adm-status--green',
};

export default function IncidentsPage() {
  const { apiFetch } = useApi();
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<IncidentData>>({
    title: '',
    description: '',
    type: 'other',
    severity: 'medium',
    status: 'open',
    address: '',
    resolutionNote: '',
    location: { type: 'Point', coordinates: [-71.978536, -13.517088] },
  });

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  const fetchIncidents = useCallback(async (): Promise<IncidentData[]> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const data = await apiFetch(`/api/v1/incidents?${params}`);
    return (data.data || []) as IncidentData[];
  }, [apiFetch, search, statusFilter]);

  const load = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchIncidents]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchIncidents();
        if (!cancelled) setIncidents(data);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchIncidents]);

  const handleOpenModal = (incident?: IncidentData) => {
    if (incident) {
      setEditingId(incident._id);
      setFormData({ ...incident });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        type: 'other',
        severity: 'medium',
        status: 'open',
        address: '',
        resolutionNote: '',
        location: { type: 'Point', coordinates: [-71.978536, -13.517088] },
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiFetch(`/api/v1/incidents/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            type: formData.type,
            severity: formData.severity,
            status: formData.status,
            resolutionNote: formData.resolutionNote,
            address: formData.address,
            lat: formData.location?.coordinates?.[1],
            lng: formData.location?.coordinates?.[0],
          }),
        });
        toast.success('Incidente actualizado correctamente');
      } else {
        await apiFetch('/api/v1/incidents', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            type: formData.type,
            severity: formData.severity,
            address: formData.address,
            lat: formData.location?.coordinates?.[1],
            lng: formData.location?.coordinates?.[0],
          }),
        });
        toast.success('Incidente reportado correctamente');
      }
      handleCloseModal();
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar incidente';
      toast.error(message);
    }
  };

  const handleDelete = async (_id: string) => {
    if (confirm('¿Eliminar este reporte de incidente?')) {
      await apiFetch(`/api/v1/incidents/${_id}`, { method: 'DELETE' });
      toast.success('Incidente eliminado');
      load();
    }
  };

  const prettyLocation = (inc: IncidentData): string => {
    if (inc.address) return inc.address;
    if (inc.location?.coordinates?.length === 2) {
      const [lng, lat] = inc.location.coordinates;
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    return 'Sin ubicación';
  };

  const selectedLat = formData.location?.coordinates?.[1] ?? -13.517088;
  const selectedLng = formData.location?.coordinates?.[0] ?? -71.978536;

  const onMapPick = (e: LeafletMouseEvent) => {
    setFormData((prev) => ({
      ...prev,
      location: { type: 'Point', coordinates: [e.latlng.lng, e.latlng.lat] },
    }));
  };

  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter((i) => i.status === 'open').length,
    inProgress: incidents.filter((i) => i.status === 'in_progress').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
  }), [incidents]);

  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Incidentes</h1>
          <p className="adm-sub">Registro y seguimiento de eventualidades operativas en ruta.</p>
        </div>
        <div className="adm-header-actions">
          <button onClick={() => handleOpenModal()} className="adm-btn-primary">
            <Plus size={15} />
            <span>Reportar incidente</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={14} className="adm-search-icon" />
          <input
            type="text"
            placeholder="Buscar incidente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="adm-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="open">Abierto</option>
          <option value="in_progress">En progreso</option>
          <option value="resolved">Resuelto</option>
        </select>
        <div className="adm-stat-pills">
          <span className="adm-stat-pill"><strong>{stats.total}</strong> total</span>
          <span className="adm-stat-pill adm-stat-pill--rose"><strong>{stats.open}</strong> abiertos</span>
          <span className="adm-stat-pill adm-stat-pill--amber"><strong>{stats.inProgress}</strong> en curso</span>
          <span className="adm-stat-pill adm-stat-pill--green"><strong>{stats.resolved}</strong> resueltos</span>
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-state">
            <span className="adm-spinner" />
            <p>Cargando incidentes…</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="adm-state">
            <div className="adm-state-icon">
              <AlertTriangle size={22} />
            </div>
            <p className="adm-state-title">Sin incidentes reportados</p>
            <p className="adm-state-desc">No hay eventualidades registradas en este período.</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Ubicación</th>
                <th>Fecha</th>
                <th className="adm-th-actions" />
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc._id}>
                  <td>
                    <div className="adm-row-title-cell">
                      <span
                        className={`adm-row-mini-avatar ${
                          inc.severity === 'critical'
                            ? 'adm-row-mini-avatar--rose'
                            : inc.severity === 'high' || inc.severity === 'medium'
                              ? 'adm-row-mini-avatar--amber'
                              : 'adm-row-mini-avatar--green'
                        }`}
                      >
                        <AlertTriangle size={14} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <strong>{inc.title}</strong>
                        <div className="adm-cell-muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {inc.description.length > 70 ? `${inc.description.slice(0, 70)}…` : inc.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`adm-status ${severityTone[inc.severity] || 'adm-status--neutral'}`}>
                      <span className="adm-status-dot" />
                      {severityLabels[inc.severity] || inc.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`adm-status ${statusTone[inc.status] || 'adm-status--neutral'}`}>
                      <span className="adm-status-dot" />
                      {statusLabels[inc.status] || inc.status}
                    </span>
                  </td>
                   <td className="adm-cell-muted">
                     {prettyLocation(inc)}
                     {inc.zone?.name ? <div style={{ fontSize: 11 }}>Zona: {inc.zone.name}</div> : null}
                   </td>
                   <td className="adm-cell-muted adm-cell-mono">
                     {inc.createdAt
                       ? new Date(inc.createdAt).toLocaleDateString('es-PE', {
                           day: '2-digit',
                           month: '2-digit',
                           year: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="adm-td-actions">
                    <div className="adm-actions">
                      <button onClick={() => handleOpenModal(inc)} className="adm-icon-btn" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(inc._id)}
                        className="adm-icon-btn adm-icon-btn--danger"
                        title="Eliminar"
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
          {incidents.length} incidente{incidents.length !== 1 ? 's' : ''}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar incidente' : 'Reportar incidente'}
      >
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-form-grid">
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Título</label>
              <input
                required
                type="text"
                className="adm-form-input"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Descripción</label>
              <textarea
                required
                className="adm-form-textarea"
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Tipo</label>
              <select
                required
                className="adm-form-select"
                value={formData.type || 'other'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={Boolean(editingId)}
              >
                <option value="accumulation">Acumulación</option>
                <option value="damaged_container">Contenedor dañado</option>
                <option value="missed_collection">Recolección no realizada</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Severidad</label>
              <select
                required
                className="adm-form-select"
                value={formData.severity || 'medium'}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Estado</label>
              <select
                required
                className="adm-form-select"
                value={formData.status || 'open'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="open">Abierto</option>
                <option value="in_progress">En progreso</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Dirección</label>
              <input
                type="text"
                className="adm-form-input"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={Boolean(editingId)}
              />
            </div>
            {editingId && (
              <div className="adm-form-field adm-form-field--full">
                <label className="adm-form-label">Nota de resolución</label>
                <textarea
                  className="adm-form-textarea"
                  rows={2}
                  value={formData.resolutionNote || ''}
                  onChange={(e) => setFormData({ ...formData, resolutionNote: e.target.value })}
                />
              </div>
            )}
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Punto exacto (mapa)</label>
              <div style={{ border: '1px solid #D5DCD6', borderRadius: 12, overflow: 'hidden' }}>
                {leafletLoaded ? (
                  <MapContainer center={[selectedLat, selectedLng]} zoom={16} style={{ height: 220, width: '100%' }}>
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <CircleMarker
                      center={[selectedLat, selectedLng]}
                      radius={8}
                      pathOptions={{ color: '#B91C1C', fillColor: '#DC2626', fillOpacity: 0.9 }}
                    />
                    <MapClickCapture onClick={onMapPick} enabled />
                  </MapContainer>
                ) : (
                  <div style={{ padding: 12, fontSize: 12, color: '#6B7280' }}>Cargando mapa…</div>
                )}
              </div>
              <div className="adm-cell-muted" style={{ marginTop: 6 }}>
                Lat: {selectedLat.toFixed(5)} · Lng: {selectedLng.toFixed(5)} (click para mover)
              </div>
            </div>
          </div>

          <div className="adm-form-actions">
            <button type="button" onClick={handleCloseModal} className="adm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="adm-btn-primary">
              {editingId ? 'Guardar cambios' : 'Crear reporte'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

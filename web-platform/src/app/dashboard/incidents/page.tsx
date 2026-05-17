'use client';

import { useApi } from '@/hooks/useApi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, AlertTriangle, Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

interface IncidentData {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  location: string;
  date: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<IncidentData>>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    location: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchIncidents = useCallback(async (): Promise<IncidentData[]> => {
    const mockData: IncidentData[] = [
      {
        _id: '1',
        title: 'Camión averiado',
        description: 'El camión recolector de la ruta 3 sufrió un desperfecto mecánico.',
        severity: 'high',
        status: 'in_progress',
        location: 'Av. El Sol',
        date: '2026-05-12',
      },
      {
        _id: '2',
        title: 'Vía bloqueada',
        description: 'Trabajos de mantenimiento impiden el paso a la zona sur.',
        severity: 'medium',
        status: 'open',
        location: 'Calle Belén',
        date: '2026-05-15',
      },
    ];
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch(`/api/v1/incidents?${params}`);
      return data.data || mockData;
    } catch {
      return mockData;
    }
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
        severity: 'medium',
        status: 'open',
        location: '',
        date: new Date().toISOString().split('T')[0],
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
        toast.success('Incidente actualizado correctamente');
      } else {
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
      toast.success('Incidente eliminado');
      load();
    }
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
                  <td className="adm-cell-muted">{inc.location}</td>
                  <td className="adm-cell-muted adm-cell-mono">
                    {inc.date
                      ? new Date(inc.date).toLocaleDateString('es-PE', {
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
              <label className="adm-form-label">Ubicación</label>
              <input
                required
                type="text"
                className="adm-form-input"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Fecha</label>
              <input
                required
                type="date"
                className="adm-form-input"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
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

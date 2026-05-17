'use client';

import { useApi } from '@/hooks/useApi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Car } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

interface VehicleData {
  _id: string;
  plate: string;
  type: string;
  capacity: number;
  status: string;
  lastMaintenance: string;
}

const statusLabels: Record<string, string> = {
  active: 'Activo',
  maintenance: 'Mantenimiento',
  inactive: 'Inactivo',
};

const statusTone: Record<string, string> = {
  active: 'adm-status--green',
  maintenance: 'adm-status--amber',
  inactive: 'adm-status--rose',
};

export default function VehiclesPage() {
  const { apiFetch } = useApi();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VehicleData>>({
    plate: '',
    type: 'Compactador',
    capacity: 10,
    status: 'active',
    lastMaintenance: new Date().toISOString().split('T')[0],
  });

  const fetchVehicles = useCallback(async (): Promise<VehicleData[]> => {
    const mockData: VehicleData[] = [
      { _id: '1', plate: 'ABC-123', type: 'Compactador', capacity: 15, status: 'active', lastMaintenance: '2026-04-12' },
      { _id: '2', plate: 'XYZ-987', type: 'Reciclaje', capacity: 8, status: 'maintenance', lastMaintenance: '2026-05-02' },
    ];
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const data = await apiFetch(`/api/v1/vehicles?${params}`);
      return data.data || mockData;
    } catch {
      return mockData;
    }
  }, [apiFetch, search, statusFilter]);

  const load = useCallback(async () => {
    try {
      const data = await fetchVehicles();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchVehicles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchVehicles();
        if (!cancelled) setVehicles(data);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchVehicles]);

  const handleOpenModal = (vehicle?: VehicleData) => {
    if (vehicle) {
      setEditingId(vehicle._id);
      setFormData({ ...vehicle });
    } else {
      setEditingId(null);
      setFormData({
        plate: '',
        type: 'Compactador',
        capacity: 10,
        status: 'active',
        lastMaintenance: new Date().toISOString().split('T')[0],
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
        toast.success('Vehículo actualizado correctamente');
      } else {
        toast.success('Vehículo creado correctamente');
      }
      handleCloseModal();
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar vehículo';
      toast.error(message);
    }
  };

  const handleDelete = async (_id: string) => {
    if (confirm('¿Eliminar este vehículo?')) {
      try {
        toast.success('Vehículo eliminado');
        load();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al eliminar vehículo';
        toast.error(message);
      }
    }
  };

  const stats = useMemo(() => ({
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'active').length,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    inactive: vehicles.filter((v) => v.status === 'inactive').length,
  }), [vehicles]);

  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Vehículos</h1>
          <p className="adm-sub">Flota de unidades recolectoras del sistema.</p>
        </div>
        <div className="adm-header-actions">
          <button onClick={() => handleOpenModal()} className="adm-btn-primary">
            <Plus size={15} />
            <span>Añadir vehículo</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={14} className="adm-search-icon" />
          <input
            type="text"
            placeholder="Buscar por placa"
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
          <option value="active">Activo</option>
          <option value="maintenance">Mantenimiento</option>
          <option value="inactive">Inactivo</option>
        </select>
        <div className="adm-stat-pills">
          <span className="adm-stat-pill"><strong>{stats.total}</strong> total</span>
          <span className="adm-stat-pill adm-stat-pill--green"><strong>{stats.active}</strong> activos</span>
          <span className="adm-stat-pill adm-stat-pill--amber"><strong>{stats.maintenance}</strong> mant.</span>
          <span className="adm-stat-pill adm-stat-pill--rose"><strong>{stats.inactive}</strong> inact.</span>
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-state">
            <span className="adm-spinner" />
            <p>Cargando vehículos…</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="adm-state">
            <div className="adm-state-icon">
              <Car size={22} />
            </div>
            <p className="adm-state-title">Sin vehículos registrados</p>
            <p className="adm-state-desc">Agregá una unidad para empezar a planificar rutas.</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Placa</th>
                <th>Tipo</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th>Último mantenimiento</th>
                <th className="adm-th-actions" />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v._id}>
                  <td>
                    <div className="adm-row-title-cell">
                      <span className="adm-row-mini-avatar adm-row-mini-avatar--green">
                        <Car size={14} />
                      </span>
                      <strong>{v.plate}</strong>
                    </div>
                  </td>
                  <td className="adm-cell-muted">{v.type}</td>
                  <td className="adm-cell-mono">{v.capacity} t</td>
                  <td>
                    <span className={`adm-status ${statusTone[v.status] || 'adm-status--neutral'}`}>
                      <span className="adm-status-dot" />
                      {statusLabels[v.status] || 'Desconocido'}
                    </span>
                  </td>
                  <td className="adm-cell-muted adm-cell-mono">
                    {v.lastMaintenance
                      ? new Date(v.lastMaintenance).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="adm-td-actions">
                    <div className="adm-actions">
                      <button onClick={() => handleOpenModal(v)} className="adm-icon-btn" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(v._id)}
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
          {vehicles.length} vehículo{vehicles.length !== 1 ? 's' : ''}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar vehículo' : 'Añadir vehículo'}
      >
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-form-grid">
            <div className="adm-form-field">
              <label className="adm-form-label">Placa</label>
              <input
                required
                type="text"
                className="adm-form-input"
                placeholder="Ej: ABC-123"
                value={formData.plate || ''}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Tipo</label>
              <select
                required
                className="adm-form-select"
                value={formData.type || 'Compactador'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="Compactador">Compactador</option>
                <option value="Reciclaje">Camión de Reciclaje</option>
                <option value="Volquete">Volquete</option>
              </select>
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Capacidad (Toneladas)</label>
              <input
                required
                type="number"
                min="1"
                className="adm-form-input"
                value={formData.capacity || 0}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Estado</label>
              <select
                required
                className="adm-form-select"
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Activo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Último mantenimiento</label>
              <input
                required
                type="date"
                className="adm-form-input"
                value={formData.lastMaintenance || ''}
                onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
              />
            </div>
          </div>

          <div className="adm-form-actions">
            <button type="button" onClick={handleCloseModal} className="adm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="adm-btn-primary">
              {editingId ? 'Guardar cambios' : 'Crear vehículo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

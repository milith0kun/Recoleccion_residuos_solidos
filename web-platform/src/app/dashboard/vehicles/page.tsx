'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState } from 'react';
import { Search, Filter, AlertCircle, Plus, Edit2, Trash2, Car, Wrench, CheckCircle } from 'lucide-react';
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
  maintenance: 'En Mantenimiento',
  inactive: 'Inactivo',
};

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  maintenance: 'bg-amber-50 text-amber-600 border-amber-200',
  inactive: 'bg-rose-50 text-rose-600 border-rose-200',
};

export default function VehiclesPage() {
  const { apiFetch } = useApi();
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<VehicleData>>({
    plate: '',
    type: 'Compactor',
    capacity: 0,
    status: 'active',
    lastMaintenance: new Date().toISOString().split('T')[0]
  });

  const load = async () => {
    try {
      // Mock data in case API is not ready
      const mockData = [
        { _id: '1', plate: 'ABC-123', type: 'Compactador', capacity: 15, status: 'active', lastMaintenance: '2023-10-01' },
        { _id: '2', plate: 'XYZ-987', type: 'Reciclaje', capacity: 8, status: 'maintenance', lastMaintenance: '2023-10-15' }
      ];
      
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        const data = await apiFetch(`/api/v1/vehicles?${params}`);
        setVehicles(data.data || mockData);
      } catch (err) {
        setVehicles(mockData);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, [apiFetch, search, statusFilter]);

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
        lastMaintenance: new Date().toISOString().split('T')[0]
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
        // await apiFetch(`/api/v1/vehicles/${editingId}`, { method: 'PUT', body: JSON.stringify(formData) });
        toast.success('Vehículo actualizado exitosamente (Mock)');
      } else {
        // await apiFetch('/api/v1/vehicles', { method: 'POST', body: JSON.stringify(formData) });
        toast.success('Vehículo creado exitosamente (Mock)');
      }
      handleCloseModal();
      load();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar vehículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este vehículo?')) {
      try {
        // await apiFetch(`/api/v1/vehicles/${id}`, { method: 'DELETE' });
        toast.success('Vehículo eliminado exitosamente (Mock)');
        load();
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar vehículo');
      }
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Flota de Vehículos</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Gestión y control de unidades recolectoras.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Añadir Vehículo
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-5">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por placa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-12 pr-10 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-xs font-black text-slate-600 focus:bg-white focus:border-emerald-500/20 appearance-none transition-all cursor-pointer uppercase tracking-widest"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="maintenance">En Mantenimiento</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Cargando Flota...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vehicles.map((v, idx) => (
            <div
              key={v._id}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-2 flex flex-col group relative overflow-hidden"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-6 relative">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border transition-transform group-hover:scale-110 duration-500 bg-emerald-50 text-emerald-600 border-emerald-100">
                    <Car className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{v.plate}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{v.type}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6 space-y-3 flex-1">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Capacidad</span>
                  <span className="text-sm font-black text-slate-700">{v.capacity} Ton</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500">Últ. Mantenimiento</span>
                  <span className="text-sm font-black text-slate-700">{v.lastMaintenance}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative">
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border ${statusColors[v.status] || statusColors.inactive}`}>
                  {statusLabels[v.status] || 'Desconocido'}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(v)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(v._id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Vehículo' : 'Añadir Vehículo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Placa</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" placeholder="Ej: ABC-123" value={formData.plate || ''} onChange={e => setFormData({...formData, plate: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
            <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.type || 'Compactador'} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Compactador">Compactador</option>
              <option value="Reciclaje">Camión de Reciclaje</option>
              <option value="Volquete">Volquete</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Capacidad (Toneladas)</label>
            <input required type="number" min="1" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.capacity || 0} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
            <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value})}>
              <option value="active">Activo</option>
              <option value="maintenance">En Mantenimiento</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Último Mantenimiento</label>
            <input required type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.lastMaintenance || ''} onChange={e => setFormData({...formData, lastMaintenance: e.target.value})} />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">{editingId ? 'Guardar Cambios' : 'Crear Vehículo'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

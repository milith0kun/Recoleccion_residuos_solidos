'use client';

import { useApi } from '@/hooks/useApi';
import { useCallback, useEffect, useState } from 'react';
import { Search, AlertTriangle, AlertCircle, Plus, Edit2, Trash2, MapPin, Clock } from 'lucide-react';
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
  critical: 'Crítica'
};

const severityColors: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  high: 'bg-orange-50 text-orange-600 border-orange-200',
  critical: 'bg-rose-50 text-rose-600 border-rose-200'
};

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto'
};

export default function IncidentsPage() {
  const { apiFetch } = useApi();
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<IncidentData>>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    location: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchIncidents = useCallback(async (): Promise<IncidentData[]> => {
    const mockData: IncidentData[] = [
      { _id: '1', title: 'Camión Averiado', description: 'El camión recolector de la ruta 3 sufrió un desperfecto mecánico.', severity: 'high', status: 'in_progress', location: 'Av. El Sol', date: '2023-10-24' },
      { _id: '2', title: 'Vía Bloqueada', description: 'Trabajos de mantenimiento impiden el paso a la zona sur.', severity: 'medium', status: 'open', location: 'Calle Belén', date: '2023-10-25' }
    ];
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const data = await apiFetch(`/api/v1/incidents?${params}`);
      return data.data || mockData;
    } catch {
      return mockData;
    }
  }, [apiFetch, search]);

  const load = useCallback(async () => {
    try {
      const data = await fetchIncidents();
      setIncidents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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
        date: new Date().toISOString().split('T')[0]
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
        toast.success('Incidente actualizado exitosamente (Mock)');
      } else {
        toast.success('Incidente reportado exitosamente (Mock)');
      }
      handleCloseModal();
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar incidente';
      toast.error(message);
    }
  };

  const handleDelete = async (_id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este reporte de incidente?')) {
      toast.success('Incidente eliminado exitosamente (Mock)');
      load();
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Reporte de Incidentes</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Registro y seguimiento de eventualidades en ruta.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Reportar Incidente
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-5">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar incidentes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Cargando Incidentes...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <AlertCircle className="w-16 h-16 text-slate-200 mb-4" />
          <p className="text-xl font-bold text-slate-500">No hay incidentes reportados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {incidents.map((incident, idx) => (
            <div
              key={incident._id}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 flex flex-col group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border ${severityColors[incident.severity]}`}>
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest bg-slate-50 text-slate-500">
                  {statusLabels[incident.status]}
                </span>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-2">{incident.title}</h3>
                <p className="text-sm font-medium text-slate-500 mb-6">{incident.description}</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <MapPin className="w-4 h-4 text-emerald-600" /> {incident.location}
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <Clock className="w-4 h-4 text-emerald-600" /> {incident.date}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-50 mt-6">
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border ${severityColors[incident.severity]}`}>
                  Prioridad {severityLabels[incident.severity]}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(incident)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(incident._id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Incidente' : 'Reportar Incidente'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Título</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
            <textarea required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Severidad</label>
              <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.severity || 'medium'} onChange={e => setFormData({...formData, severity: e.target.value})}>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
              <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.status || 'open'} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="open">Abierto</option>
                <option value="in_progress">En Progreso</option>
                <option value="resolved">Resuelto</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Fecha</label>
            <input required type="date" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">{editingId ? 'Guardar Cambios' : 'Crear Reporte'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

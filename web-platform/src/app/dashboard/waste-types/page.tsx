'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState } from 'react';
import { Search, Filter, AlertCircle, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

interface WasteTypeData {
  _id: string;
  name: string;
  category: string;
  description: string;
  examples: string[];
  handlingInstructions: string;
  colorCode: string;
  isActive: boolean;
}

const categoryLabels: Record<string, string> = {
  organic: 'Orgánico',
  recyclable: 'Reciclable',
  non_recyclable: 'No Reciclable',
  hazardous: 'Peligroso',
};

const categoryEmoji: Record<string, string> = {
  organic: '🥬',
  recyclable: '♻️',
  non_recyclable: '🗑️',
  hazardous: '⚠️',
};

export default function WasteTypesPage() {
  const { apiFetch } = useApi();
  const [wasteTypes, setWasteTypes] = useState<WasteTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WasteTypeData>>({
    name: '',
    category: 'organic',
    description: '',
    examples: [],
    handlingInstructions: '',
    colorCode: '#000000'
  });
  const [examplesInput, setExamplesInput] = useState('');

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const data = await apiFetch(`/api/v1/waste-types?${params}`);
      setWasteTypes(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, [apiFetch, search, categoryFilter]);

  const handleOpenModal = (wasteType?: WasteTypeData) => {
    if (wasteType) {
      setEditingId(wasteType._id);
      setFormData({
        name: wasteType.name,
        category: wasteType.category,
        description: wasteType.description,
        examples: wasteType.examples,
        handlingInstructions: wasteType.handlingInstructions,
        colorCode: wasteType.colorCode,
      });
      setExamplesInput(wasteType.examples.join(', '));
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        category: 'organic',
        description: '',
        examples: [],
        handlingInstructions: '',
        colorCode: '#000000'
      });
      setExamplesInput('');
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
      const payload = {
        ...formData,
        examples: examplesInput.split(',').map(ex => ex.trim()).filter(Boolean)
      };

      if (editingId) {
        await apiFetch(`/api/v1/waste-types/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Residuo actualizado exitosamente');
      } else {
        await apiFetch('/api/v1/waste-types', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Residuo creado exitosamente');
      }
      handleCloseModal();
      load();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar residuo');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este residuo?')) {
      try {
        await apiFetch(`/api/v1/waste-types/${id}`, {
          method: 'DELETE',
        });
        toast.success('Residuo eliminado exitosamente');
        load();
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar residuo');
      }
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Clasificación de Residuos</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Catálogo técnico basado en la norma técnica peruana <span className="text-emerald-600 font-bold">NTP 900.058</span>.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Añadir Residuo
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-5">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar residuo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-12 pr-10 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-xs font-black text-slate-600 focus:bg-white focus:border-emerald-500/20 appearance-none transition-all cursor-pointer uppercase tracking-widest"
          >
            <option value="">Todas las categorías</option>
            <option value="organic">Orgánico</option>
            <option value="recyclable">Reciclable</option>
            <option value="non_recyclable">No Reciclable</option>
            <option value="hazardous">Peligroso</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Cargando Catálogo Técnico...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wasteTypes.map((wt, idx) => (
            <div
              key={wt._id}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-2 flex flex-col group relative overflow-hidden"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] group-hover:opacity-[0.07] transition-opacity" style={{ background: wt.colorCode }} />
              
              {/* Header */}
              <div className="flex items-start justify-between mb-8 relative">
                <div className="flex items-center gap-5">
                  <div
                    className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border transition-transform group-hover:scale-110 duration-500"
                    style={{ background: `${wt.colorCode}08`, borderColor: `${wt.colorCode}20` }}
                  >
                    {categoryEmoji[wt.category]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight mb-1.5">{wt.name}</h3>
                    <span
                      className="text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest inline-block border border-current opacity-70"
                      style={{ background: `${wt.colorCode}05`, color: wt.colorCode }}
                    >
                      {categoryLabels[wt.category]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed flex-1 italic">
                &quot;{wt.description}&quot;
              </p>

              {/* Examples */}
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2">
                   <div className="w-1 h-3 bg-slate-200 rounded-full" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ejemplos comunes</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {wt.examples.map((ex) => (
                    <span
                      key={ex}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100 transition-colors hover:bg-white hover:border-slate-200"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructions Box */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 mb-8 group-hover:bg-white transition-all group-hover:shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: wt.colorCode }} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5" /> Manipulación
                </p>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                  &quot;{wt.handlingInstructions}&quot;
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-3 rounded-full shadow-inner border border-white" style={{ background: wt.colorCode }} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wt.colorCode}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(wt)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(wt._id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Residuo' : 'Añadir Residuo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
            <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.category || 'organic'} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="organic">Orgánico</option>
              <option value="recyclable">Reciclable</option>
              <option value="non_recyclable">No Reciclable</option>
              <option value="hazardous">Peligroso</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
            <textarea required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Ejemplos (separados por coma)</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={examplesInput} onChange={e => setExamplesInput(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Instrucciones de Manipulación</label>
            <textarea required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" rows={2} value={formData.handlingInstructions || ''} onChange={e => setFormData({...formData, handlingInstructions: e.target.value})}></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Color (Hex)</label>
            <input required type="color" className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200" value={formData.colorCode || '#000000'} onChange={e => setFormData({...formData, colorCode: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">{editingId ? 'Guardar Cambios' : 'Crear Residuo'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
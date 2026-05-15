'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Map as MapIcon, Info, MapPin, Layers, Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(m => m.Polygon), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

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

export default function ZonesPage() {
  const { apiFetch } = useApi();
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ZoneData>>({
    name: '',
    description: '',
    district: '',
    color: '#000000',
  });
  const [geometryInput, setGeometryInput] = useState('');

  useEffect(() => {
    import('leaflet/dist/leaflet.css').then(() => setLeafletLoaded(true));
  }, []);

  const load = async () => {
    try {
      const data = await apiFetch('/api/v1/zones');
      setZones(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, [apiFetch]);

  const mapCenter = useMemo(() => [-13.52, -71.967] as [number, number], []);

  const handleOpenModal = (zone?: ZoneData) => {
    if (zone) {
      setEditingId(zone._id);
      setFormData({
        name: zone.name,
        description: zone.description,
        district: zone.district,
        color: zone.color,
      });
      setGeometryInput(JSON.stringify(zone.geometry.coordinates));
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        district: '',
        color: '#000000',
      });
      setGeometryInput('[[[-71.967, -13.520], [-71.968, -13.521], [-71.966, -13.521], [-71.967, -13.520]]]');
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
      let parsedCoordinates;
      try {
        parsedCoordinates = JSON.parse(geometryInput);
      } catch (err) {
        throw new Error('Coordenadas JSON inválidas');
      }

      const payload = {
        ...formData,
        geometry: {
          type: 'Polygon',
          coordinates: parsedCoordinates
        }
      };

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
      load();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar zona');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta zona?')) {
      try {
        await apiFetch(`/api/v1/zones/${id}`, {
          method: 'DELETE',
        });
        toast.success('Zona eliminada exitosamente');
        load();
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar zona');
      }
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
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
      <div className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 overflow-hidden group">
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
          <div className="absolute top-8 right-8 z-[1000] bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-2xl shadow-slate-900/10 max-w-[240px] hidden md:block transition-all hover:scale-105">
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
                {zone.geometry.coordinates[0].length - 1} Puntos
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

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Zona' : 'Añadir Zona'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Distrito</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.district || ''} onChange={e => setFormData({...formData, district: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Descripción</label>
            <textarea required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Color (Hex)</label>
            <input required type="color" className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200" value={formData.color || '#000000'} onChange={e => setFormData({...formData, color: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Coordenadas JSON (ej: [[[-71.9, -13.5], ...]]])</label>
            <textarea required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs" rows={4} value={geometryInput} onChange={e => setGeometryInput(e.target.value)}></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">{editingId ? 'Guardar Cambios' : 'Crear Zona'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

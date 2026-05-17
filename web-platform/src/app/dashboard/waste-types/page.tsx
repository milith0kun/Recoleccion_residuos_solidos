'use client';

import { useApi } from '@/hooks/useApi';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Edit2, Trash2, Recycle } from 'lucide-react';
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

const categoryTone: Record<string, string> = {
  organic: 'adm-status--green',
  recyclable: 'adm-status--blue',
  non_recyclable: 'adm-status--neutral',
  hazardous: 'adm-status--rose',
};

export default function WasteTypesPage() {
  const { apiFetch } = useApi();
  const [wasteTypes, setWasteTypes] = useState<WasteTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WasteTypeData>>({
    name: '',
    category: 'organic',
    description: '',
    examples: [],
    handlingInstructions: '',
    colorCode: '#00684A',
  });
  const [examplesInput, setExamplesInput] = useState('');

  const fetchWasteTypes = useCallback(async (): Promise<WasteTypeData[]> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    const data = await apiFetch(`/api/v1/waste-types?${params}`);
    return data.data || [];
  }, [apiFetch, search, categoryFilter]);

  const load = useCallback(async () => {
    try {
      const data = await fetchWasteTypes();
      setWasteTypes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchWasteTypes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWasteTypes();
        if (!cancelled) setWasteTypes(data);
      } catch (err) {
        if (!cancelled) console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchWasteTypes]);

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
        colorCode: '#00684A',
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
        examples: examplesInput.split(',').map((ex) => ex.trim()).filter(Boolean),
      };

      if (editingId) {
        await apiFetch(`/api/v1/waste-types/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Residuo actualizado correctamente');
      } else {
        await apiFetch('/api/v1/waste-types', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Residuo creado correctamente');
      }
      handleCloseModal();
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar residuo';
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este residuo?')) {
      try {
        await apiFetch(`/api/v1/waste-types/${id}`, { method: 'DELETE' });
        toast.success('Residuo eliminado');
        load();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al eliminar residuo';
        toast.error(message);
      }
    }
  };

  const stats = useMemo(() => ({
    total: wasteTypes.length,
    organic: wasteTypes.filter((w) => w.category === 'organic').length,
    recyclable: wasteTypes.filter((w) => w.category === 'recyclable').length,
    hazardous: wasteTypes.filter((w) => w.category === 'hazardous').length,
  }), [wasteTypes]);

  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Tipos de residuos</h1>
          <p className="adm-sub">
            Catálogo técnico alineado con la norma{' '}
            <span style={{ color: '#00684A', fontWeight: 600 }}>NTP 900.058</span>.
          </p>
        </div>
        <div className="adm-header-actions">
          <button onClick={() => handleOpenModal()} className="adm-btn-primary">
            <Plus size={15} />
            <span>Añadir residuo</span>
          </button>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={14} className="adm-search-icon" />
          <input
            type="text"
            placeholder="Buscar residuo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="adm-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          <option value="organic">Orgánico</option>
          <option value="recyclable">Reciclable</option>
          <option value="non_recyclable">No Reciclable</option>
          <option value="hazardous">Peligroso</option>
        </select>
        <div className="adm-stat-pills">
          <span className="adm-stat-pill"><strong>{stats.total}</strong> total</span>
          <span className="adm-stat-pill adm-stat-pill--green"><strong>{stats.organic}</strong> orgánicos</span>
          <span className="adm-stat-pill adm-stat-pill--blue"><strong>{stats.recyclable}</strong> reciclables</span>
          <span className="adm-stat-pill adm-stat-pill--rose"><strong>{stats.hazardous}</strong> peligrosos</span>
        </div>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-state">
            <span className="adm-spinner" />
            <p>Cargando residuos…</p>
          </div>
        ) : wasteTypes.length === 0 ? (
          <div className="adm-state">
            <div className="adm-state-icon">
              <Recycle size={22} />
            </div>
            <p className="adm-state-title">Sin tipos registrados</p>
            <p className="adm-state-desc">Agregá un tipo de residuo para empezar el catálogo.</p>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Color</th>
                <th>Ejemplos</th>
                <th className="adm-th-actions" />
              </tr>
            </thead>
            <tbody>
              {wasteTypes.map((wt) => (
                <tr key={wt._id}>
                  <td>
                    <div className="adm-row-title-cell">
                      <span
                        className="adm-row-mini-avatar"
                        style={{
                          background: `${wt.colorCode}1A`,
                          color: wt.colorCode,
                          borderColor: `${wt.colorCode}40`,
                        }}
                      >
                        <Recycle size={14} />
                      </span>
                      <div>
                        <strong>{wt.name}</strong>
                        <div className="adm-cell-muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {wt.description.length > 70 ? `${wt.description.slice(0, 70)}…` : wt.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`adm-status ${categoryTone[wt.category] || 'adm-status--neutral'}`}>
                      <span className="adm-status-dot" />
                      {categoryLabels[wt.category] || wt.category}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: wt.colorCode,
                          border: '1px solid #E8EDEB',
                        }}
                      />
                      <span className="adm-cell-mono adm-cell-muted">{wt.colorCode.toUpperCase()}</span>
                    </div>
                  </td>
                  <td className="adm-cell-muted">
                    {wt.examples.slice(0, 3).join(', ')}
                    {wt.examples.length > 3 && ` +${wt.examples.length - 3}`}
                  </td>
                  <td className="adm-td-actions">
                    <div className="adm-actions">
                      <button onClick={() => handleOpenModal(wt)} className="adm-icon-btn" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(wt._id)}
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
          {wasteTypes.length} tipo{wasteTypes.length !== 1 ? 's' : ''} de residuo
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? 'Editar residuo' : 'Añadir residuo'}
      >
        <form onSubmit={handleSubmit} className="adm-form">
          <div className="adm-form-grid">
            <div className="adm-form-field">
              <label className="adm-form-label">Nombre</label>
              <input
                required
                type="text"
                className="adm-form-input"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Categoría</label>
              <select
                required
                className="adm-form-select"
                value={formData.category || 'organic'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="organic">Orgánico</option>
                <option value="recyclable">Reciclable</option>
                <option value="non_recyclable">No Reciclable</option>
                <option value="hazardous">Peligroso</option>
              </select>
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
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Ejemplos (separados por coma)</label>
              <input
                required
                type="text"
                className="adm-form-input"
                value={examplesInput}
                onChange={(e) => setExamplesInput(e.target.value)}
                placeholder="Ej: Cáscaras de fruta, restos de comida, hojas secas"
              />
            </div>
            <div className="adm-form-field adm-form-field--full">
              <label className="adm-form-label">Instrucciones de manipulación</label>
              <textarea
                required
                className="adm-form-textarea"
                rows={2}
                value={formData.handlingInstructions || ''}
                onChange={(e) => setFormData({ ...formData, handlingInstructions: e.target.value })}
              />
            </div>
            <div className="adm-form-field">
              <label className="adm-form-label">Color de identificación</label>
              <input
                required
                type="color"
                className="adm-form-input"
                style={{ height: 44, padding: 4 }}
                value={formData.colorCode || '#00684A'}
                onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
              />
              <span className="adm-form-hint">Código de color según norma NTP 900.058.</span>
            </div>
          </div>

          <div className="adm-form-actions">
            <button type="button" onClick={handleCloseModal} className="adm-btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="adm-btn-primary">
              {editingId ? 'Guardar cambios' : 'Crear residuo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Search, Send, Recycle } from 'lucide-react';
import { toast } from 'sonner';

type WasteTypeData = {
  _id: string;
  name: string;
  category: 'organic' | 'recyclable' | 'non_recyclable' | 'hazardous';
  description: string;
  descriptionQuechua?: string;
  examples: string[];
  handlingInstructions: string;
  handlingInstructionsQuechua?: string;
  colorCode: string;
  iconUrl?: string;
  isActive: boolean;
};

const CATEGORY_LABEL: Record<WasteTypeData['category'], { es: string; qu: string }> = {
  organic: { es: 'Orgánico', qu: 'Kawsaymanta qupa' },
  recyclable: { es: 'Reciclable', qu: 'Kutichinapaq qopa' },
  non_recyclable: { es: 'No reciclable', qu: 'Mana kutichinapaq qopa' },
  hazardous: { es: 'Peligroso', qu: 'Manchay qopa' },
};

export default function LearnSegregatePage() {
  const { apiFetch } = useApi();
  const [items, setItems] = useState<WasteTypeData[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WasteTypeData | null>(null);
  const [suggestionName, setSuggestionName] = useState('');
  const [suggestionNotes, setSuggestionNotes] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch('/api/v1/waste-types?autocomplete=true&limit=200');
        if (!cancelled) setItems(response.data || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.examples.some((e) => e.toLowerCase().includes(q))
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    return {
      organic: items.filter((w) => w.category === 'organic'),
      recyclable: items.filter((w) => w.category === 'recyclable'),
      non_recyclable: items.filter((w) => w.category === 'non_recyclable'),
    };
  }, [items]);

  const onSuggest = async () => {
    if (!suggestionName.trim()) {
      toast.error('Escribe el residuo que deseas sugerir');
      return;
    }
    try {
      setSending(true);
      await apiFetch('/api/v1/waste-types/suggestions', {
        method: 'POST',
        body: JSON.stringify({ name: suggestionName, notes: suggestionNotes }),
      });
      setSuggestionName('');
      setSuggestionNotes('');
      toast.success('Sugerencia enviada al administrador');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar sugerencia';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Aprende a segregar</h1>
          <p className="adm-sub">Guía visual ES/QUE para clasificar residuos según NTP 900.058.</p>
        </div>
      </header>

      <div className="adm-toolbar">
        <div className="adm-search" style={{ maxWidth: 520 }}>
          <Search size={14} className="adm-search-icon" />
          <input
            type="text"
            placeholder="Buscar residuo (ej. botella, cáscara, pilas)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <section className="adm-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="adm-section" style={{ padding: 16 }}>
          <h3 className="adm-section-title">Resultados</h3>
          {filtered.length === 0 ? (
            <div className="adm-state" style={{ padding: 20 }}>
              <div className="adm-state-icon">
                <BookOpen size={22} />
              </div>
              <p className="adm-state-title">No encontramos ese residuo</p>
              <p className="adm-state-desc">Puedes sugerirlo para que el administrador lo agregue.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="adm-card"
                  style={{ textAlign: 'left', padding: 12, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {item.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.iconUrl}
                        alt={item.name}
                        style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 8, border: '1px solid #E8EDEB' }}
                      />
                    ) : (
                      <span className="adm-row-mini-avatar" style={{ background: `${item.colorCode}1A`, color: item.colorCode }}>
                        <Recycle size={14} />
                      </span>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      <div className="adm-cell-muted" style={{ fontSize: 12 }}>
                        {CATEGORY_LABEL[item.category].es} · {CATEGORY_LABEL[item.category].qu}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="adm-section" style={{ padding: 16 }}>
          <h3 className="adm-section-title">Detalle</h3>
          {selected ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="adm-status adm-status--blue" style={{ width: 'fit-content' }}>
                <span className="adm-status-dot" />
                {CATEGORY_LABEL[selected.category].es}
              </div>
              <p className="adm-cell-muted">{selected.description}</p>
              {selected.descriptionQuechua && (
                <p className="adm-cell-muted"><strong>Quechua:</strong> {selected.descriptionQuechua}</p>
              )}
              <p><strong>Ejemplos:</strong> {selected.examples.join(', ')}</p>
              <p><strong>Instrucciones:</strong> {selected.handlingInstructions}</p>
              {selected.handlingInstructionsQuechua && (
                <p><strong>Instrucciones (Quechua):</strong> {selected.handlingInstructionsQuechua}</p>
              )}
            </div>
          ) : (
            <p className="adm-cell-muted">Selecciona un residuo para ver su clasificación e instrucciones.</p>
          )}
        </div>
      </section>

      <section className="adm-section" style={{ marginTop: 16, padding: 16 }}>
        <h3 className="adm-section-title">Categorías principales</h3>
        <div className="adm-stat-pills" style={{ marginTop: 8 }}>
          <span className="adm-stat-pill adm-stat-pill--green"><strong>{grouped.organic.length}</strong> Orgánicos</span>
          <span className="adm-stat-pill adm-stat-pill--blue"><strong>{grouped.recyclable.length}</strong> Reciclables</span>
          <span className="adm-stat-pill"><strong>{grouped.non_recyclable.length}</strong> No reciclables</span>
        </div>
      </section>

      <section className="adm-section" style={{ marginTop: 16, padding: 16 }}>
        <h3 className="adm-section-title">¿No encontraste tu residuo?</h3>
        <div className="adm-form-grid">
          <div className="adm-form-field">
            <label className="adm-form-label">Nombre del residuo</label>
            <input
              className="adm-form-input"
              value={suggestionName}
              onChange={(e) => setSuggestionName(e.target.value)}
              placeholder="Ej: Tetrapack"
            />
          </div>
          <div className="adm-form-field adm-form-field--full">
            <label className="adm-form-label">Notas (opcional)</label>
            <textarea
              className="adm-form-textarea"
              rows={2}
              value={suggestionNotes}
              onChange={(e) => setSuggestionNotes(e.target.value)}
              placeholder="Dónde suele desecharse o qué dudas tienes"
            />
          </div>
        </div>
        <div className="adm-form-actions">
          <button type="button" className="adm-btn-primary" onClick={onSuggest} disabled={sending}>
            <Send size={14} />
            <span>{sending ? 'Enviando...' : 'Enviar sugerencia'}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

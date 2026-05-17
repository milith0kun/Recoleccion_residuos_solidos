'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  Calendar,
  User,
  Route as RouteIcon,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  AlertOctagon,
  Ban,
} from 'lucide-react';

type DispatchStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

interface DispatchItem {
  _id: string;
  code: string;
  status: DispatchStatus;
  scheduledFor: string;
  notes?: string;
  rejectReason?: string;
  route: { _id: string; name: string; zone?: { name?: string } };
  driver: { _id: string; firstName: string; lastName: string };
  assignedBy?: { firstName: string; lastName: string };
  vehicle?: { plate: string; type: string };
  createdAt: string;
  acceptedAt?: string;
  startedAt?: string;
  endedAt?: string;
}

const STATUS_LABELS: Record<DispatchStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_ORDER: DispatchStatus[] = [
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
];

function statusClass(s: DispatchStatus): string {
  switch (s) {
    case 'pending':
      return 'adm-status--amber';
    case 'accepted':
      return 'adm-status--neutral';
    case 'in_progress':
      return 'adm-status--green';
    case 'completed':
      return 'adm-status--green';
    case 'rejected':
    case 'cancelled':
      return 'adm-status--rose';
  }
}

function StatusIcon({ status }: { status: DispatchStatus }) {
  const size = 12;
  switch (status) {
    case 'pending':
      return <PauseCircle size={size} />;
    case 'accepted':
      return <CheckCircle2 size={size} />;
    case 'in_progress':
      return <PlayCircle size={size} />;
    case 'completed':
      return <CheckCircle2 size={size} />;
    case 'rejected':
      return <XCircle size={size} />;
    case 'cancelled':
      return <Ban size={size} />;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DispatchesPage() {
  const { apiFetch } = useApi();
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'all'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const res = await apiFetch(`/api/v1/dispatches${qs}`);
      setItems((res.data as DispatchItem[]) ?? []);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar las asignaciones');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = useCallback(
    async (id: string) => {
      const reason = window.prompt('Motivo de cancelación (opcional):') ?? '';
      if (!confirm('¿Cancelar esta asignación?')) return;
      setBusy(id);
      try {
        await apiFetch(`/api/v1/dispatches/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ reason }),
        });
        toast.success('Asignación cancelada');
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo cancelar');
      } finally {
        setBusy(null);
      }
    },
    [apiFetch, load],
  );

  const counts = useMemo(() => {
    const c: Record<DispatchStatus, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const i of items) c[i.status]++;
    return c;
  }, [items]);

  return (
    <div className="adm-page animate-fade-in">
      <style>{styles}</style>

      <header className="adm-header">
        <div>
          <h1 className="adm-title">
            Asignaciones <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>de salida</em>.
          </h1>
          <p className="adm-sub">
            Salidas planificadas por el operador y entregadas a los conductores. Filtra por estado para ver lo que está pendiente o en curso.
          </p>
        </div>
        <div className="adm-header-actions">
          <span className="adm-stat-pill adm-stat-pill--amber">
            <PauseCircle size={12} style={{ marginRight: 2 }} />
            <strong>{counts.pending}</strong>
            <span>pendientes</span>
          </span>
          <span className="adm-stat-pill adm-stat-pill--green">
            <PlayCircle size={12} style={{ marginRight: 2 }} />
            <strong>{counts.in_progress}</strong>
            <span>en curso</span>
          </span>
        </div>
      </header>

      <div className="dsp-filter-bar">
        <button
          type="button"
          className={`dsp-chip ${statusFilter === 'all' ? 'dsp-chip--active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <ClipboardList size={12} />
          <span>Todas</span>
          <span className="dsp-chip-count">{items.length}</span>
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={`dsp-chip ${statusFilter === s ? 'dsp-chip--active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            <StatusIcon status={s} />
            <span>{STATUS_LABELS[s]}</span>
            <span className="dsp-chip-count">{counts[s]}</span>
          </button>
        ))}
      </div>

      <section className="adm-section dsp-list-card">
        {loading ? (
          <div className="dsp-loading">
            <div className="adm-spinner" />
            <p>Cargando asignaciones…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="adm-state">
            <div className="adm-state-icon">
              <ClipboardList size={22} strokeWidth={2} />
            </div>
            <p className="adm-state-title">No hay asignaciones</p>
            <p className="adm-state-desc">
              Cuando un operador asigne una salida desde la app móvil, aparecerá acá para hacer seguimiento.
            </p>
          </div>
        ) : (
          <div className="dsp-list">
            {items.map((d) => {
              const editable =
                d.status !== 'in_progress' &&
                d.status !== 'completed' &&
                d.status !== 'cancelled';
              return (
                <article key={d._id} className="dsp-row">
                  <div className="dsp-row-main">
                    <div className="dsp-row-head">
                      <span className="dsp-code">{d.code}</span>
                      <span className={`adm-status ${statusClass(d.status)}`}>
                        <span className="adm-status-dot" />
                        {STATUS_LABELS[d.status]}
                      </span>
                    </div>

                    <div className="dsp-row-grid">
                      <div className="dsp-cell">
                        <span className="dsp-cell-label">
                          <RouteIcon size={11} />
                          <span>Ruta</span>
                        </span>
                        <span className="dsp-cell-value">
                          {d.route?.name ?? '—'}
                          {d.route?.zone?.name && (
                            <span className="dsp-cell-sub"> · {d.route.zone.name}</span>
                          )}
                        </span>
                      </div>
                      <div className="dsp-cell">
                        <span className="dsp-cell-label">
                          <User size={11} />
                          <span>Conductor</span>
                        </span>
                        <span className="dsp-cell-value">
                          {d.driver
                            ? `${d.driver.firstName} ${d.driver.lastName}`
                            : '—'}
                        </span>
                      </div>
                      <div className="dsp-cell">
                        <span className="dsp-cell-label">
                          <Calendar size={11} />
                          <span>Programada</span>
                        </span>
                        <span className="dsp-cell-value">
                          {formatDate(d.scheduledFor)}
                        </span>
                      </div>
                      {d.vehicle && (
                        <div className="dsp-cell">
                          <span className="dsp-cell-label">
                            <Truck size={11} />
                            <span>Vehículo</span>
                          </span>
                          <span className="dsp-cell-value">
                            {d.vehicle.plate} · {d.vehicle.type}
                          </span>
                        </div>
                      )}
                      {d.assignedBy && (
                        <div className="dsp-cell">
                          <span className="dsp-cell-label">
                            <Clock size={11} />
                            <span>Asignó</span>
                          </span>
                          <span className="dsp-cell-value">
                            {d.assignedBy.firstName} {d.assignedBy.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    {(d.notes || d.rejectReason) && (
                      <div className="dsp-note">
                        {d.rejectReason && (
                          <div className="dsp-note-row dsp-note-row--reject">
                            <AlertOctagon size={12} />
                            <span>Rechazo: {d.rejectReason}</span>
                          </div>
                        )}
                        {d.notes && (
                          <div className="dsp-note-row">
                            <span className="dsp-note-label">Notas:</span>
                            <span>{d.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="dsp-row-actions">
                    {editable && (
                      <button
                        type="button"
                        className="dsp-action dsp-action--danger"
                        onClick={() => handleCancel(d._id)}
                        disabled={busy === d._id}
                      >
                        <Ban size={12} />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = `
  .dsp-filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 14px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    margin-bottom: 18px;
  }
  .dsp-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid #E8EDEB;
    background: #FAFBFA;
    color: #5C6C75;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  }
  .dsp-chip:hover { background: #F1F4F2; color: #00684A; border-color: #C1F1D6; }
  .dsp-chip--active {
    background: #E3FCEF;
    color: #00513A;
    border-color: #C1F1D6;
  }
  .dsp-chip-count {
    padding: 1px 7px;
    background: rgba(0,30,43,0.06);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }
  .dsp-chip--active .dsp-chip-count {
    background: rgba(0,104,74,0.15);
    color: #00513A;
  }

  .dsp-list-card { padding: 18px; }
  .dsp-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px;
    gap: 12px;
  }
  .dsp-loading p {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .dsp-list { display: flex; flex-direction: column; gap: 10px; }

  .dsp-row {
    display: flex;
    align-items: stretch;
    gap: 14px;
    padding: 16px;
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    background: #FFFFFF;
    transition: border-color 0.12s ease, background 0.12s ease;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .dsp-row:hover { border-color: #C1F1D6; background: #FAFEFC; }
  .dsp-row-main { flex: 1; min-width: 0; }
  .dsp-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .dsp-code {
    font-size: 13px;
    font-weight: 700;
    color: #00684A;
    letter-spacing: 0.02em;
  }
  .dsp-row-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px 18px;
  }
  .dsp-cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .dsp-cell-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10.5px;
    font-weight: 700;
    color: #5C6C75;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .dsp-cell-label svg { color: #889397; }
  .dsp-cell-value {
    font-size: 13px;
    font-weight: 600;
    color: #001E2B;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dsp-cell-sub {
    color: #5C6C75;
    font-weight: 500;
    font-size: 12px;
  }

  .dsp-note {
    margin-top: 12px;
    padding: 10px 12px;
    background: #FAFBFA;
    border: 1px solid #F1F3F0;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .dsp-note-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #5C6C75;
    line-height: 1.45;
  }
  .dsp-note-row--reject {
    color: #B23A3A;
    font-weight: 600;
  }
  .dsp-note-label {
    font-weight: 700;
    color: #001E2B;
  }

  .dsp-row-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }
  .dsp-action {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border: 1px solid #E8EDEB;
    background: #FFFFFF;
    color: #5C6C75;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  }
  .dsp-action:hover:not(:disabled) {
    background: #F1F4F2;
    color: #00684A;
    border-color: #C1F1D6;
  }
  .dsp-action:disabled { opacity: 0.45; cursor: not-allowed; }
  .dsp-action--danger:hover:not(:disabled) {
    background: #FCEEEE;
    color: #B23A3A;
    border-color: #F5C9C9;
  }
`;

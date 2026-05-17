'use client';

import { useApi } from '@/hooks/useApi';
import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Truck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type NotifKind = 'route_started' | 'route_delayed' | 'incident_created' | 'incident_status' | 'system';

interface NotificationItem {
  _id: string;
  kind: NotifKind;
  title: string;
  body: string;
  data?: { url?: string; [k: string]: unknown };
  read: boolean;
  createdAt: string;
}

const KIND_ICONS: Record<NotifKind, typeof Bell> = {
  route_started: Truck,
  route_delayed: Clock,
  incident_created: AlertTriangle,
  incident_status: CheckCircle2,
  system: Bell,
};

const KIND_COLORS: Record<NotifKind, string> = {
  route_started: '#00684A',
  route_delayed: '#8C6300',
  incident_created: '#1E5180',
  incident_status: '#00513A',
  system: '#5C6C75',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-PE');
}

function deepLinkToWeb(url?: string): string | null {
  if (!url) return null;
  // exp deep links (/(tabs)/x) no aplican en web; mapeamos los conocidos.
  if (url.startsWith('/(tabs)/profile')) return '/dashboard/profile';
  if (url.startsWith('/(tabs)/map')) return '/dashboard/tracking';
  if (url.startsWith('/(operator)/jornada')) return '/dashboard/routes';
  if (url.startsWith('/dashboard')) return url;
  return null;
}

export default function NotificationsPage() {
  const { apiFetch } = useApi();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/notifications?limit=80');
      setItems((data?.data?.items ?? []) as NotificationItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/api/v1/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      });
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarking(false);
    }
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">Notificaciones</h1>
          <p className="adm-sub">Historial de alertas que envió el sistema a tu cuenta.</p>
        </div>
        <div className="adm-header-actions">
          {hasUnread ? (
            <button
              type="button"
              className="adm-btn-secondary"
              onClick={markAll}
              disabled={marking}
            >
              {marking ? 'Procesando…' : 'Marcar todas como leídas'}
            </button>
          ) : null}
        </div>
      </header>

      <section className="adm-section">
        {loading ? (
          <div className="adm-state">
            <span className="adm-spinner" />
            <p className="adm-state-desc">Cargando…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="adm-state">
            <span className="adm-state-icon">
              <BellOff size={22} strokeWidth={1.6} />
            </span>
            <h3 className="adm-state-title">Sin notificaciones</h3>
            <p className="adm-state-desc">
              Cuando ocurra algo relevante en tus zonas o rutas, aparecerá acá.
            </p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((n) => {
              const Icon = KIND_ICONS[n.kind] ?? Bell;
              const color = KIND_COLORS[n.kind] ?? '#5C6C75';
              const link = deepLinkToWeb(n.data?.url);
              const Wrapper: React.ElementType = link ? Link : 'div';
              const wrapperProps = link ? { href: link } : {};
              return (
                <li key={n._id}>
                  <Wrapper
                    {...wrapperProps}
                    onClick={() => !n.read && markRead(n._id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #E8EDEB',
                      borderLeftWidth: n.read ? 1 : 3,
                      borderLeftColor: n.read ? '#E8EDEB' : color,
                      background: n.read ? '#FFFFFF' : '#F9FBFA',
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: link ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 7,
                        background: `${color}14`,
                        border: `1px solid ${color}44`,
                        display: 'grid',
                        placeItems: 'center',
                        color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                        <strong
                          style={{
                            fontSize: 13.5,
                            fontWeight: n.read ? 600 : 700,
                            color: '#001E2B',
                            fontFamily: "'Geist', 'Outfit', sans-serif",
                          }}
                        >
                          {n.title}
                        </strong>
                        <span style={{ fontSize: 11.5, color: '#889397', whiteSpace: 'nowrap' }}>
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#5C6C75', lineHeight: 1.45 }}>
                        {n.body}
                      </p>
                    </div>
                    {!n.read ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: color,
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                  </Wrapper>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

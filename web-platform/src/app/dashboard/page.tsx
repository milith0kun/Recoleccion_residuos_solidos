'use client';

import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useEffect, useState } from 'react';
import {
  Users,
  Map as MapIcon,
  Truck,
  Recycle,
  Car,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, IconTile, Badge, PageHeader, Button } from '@/components/ui';

interface Stats {
  users: number;
  zones: number;
  routes: number;
  vehicles: number;
  wasteTypes: number;
}

const todayLabel = () =>
  new Date()
    .toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^./, (c) => c.toUpperCase());

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { apiFetch } = useApi();
  const [stats, setStats] = useState<Stats>({ users: 0, zones: 0, routes: 0, vehicles: 0, wasteTypes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [zones, routes, vehicles, wasteTypes] = await Promise.all([
          apiFetch('/api/v1/zones'),
          apiFetch('/api/v1/routes'),
          apiFetch('/api/v1/vehicles'),
          apiFetch('/api/v1/waste-types'),
        ]);

        let userCount = 0;
        if (isAdmin) {
          try {
            const users = await apiFetch('/api/v1/users');
            userCount = users.data.meta?.total || users.data.users?.length || 0;
          } catch {
            userCount = 0;
          }
        }

        setStats({
          users: userCount,
          zones: zones.data?.length || 0,
          routes: routes.data?.length || 0,
          vehicles: vehicles.data?.length || 0,
          wasteTypes: wasteTypes.data?.length || 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [apiFetch, isAdmin]);

  const statCards = [
    ...(isAdmin
      ? [{ label: 'Usuarios', value: stats.users, icon: Users, tone: 'rose' as const, href: '/dashboard/users' }]
      : []),
    { label: 'Zonas', value: stats.zones, icon: MapIcon, tone: 'green' as const, href: '/dashboard/zones' },
    { label: 'Rutas', value: stats.routes, icon: Truck, tone: 'blue' as const, href: '/dashboard/routes' },
    { label: 'Vehículos', value: stats.vehicles, icon: Car, tone: 'amber' as const, href: '/dashboard/vehicles' },
    { label: 'Residuos', value: stats.wasteTypes, icon: Recycle, tone: 'green' as const, href: '/dashboard/waste-types' },
  ];

  const systemStatus = [
    { label: 'Rastreo GPS', desc: 'Conexión satelital activa', status: 'Operativo' },
    { label: 'Notificaciones', desc: 'Push y correo electrónico', status: 'Activas' },
    { label: 'Base de datos', desc: 'MongoDB Atlas Cluster', status: 'Sincronizada' },
    { label: 'Seguridad SSL', desc: 'Encriptación TLS 1.3', status: 'Protegido' },
  ];

  return (
    <div className="dp">
      <style>{styles}</style>

      <PageHeader
        title={
          <>
            Hola, <em style={{ color: 'var(--color-primary)', fontStyle: 'italic' }}>{user?.firstName}</em>.
          </>
        }
        subtitle="Gestioná la recolección de residuos sólidos del Cusco desde un único panel."
        actions={
          <Badge tone="green" withDot>
            {todayLabel()}
          </Badge>
        }
      />

      <section className="dp-stats stagger">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href} className="stat-card animate-fade-up">
              <div className="stat-top">
                <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                  {card.label}
                </span>
                <IconTile tone={card.tone}>
                  <Icon size={18} />
                </IconTile>
              </div>
              <span className="stat-value">{loading ? '—' : card.value}</span>
              <span className="stat-foot">
                Ver detalle <ArrowRight size={12} />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="dp-grid">
        <Card>
          <div className="ui-card-header">
            <div>
              <h3 className="text-h3">Estado del sistema</h3>
              <p className="text-small" style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                Monitoreo continuo de servicios críticos
              </p>
            </div>
            <Badge tone="green" withDot>
              Todos operativos
            </Badge>
          </div>
          <div className="status-grid">
            {systemStatus.map((s) => (
              <div key={s.label} className="status-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                    {s.label}
                  </div>
                  <div className="text-small" style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {s.desc}
                  </div>
                </div>
                <span className="status-pill">
                  <CheckCircle2 size={13} />
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="ui-card-header">
            <div>
              <h3 className="text-h3">Accesos rápidos</h3>
              <p className="text-small" style={{ color: 'var(--color-text-muted)', marginTop: 4 }}>
                Operaciones frecuentes del panel
              </p>
            </div>
          </div>
          <div className="quick-list">
            <Link href="/dashboard/zones" className="quick-row">
              <IconTile tone="green">
                <MapIcon size={18} />
              </IconTile>
              <div style={{ flex: 1 }}>
                <div className="quick-title">Crear una zona nueva</div>
                <div className="quick-sub">Definí los límites geográficos sobre el mapa</div>
              </div>
              <ArrowRight size={16} color="var(--color-text-faint)" />
            </Link>
            <Link href="/dashboard/routes" className="quick-row">
              <IconTile tone="blue">
                <Truck size={18} />
              </IconTile>
              <div style={{ flex: 1 }}>
                <div className="quick-title">Planificar una ruta</div>
                <div className="quick-sub">Asigná vehículo, operador y horario</div>
              </div>
              <ArrowRight size={16} color="var(--color-text-faint)" />
            </Link>
            <Link href="/dashboard/incidents" className="quick-row">
              <IconTile tone="amber">
                <Recycle size={18} />
              </IconTile>
              <div style={{ flex: 1 }}>
                <div className="quick-title">Revisar incidencias</div>
                <div className="quick-sub">Reportes ciudadanos pendientes de atención</div>
              </div>
              <ArrowRight size={16} color="var(--color-text-faint)" />
            </Link>
          </div>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/dashboard/reports">
              <Button variant="ghost" size="sm">
                Ver reportes
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}

const styles = `
  .dp { display: flex; flex-direction: column; gap: 24px; }

  .dp-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .stat-card {
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 20px 22px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .stat-card:hover {
    border-color: var(--color-ink-200);
    box-shadow: var(--shadow-sm);
    transform: translateY(-2px);
  }
  .stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .stat-value {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 500;
    color: var(--color-text);
    letter-spacing: -0.025em;
    line-height: 1;
    font-variation-settings: "opsz" 36;
  }
  .stat-foot {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .dp-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 1024px) {
    .dp-grid { grid-template-columns: 3fr 2fr; }
  }

  .status-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1px;
    background: var(--color-line-soft);
    border-radius: 8px;
    overflow: hidden;
  }
  @media (min-width: 640px) {
    .status-grid { grid-template-columns: 1fr 1fr; }
  }
  .status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--color-paper);
    padding: 14px 16px;
  }
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    color: var(--color-green-700);
    background: var(--color-green-100);
    padding: 4px 10px;
    border-radius: 999px;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .quick-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--color-line-soft);
    border-radius: 8px;
    overflow: hidden;
  }
  .quick-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--color-paper);
    transition: background 0.15s ease;
  }
  .quick-row:hover { background: var(--color-cloud); }
  .quick-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--color-text);
  }
  .quick-sub {
    font-size: 12.5px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
`;

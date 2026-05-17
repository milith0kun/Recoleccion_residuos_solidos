'use client';

import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Map as MapIcon,
  Truck,
  Recycle,
  Car,
  AlertTriangle,
  BarChart3,
  Radio,
  ArrowRight,
  Satellite,
  Bell,
  Database,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  users: number;
  zones: number;
  routes: number;
  vehicles: number;
  wasteTypes: number;
}

type TabKey = 'overview' | 'catalog' | 'system';

const todayLabel = () => {
  const s = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { apiFetch } = useApi();
  const [stats, setStats] = useState<Stats>({ users: 0, zones: 0, routes: 0, vehicles: 0, wasteTypes: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');

  useEffect(() => {
    const load = async () => {
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
            const usersResp = await apiFetch('/api/v1/users');
            userCount = usersResp.data.meta?.total || usersResp.data.users?.length || 0;
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
    load();
  }, [apiFetch, isAdmin]);

  const services = useMemo(
    () => [
      {
        label: 'Rastreo GPS',
        desc: 'Conexión satelital activa',
        status: 'Operativo',
        icon: Satellite,
      },
      {
        label: 'Notificaciones',
        desc: 'Push y correo electrónico',
        status: 'Activas',
        icon: Bell,
      },
      {
        label: 'Base de datos',
        desc: 'MongoDB Atlas Cluster',
        status: 'Sincronizada',
        icon: Database,
      },
      {
        label: 'Seguridad SSL',
        desc: 'Encriptación TLS 1.3',
        status: 'Protegido',
        icon: ShieldCheck,
      },
    ],
    [],
  );

  const catalogTiles = [
    {
      href: '/dashboard/zones',
      title: 'Gestionar zonas',
      sub: 'Definí los límites geográficos en el mapa',
      icon: MapIcon,
    },
    {
      href: '/dashboard/routes',
      title: 'Planificar rutas',
      sub: 'Asigná vehículo, operador y horario',
      icon: Truck,
    },
    {
      href: '/dashboard/tracking',
      title: 'Seguimiento GPS',
      sub: 'Posición en tiempo real de los camiones',
      icon: Radio,
    },
    {
      href: '/dashboard/waste-types',
      title: 'Tipos de residuos',
      sub: 'Catálogo según NTP 900.058',
      icon: Recycle,
    },
  ];

  const sideTiles = [
    ...(isAdmin
      ? [{ href: '/dashboard/users', title: 'Usuarios', icon: Users }]
      : []),
    { href: '/dashboard/vehicles', title: 'Vehículos', icon: Car },
    { href: '/dashboard/incidents', title: 'Incidentes', icon: AlertTriangle },
    { href: '/dashboard/reports', title: 'Reportes', icon: BarChart3 },
  ];

  return (
    <div className="adm-page animate-fade-in">
      <header className="adm-header">
        <div>
          <h1 className="adm-title">
            Hola, <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>{user?.firstName}</em>.
          </h1>
          <p className="adm-sub">
            Gestioná la recolección de residuos sólidos del Cusco desde un único panel.
          </p>
        </div>
        <div className="adm-header-actions">
          <span className="adm-stat-pill adm-stat-pill--green">
            <span className="adm-status-dot" />
            <strong>{todayLabel()}</strong>
          </span>
        </div>
      </header>

      <div className="adm-overview-grid">
        {/* ─── Columna principal ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Resumen operativo */}
          <section className="adm-section">
            <div className="adm-section-header" style={{ marginBottom: 6 }}>
              <div>
                <h2 className="adm-section-title">Resumen operativo</h2>
                <p className="adm-section-sub">
                  Estado del sistema de recolección al día de hoy.
                </p>
              </div>
              <Link
                href="/dashboard/reports"
                className="adm-btn-secondary"
                style={{ padding: '7px 13px', fontSize: 12.5 }}
              >
                Ver reportes
              </Link>
            </div>

            {/* Tabs Atlas-style */}
            <div className="adm-tabs">
              <button
                type="button"
                className={`adm-tab ${tab === 'overview' ? 'adm-tab--active' : ''}`}
                onClick={() => setTab('overview')}
              >
                Indicadores
              </button>
              <button
                type="button"
                className={`adm-tab ${tab === 'catalog' ? 'adm-tab--active' : ''}`}
                onClick={() => setTab('catalog')}
              >
                Catálogo
              </button>
              <button
                type="button"
                className={`adm-tab ${tab === 'system' ? 'adm-tab--active' : ''}`}
                onClick={() => setTab('system')}
              >
                Sistema
              </button>
            </div>

            {tab === 'overview' && (
              <div className="adm-stat-card-grid" style={{ marginTop: 14 }}>
                {isAdmin && (
                  <div className="adm-stat-card adm-stat-card--green">
                    <span className="adm-stat-card-eyebrow">Usuarios</span>
                    <span className="adm-stat-card-num">{loading ? '—' : stats.users}</span>
                    <span className="adm-stat-card-label">cuentas registradas</span>
                    <Users
                      className="adm-stat-card-ghost"
                      size={96}
                      strokeWidth={1.4}
                    />
                  </div>
                )}
                <div className="adm-stat-card adm-stat-card--blue">
                  <span className="adm-stat-card-eyebrow">Zonas</span>
                  <span className="adm-stat-card-num">{loading ? '—' : stats.zones}</span>
                  <span className="adm-stat-card-label">áreas definidas</span>
                  <MapIcon
                    className="adm-stat-card-ghost"
                    size={96}
                    strokeWidth={1.4}
                  />
                </div>
                <div className="adm-stat-card">
                  <span className="adm-stat-card-eyebrow">Rutas activas</span>
                  <span className="adm-stat-card-num">{loading ? '—' : stats.routes}</span>
                  <span className="adm-stat-card-label">programadas</span>
                  <Truck
                    className="adm-stat-card-ghost"
                    size={96}
                    strokeWidth={1.4}
                  />
                </div>
                <div className="adm-stat-card adm-stat-card--amber">
                  <span className="adm-stat-card-eyebrow">Vehículos</span>
                  <span className="adm-stat-card-num">{loading ? '—' : stats.vehicles}</span>
                  <span className="adm-stat-card-label">en flota</span>
                  <Car
                    className="adm-stat-card-ghost"
                    size={96}
                    strokeWidth={1.4}
                  />
                </div>
                <div className="adm-stat-card adm-stat-card--rose">
                  <span className="adm-stat-card-eyebrow">Residuos</span>
                  <span className="adm-stat-card-num">{loading ? '—' : stats.wasteTypes}</span>
                  <span className="adm-stat-card-label">tipos catalogados</span>
                  <Recycle
                    className="adm-stat-card-ghost"
                    size={96}
                    strokeWidth={1.4}
                  />
                </div>
              </div>
            )}

            {tab === 'catalog' && (
              <div className="adm-tile-grid" style={{ marginTop: 4 }}>
                {catalogTiles.map(({ href, title, sub, icon: Icon }) => (
                  <Link key={href} href={href} className="adm-tile">
                    <span className="adm-tile-icon">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <span className="adm-tile-body">
                      <span className="adm-tile-title">{title}</span>
                      <span className="adm-tile-sub">{sub}</span>
                    </span>
                    <ArrowRight size={16} className="adm-tile-arrow" />
                    <Icon className="adm-tile-ghost" size={92} strokeWidth={1.3} />
                  </Link>
                ))}
              </div>
            )}

            {tab === 'system' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {services.map(({ label, desc, status, icon: Icon }) => (
                  <div key={label} className="adm-svc-row">
                    <div className="adm-svc-row-main">
                      <span className="adm-svc-row-icon">
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <div className="adm-svc-row-body">
                        <div className="adm-svc-row-title">{label}</div>
                        <div className="adm-svc-row-desc">{desc}</div>
                      </div>
                    </div>
                    <span className="adm-status adm-status--green">
                      <span className="adm-status-dot" />
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Atajos del catálogo (mostrar siempre, fuera de tabs) */}
          <section className="adm-section">
            <div className="adm-section-header">
              <div>
                <h2 className="adm-section-title">Atajos operativos</h2>
                <p className="adm-section-sub">
                  Configurá rutas, zonas y catálogos en un par de clics.
                </p>
              </div>
            </div>
            <div className="adm-tile-grid">
              {catalogTiles.map(({ href, title, sub, icon: Icon }) => (
                <Link key={href} href={href} className="adm-tile">
                  <span className="adm-tile-icon">
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title">{title}</span>
                    <span className="adm-tile-sub">{sub}</span>
                  </span>
                  <ArrowRight size={16} className="adm-tile-arrow" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ─── Sidebar derecho ─── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="adm-section" style={{ padding: '22px 24px' }}>
            <div style={{ marginBottom: 14 }}>
              <h3 className="adm-section-title" style={{ fontSize: 15 }}>
                Atajos de gestión
              </h3>
              <p className="adm-section-sub" style={{ fontSize: 12.5 }}>
                Acceso directo a paneles administrativos.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sideTiles.map(({ href, title, icon: Icon }) => (
                <Link key={href} href={href} className="adm-tile adm-tile--compact">
                  <span className="adm-tile-icon adm-tile-icon--sm">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title">{title}</span>
                  </span>
                  <ArrowRight size={14} className="adm-tile-arrow" />
                  <Icon className="adm-tile-ghost" size={56} strokeWidth={1.3} />
                </Link>
              ))}
            </div>
          </section>

          <section className="adm-section" style={{ padding: '22px 24px' }}>
            <div style={{ marginBottom: 12 }}>
              <span className="adm-eyebrow">Recurso</span>
              <h3 className="adm-section-title" style={{ fontSize: 15, marginTop: 2 }}>
                Documentación oficial
              </h3>
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#5C6C75',
                marginBottom: 16,
                lineHeight: 1.55,
                letterSpacing: '-0.003em',
              }}
            >
              Especificación funcional del sistema y norma NTP 900.058 para la
              clasificación de residuos.
            </p>
            <a
              href="https://github.com/milith0kun/Recoleccion_residuos_solidos#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '9px 12px',
                fontSize: 12.5,
              }}
            >
              <BookOpen size={14} strokeWidth={2} />
              Abrir documentación
              <ArrowRight size={14} />
            </a>
          </section>

          <div className="adm-system-status" style={{ paddingLeft: 4 }}>
            <span className="adm-system-status-dot" />
            <span>
              Sistema: <strong>Todo en orden</strong>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

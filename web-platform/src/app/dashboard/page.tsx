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
  AlertTriangle,
  BarChart3,
  Radio,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  users: number;
  zones: number;
  routes: number;
  vehicles: number;
  wasteTypes: number;
}

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
    load();
  }, [apiFetch, isAdmin]);

  const services = [
    { label: 'Rastreo GPS', desc: 'Conexión satelital activa', status: 'Operativo' },
    { label: 'Notificaciones', desc: 'Push y correo electrónico', status: 'Activas' },
    { label: 'Base de datos', desc: 'MongoDB Atlas Cluster', status: 'Sincronizada' },
    { label: 'Seguridad SSL', desc: 'Encriptación TLS 1.3', status: 'Protegido' },
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
            <div className="adm-section-header">
              <div>
                <h2 className="adm-section-title">Resumen operativo</h2>
                <p className="adm-section-sub">
                  Estado del sistema de recolección al día de hoy.
                </p>
              </div>
              <Link href="/dashboard/reports" className="adm-btn-secondary" style={{ padding: '6px 12px', fontSize: 12.5 }}>
                Ver reportes
              </Link>
            </div>

            <div className="adm-kpi-row">
              {isAdmin && (
                <div className="adm-kpi">
                  <span className="adm-kpi-num">{loading ? '—' : stats.users}</span>
                  <span className="adm-kpi-label">Usuarios</span>
                </div>
              )}
              <div className="adm-kpi">
                <span className="adm-kpi-num">{loading ? '—' : stats.zones}</span>
                <span className="adm-kpi-label">Zonas</span>
              </div>
              <div className="adm-kpi">
                <span className="adm-kpi-num">{loading ? '—' : stats.routes}</span>
                <span className="adm-kpi-label">Rutas activas</span>
              </div>
              <div className="adm-kpi">
                <span className="adm-kpi-num">{loading ? '—' : stats.vehicles}</span>
                <span className="adm-kpi-label">Vehículos</span>
              </div>
              <div className="adm-kpi">
                <span className="adm-kpi-num">{loading ? '—' : stats.wasteTypes}</span>
                <span className="adm-kpi-label">Tipos de residuos</span>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <span className="adm-eyebrow">Atajos del catálogo</span>
              <div className="adm-tile-grid">
                <Link href="/dashboard/zones" className="adm-tile">
                  <span className="adm-tile-icon"><MapIcon size={18} /></span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title">Gestionar zonas</span>
                    <span className="adm-tile-sub">Definí los límites geográficos en el mapa</span>
                  </span>
                  <ArrowRight size={16} className="adm-tile-arrow" />
                </Link>
                <Link href="/dashboard/routes" className="adm-tile">
                  <span className="adm-tile-icon"><Truck size={18} /></span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title">Planificar rutas</span>
                    <span className="adm-tile-sub">Asigná vehículo, operador y horario</span>
                  </span>
                  <ArrowRight size={16} className="adm-tile-arrow" />
                </Link>
                <Link href="/dashboard/tracking" className="adm-tile">
                  <span className="adm-tile-icon"><Radio size={18} /></span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title">Seguimiento GPS</span>
                    <span className="adm-tile-sub">Posición en tiempo real de los camiones</span>
                  </span>
                  <ArrowRight size={16} className="adm-tile-arrow" />
                </Link>
                <Link href="/dashboard/waste-types" className="adm-tile">
                  <span className="adm-tile-icon"><Recycle size={18} /></span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title">Tipos de residuos</span>
                    <span className="adm-tile-sub">Catálogo según NTP 900.058</span>
                  </span>
                  <ArrowRight size={16} className="adm-tile-arrow" />
                </Link>
              </div>
            </div>
          </section>

          {/* Operaciones del día */}
          <section className="adm-section">
            <div className="adm-section-header">
              <div>
                <h2 className="adm-section-title">Estado del sistema</h2>
                <p className="adm-section-sub">Monitoreo continuo de servicios críticos.</p>
              </div>
              <span className="adm-status adm-status--green">
                <span className="adm-status-dot" />
                Todos operativos
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {services.map((s, i) => (
                <div
                  key={s.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid #F0F2F0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#001E2B' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: '#5C6C75', marginTop: 2 }}>
                      {s.desc}
                    </div>
                  </div>
                  <span
                    className="adm-status adm-status--green"
                    style={{ fontSize: 11 }}
                  >
                    <CheckCircle2 size={11} />
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ─── Sidebar derecho ─── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="adm-section" style={{ padding: '20px 22px' }}>
            <div style={{ marginBottom: 14 }}>
              <h3 className="adm-section-title" style={{ fontSize: 15 }}>
                Atajos de gestión
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {isAdmin && (
                <Link href="/dashboard/users" className="adm-tile" style={{ padding: '12px 14px' }}>
                  <span className="adm-tile-icon" style={{ width: 32, height: 32 }}>
                    <Users size={16} />
                  </span>
                  <span className="adm-tile-body">
                    <span className="adm-tile-title" style={{ fontSize: 13 }}>Usuarios</span>
                  </span>
                  <ArrowRight size={14} className="adm-tile-arrow" />
                </Link>
              )}
              <Link href="/dashboard/vehicles" className="adm-tile" style={{ padding: '12px 14px' }}>
                <span className="adm-tile-icon" style={{ width: 32, height: 32 }}>
                  <Car size={16} />
                </span>
                <span className="adm-tile-body">
                  <span className="adm-tile-title" style={{ fontSize: 13 }}>Vehículos</span>
                </span>
                <ArrowRight size={14} className="adm-tile-arrow" />
              </Link>
              <Link href="/dashboard/incidents" className="adm-tile" style={{ padding: '12px 14px' }}>
                <span className="adm-tile-icon" style={{ width: 32, height: 32 }}>
                  <AlertTriangle size={16} />
                </span>
                <span className="adm-tile-body">
                  <span className="adm-tile-title" style={{ fontSize: 13 }}>Incidentes</span>
                </span>
                <ArrowRight size={14} className="adm-tile-arrow" />
              </Link>
              <Link href="/dashboard/reports" className="adm-tile" style={{ padding: '12px 14px' }}>
                <span className="adm-tile-icon" style={{ width: 32, height: 32 }}>
                  <BarChart3 size={16} />
                </span>
                <span className="adm-tile-body">
                  <span className="adm-tile-title" style={{ fontSize: 13 }}>Reportes</span>
                </span>
                <ArrowRight size={14} className="adm-tile-arrow" />
              </Link>
            </div>
          </section>

          <section className="adm-section" style={{ padding: '20px 22px' }}>
            <span className="adm-eyebrow">Recurso</span>
            <h3 className="adm-section-title" style={{ fontSize: 15, marginBottom: 6 }}>
              Documentación oficial
            </h3>
            <p style={{ fontSize: 13, color: '#5C6C75', marginBottom: 12, lineHeight: 1.5 }}>
              Especificación funcional del sistema y norma NTP 900.058 para la
              clasificación de residuos.
            </p>
            <a
              href="https://github.com/milith0kun/Recoleccion_residuos_solidos#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', fontSize: 12.5 }}
            >
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

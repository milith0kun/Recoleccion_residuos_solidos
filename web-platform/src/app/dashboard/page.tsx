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
  CheckCircle2
} from 'lucide-react';

interface Stats {
  users: number;
  zones: number;
  routes: number;
  vehicles: number;
  wasteTypes: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
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
        if (user?.role === 'admin') {
          try {
            const users = await apiFetch('/api/v1/users');
            userCount = users.data.meta?.total || users.data.users?.length || 0;
          } catch { userCount = 0; }
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
  }, [apiFetch, user]);

  const statCards = [
    ...(user?.role === 'admin' ? [{ label: 'Usuarios', value: stats.users, icon: Users, color: '#E11D48' }] : []),
    { label: 'Zonas', value: stats.zones, icon: MapIcon, color: '#059669' },
    { label: 'Rutas', value: stats.routes, icon: Truck, color: '#2563EB' },
    { label: 'Vehículos', value: stats.vehicles, icon: Car, color: '#D97706' },
    { label: 'Tipos Residuos', value: stats.wasteTypes, icon: Recycle, color: '#7C3AED' },
  ];

  const systemStatus = [
    { label: 'Rastreo GPS', desc: 'Conexión satelital activa', status: 'Activo', tone: 'green' },
    { label: 'Notificaciones', desc: 'Push & Email Gateway', status: 'Online', tone: 'green' },
    { label: 'Base de Datos', desc: 'MongoDB Atlas Cluster', status: 'Sincronizada', tone: 'green' },
    { label: 'Seguridad SSL', desc: 'Encriptación AES-256', status: 'Protegido', tone: 'green' },
  ];

  const creds = [
    { role: 'Administrador', email: 'admin@residuos.cusco.gob.pe', pass: 'admin123' },
    { role: 'Operador', email: 'operador@residuos.cusco.gob.pe', pass: 'operator123' },
    { role: 'Ciudadano', email: 'ciudadano@gmail.com', pass: 'citizen123' },
  ];

  return (
    <div className="dp-root animate-fade-in">
      <style>{dpStyles}</style>

      {/* Header */}
      <div className="dp-header">
        <div className="dp-header-left">
          <span className="dp-eyebrow">Panel de control</span>
          <h1 className="dp-title">
            Hola, <span>{user?.firstName}</span> 👋
          </h1>
          <p className="dp-subtitle">
            Gestiona la recolección de residuos sólidos del Cusco de forma
            eficiente y en tiempo real.
          </p>
        </div>
        <div className="dp-date">
          <span className="dp-date-dot" />
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Stats */}
      <div className="dp-stats">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="stat-top">
                <span className="stat-label">{card.label}</span>
                <div className="stat-icon" style={{ background: card.color + '0F', color: card.color }}>
                  <Icon style={{ width: 16, height: 16 }} />
                </div>
              </div>
              {loading ? (
                <div className="stat-spinner" />
              ) : (
                <span className="stat-value">{card.value}</span>
              )}
              <div className="stat-foot" style={{ background: card.color }} />
            </div>
          );
        })}
      </div>

      {/* Bottom row */}
      <div className="dp-bottom">
        {/* System status */}
        <div className="dp-system">
          <div className="dp-system-header">
            <div>
              <h2>Estado del Sistema</h2>
              <p>Monitoreo en tiempo real de los servicios</p>
            </div>
            <div className="dp-system-badge">
              <span className="dp-badge-dot" />
              Operativo
            </div>
          </div>
          <div className="dp-system-grid">
            {systemStatus.map((s) => (
              <div key={s.label} className="dp-status-item">
                <div className="dp-status-top">
                  <h3>{s.label}</h3>
                  <span className="dp-status-tag">
                    <CheckCircle2 style={{ width: 11, height: 11 }} />
                    {s.status}
                  </span>
                </div>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="dp-creds">
          <div className="dp-creds-header">
            <div>
              <span className="dp-creds-eyebrow">Entorno demo</span>
              <h2>Acceso de prueba</h2>
            </div>
            <span className="dp-creds-version">v1.0</span>
          </div>
          <div className="dp-creds-list">
            {creds.map((c) => (
              <div key={c.role} className="dp-cred-item">
                <div className="dp-cred-top">
                  <span className="dp-cred-role">{c.role}</span>
                  <code className="dp-cred-pass">{c.pass}</code>
                </div>
                <span className="dp-cred-email">{c.email}</span>
              </div>
            ))}
          </div>
          <div className="dp-creds-note">
            Usa estas credenciales para explorar el sistema según el rol asignado.
          </div>
        </div>
      </div>
    </div>
  );
}

const dpStyles = `
  .dp-root {
    padding-bottom: 2rem;
  }

  /* Header */
  .dp-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 2.25rem;
    flex-wrap: wrap;
  }
  .dp-eyebrow {
    display: inline-block;
    font-size: 0.65rem;
    font-weight: 700;
    color: #059669;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.4rem;
  }
  .dp-title {
    font-size: 2.15rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.025em;
    line-height: 1.15;
  }
  .dp-title span {
    color: #059669;
  }
  .dp-subtitle {
    font-size: 0.9rem;
    color: #8A8780;
    font-weight: 400;
    margin-top: 0.55rem;
    max-width: 520px;
    line-height: 1.6;
  }
  .dp-date {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #047857;
    background: #F0FDF4;
    border: 1px solid #D1FAE5;
    padding: 0.45rem 0.9rem;
    border-radius: 99px;
    text-transform: capitalize;
    letter-spacing: 0.01em;
  }
  .dp-date-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #059669;
    animation: pulse 2s infinite;
  }

  /* Stats */
  .dp-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    position: relative;
    background: #FFFFFF;
    border: 1px solid #F0EEEB;
    border-radius: 14px;
    padding: 1.15rem 1.2rem 1.3rem;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    overflow: hidden;
    opacity: 0;
    animation: fade-up 0.5s ease forwards;
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .stat-card:hover {
    box-shadow: 0 6px 24px rgba(0,0,0,0.05);
    transform: translateY(-2px);
    border-color: #E8E5E0;
  }
  .stat-card:hover .stat-foot {
    transform: scaleX(1);
  }
  .stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.9rem;
  }
  .stat-icon {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stat-value {
    display: block;
    font-size: 2.25rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.035em;
    line-height: 1;
  }
  .stat-spinner {
    width: 22px;
    height: 22px;
    border: 2px solid #E8E5E0;
    border-top-color: #059669;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .stat-label {
    font-size: 0.68rem;
    font-weight: 700;
    color: #8A8780;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .stat-foot {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.4s ease;
    opacity: 0.7;
  }

  /* Bottom row */
  .dp-bottom {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  @media (min-width: 1024px) {
    .dp-bottom {
      grid-template-columns: 3fr 2fr;
    }
  }

  /* System status */
  .dp-system {
    background: #FFFFFF;
    border: 1px solid #F0EEEB;
    border-radius: 16px;
    padding: 1.5rem;
  }
  .dp-system-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1.1rem;
    border-bottom: 1px solid #F4F2EF;
  }
  .dp-system-header h2 {
    font-size: 1.05rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.015em;
    margin-bottom: 0.15rem;
  }
  .dp-system-header p {
    font-size: 0.75rem;
    color: #A09D98;
    font-weight: 400;
  }
  .dp-system-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.62rem;
    font-weight: 700;
    color: #059669;
    background: #F0FDF4;
    border: 1px solid #D1FAE5;
    padding: 0.35rem 0.75rem;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }
  .dp-badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #059669;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dp-system-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .dp-status-item {
    position: relative;
    padding: 0.95rem 1rem;
    border-radius: 12px;
    background: #FAFAF8;
    border: 1px solid #F0EEEB;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }
  .dp-status-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 2px;
    border-radius: 0 2px 2px 0;
    background: #059669;
    opacity: 0.6;
  }
  .dp-status-item:hover {
    background: #FFFFFF;
    border-color: #E0DDD8;
    transform: translateX(2px);
  }
  .dp-status-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .dp-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.58rem;
    font-weight: 700;
    color: #059669;
    background: #FFFFFF;
    border: 1px solid #D1FAE5;
    padding: 0.2rem 0.5rem;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .dp-status-item h3 {
    font-size: 0.82rem;
    font-weight: 700;
    color: #1A1A1A;
    letter-spacing: -0.01em;
  }
  .dp-status-item p {
    font-size: 0.72rem;
    color: #A09D98;
    font-weight: 400;
    line-height: 1.4;
  }

  /* Credentials */
  .dp-creds {
    background: #1A1A1A;
    border-radius: 16px;
    padding: 1.5rem;
    color: #FFFFFF;
    position: relative;
    overflow: hidden;
  }
  .dp-creds::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -30%;
    width: 60%;
    height: 100%;
    background: radial-gradient(circle, rgba(5,150,105,0.18), transparent 70%);
    pointer-events: none;
  }
  .dp-creds-header {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .dp-creds-eyebrow {
    display: block;
    font-size: 0.6rem;
    font-weight: 700;
    color: #34D399;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.35rem;
  }
  .dp-creds-header h2 {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.015em;
    color: #FFFFFF;
  }
  .dp-creds-version {
    font-size: 0.6rem;
    font-weight: 700;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.06);
    padding: 0.25rem 0.55rem;
    border-radius: 5px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.02em;
  }
  .dp-creds-list {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .dp-cred-item {
    padding: 0.8rem 0.9rem;
    border-radius: 10px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .dp-cred-item:hover {
    background: rgba(255,255,255,0.07);
    border-color: rgba(255,255,255,0.1);
  }
  .dp-cred-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
  }
  .dp-cred-role {
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.55);
  }
  .dp-cred-pass {
    font-size: 0.62rem;
    font-weight: 700;
    color: #34D399;
    background: rgba(5,150,105,0.15);
    padding: 0.2rem 0.55rem;
    border-radius: 5px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.02em;
  }
  .dp-cred-email {
    font-size: 0.78rem;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: -0.01em;
  }
  .dp-creds-note {
    position: relative;
    margin-top: 1rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.4);
    font-size: 0.72rem;
    line-height: 1.5;
    font-weight: 400;
  }

  @media (max-width: 640px) {
    .dp-header { flex-direction: column; align-items: flex-start; }
    .dp-title { font-size: 1.6rem; }
    .dp-system-grid { grid-template-columns: 1fr; }
  }
`;

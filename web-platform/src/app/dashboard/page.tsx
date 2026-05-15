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
  Database,
  CheckCircle2,
  Shield,
  Info
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
    { label: 'Rastreo GPS', desc: 'Conexión satelital activa', status: 'Activo' },
    { label: 'Notificaciones', desc: 'Push & Email Gateway', status: 'Online' },
    { label: 'Base de Datos', desc: 'MongoDB Atlas Cluster', status: 'Sincronizada' },
    { label: 'Seguridad SSL', desc: 'Encriptación AES-256', status: 'Protegido' },
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
        <div>
          <h1 className="dp-title">
            Hola, <span>{user?.firstName}</span> 👋
          </h1>
          <p className="dp-subtitle">
            Panel de control del Sistema de Recolección de Residuos Sólidos. 
            Gestiona la recolección de forma eficiente.
          </p>
        </div>
        <div className="dp-date">
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
                <div className="stat-icon" style={{ background: card.color + '12', color: card.color }}>
                  <Icon style={{ width: 22, height: 22 }} />
                </div>
                {loading ? (
                  <div className="stat-spinner" />
                ) : (
                  <span className="stat-value" style={{ color: card.color }}>{card.value}</span>
                )}
              </div>
              <span className="stat-label">{card.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom row */}
      <div className="dp-bottom">
        {/* System status */}
        <div className="dp-system">
          <div className="dp-system-header">
            <div className="dp-system-title">
              <Database style={{ width: 18, height: 18 }} />
              <div>
                <h2>Estado del Sistema</h2>
                <p>Monitoreo de servicios</p>
              </div>
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
                  <CheckCircle2 style={{ width: 16, height: 16, color: '#059669' }} />
                  <span className="dp-status-tag">{s.status}</span>
                </div>
                <h3>{s.label}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="dp-creds">
          <div className="dp-creds-header">
            <Shield style={{ width: 18, height: 18 }} />
            <div>
              <h2>Acceso Demo</h2>
              <p>Credenciales de prueba</p>
            </div>
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
            <Info style={{ width: 14, height: 14, flexShrink: 0 }} />
            <span>Use estas credenciales para explorar el sistema según el rol.</span>
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
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }
  .dp-title {
    font-size: 2rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .dp-title span {
    color: #059669;
  }
  .dp-subtitle {
    font-size: 0.9rem;
    color: #8A8780;
    font-weight: 400;
    margin-top: 0.5rem;
    max-width: 500px;
    line-height: 1.6;
  }
  .dp-date {
    font-size: 0.75rem;
    font-weight: 600;
    color: #059669;
    background: #F0FDF4;
    border: 1px solid #D1FAE5;
    padding: 0.4rem 1rem;
    border-radius: 8px;
    text-transform: capitalize;
  }

  /* Stats */
  .dp-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat-card {
    background: #FFFFFF;
    border: 1px solid #F0EEEB;
    border-radius: 14px;
    padding: 1.25rem;
    transition: all 0.3s ease;
  }
  .stat-card:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    transform: translateY(-2px);
  }
  .stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .stat-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stat-value {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.03em;
  }
  .stat-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #E8E5E0;
    border-top-color: #059669;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .stat-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: #8A8780;
    text-transform: uppercase;
    letter-spacing: 0.12em;
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
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }
  .dp-system-title {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: #1A1A1A;
  }
  .dp-system-title h2 {
    font-size: 1rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.01em;
  }
  .dp-system-title p {
    font-size: 0.7rem;
    color: #B0ADA8;
    font-weight: 400;
  }
  .dp-system-badge {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.6rem;
    font-weight: 700;
    color: #059669;
    background: #F0FDF4;
    border: 1px solid #D1FAE5;
    padding: 0.3rem 0.75rem;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .dp-badge-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #059669;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
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
    padding: 1rem;
    border-radius: 12px;
    background: #FAFAF8;
    border: 1px solid #F0EEEB;
    transition: all 0.2s ease;
  }
  .dp-status-item:hover {
    background: #FFFFFF;
    border-color: #E8E5E0;
  }
  .dp-status-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }
  .dp-status-tag {
    font-size: 0.55rem;
    font-weight: 700;
    color: #059669;
    background: #F0FDF4;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .dp-status-item h3 {
    font-size: 0.8rem;
    font-weight: 700;
    color: #1A1A1A;
    margin-bottom: 0.15rem;
  }
  .dp-status-item p {
    font-size: 0.7rem;
    color: #B0ADA8;
    font-weight: 400;
  }

  /* Credentials */
  .dp-creds {
    background: #1A1A1A;
    border-radius: 16px;
    padding: 1.5rem;
    color: #FFFFFF;
  }
  .dp-creds-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.25rem;
    color: #FFFFFF;
  }
  .dp-creds-header h2 {
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .dp-creds-header p {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.4);
    font-weight: 400;
  }
  .dp-creds-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .dp-cred-item {
    padding: 0.85rem;
    border-radius: 10px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .dp-cred-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.3rem;
  }
  .dp-cred-role {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255,255,255,0.5);
  }
  .dp-cred-pass {
    font-size: 0.6rem;
    font-weight: 700;
    color: #fff;
    background: rgba(255,255,255,0.1);
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
  }
  .dp-cred-email {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
  }
  .dp-creds-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.35);
    font-size: 0.7rem;
    line-height: 1.5;
  }

  @media (max-width: 640px) {
    .dp-header { flex-direction: column; align-items: flex-start; }
    .dp-title { font-size: 1.5rem; }
    .dp-system-grid { grid-template-columns: 1fr; }
  }
`;

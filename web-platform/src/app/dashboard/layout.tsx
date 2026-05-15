'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Map as MapIcon,
  Recycle,
  Truck,
  Radio,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Car,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
  { href: '/dashboard/zones', label: 'Zonas', icon: MapIcon },
  { href: '/dashboard/waste-types', label: 'Residuos', icon: Recycle },
  { href: '/dashboard/routes', label: 'Rutas', icon: Truck },
  { href: '/dashboard/vehicles', label: 'Vehículos', icon: Car },
  { href: '/dashboard/incidents', label: 'Incidentes', icon: AlertTriangle },
  { href: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/dashboard/tracking', label: 'Seguimiento', icon: Radio },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  citizen: 'Ciudadano',
};

const pageTitles: Record<string, string> = {
  '/dashboard': 'Resumen General',
  '/dashboard/users': 'Gestión de Usuarios',
  '/dashboard/zones': 'Zonas de Recolección',
  '/dashboard/waste-types': 'Tipos de Residuos',
  '/dashboard/routes': 'Rutas de Recolección',
  '/dashboard/vehicles': 'Vehículos',
  '/dashboard/incidents': 'Incidentes',
  '/dashboard/reports': 'Reportes',
  '/dashboard/tracking': 'Seguimiento GPS',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.push('/');
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF8' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E8E5E0', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const filteredMenu = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Brand */}
      <div className="sb-brand">
        <span className="sb-brand-name">{collapsed && !isMobile ? 'S' : 'SRSS'}</span>
        {(!collapsed || isMobile) && <span className="sb-brand-sub">Cusco</span>}
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`sb-link ${isActive ? 'sb-link--active' : ''}`}
            >
              <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="sb-footer">
        {(!collapsed || isMobile) && (
          <div className="sb-user">
            <div className="sb-user-status">
              <div className="sb-user-dot" />
              <span>En línea</span>
            </div>
            <div className="sb-user-name">{user.firstName} {user.lastName}</div>
            <div className="sb-user-role">{roleLabels[user.role]}</div>
          </div>
        )}
        <button onClick={logout} className="sb-logout">
          <LogOut style={{ width: 18, height: 18 }} />
          {(!collapsed || isMobile) && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="dash-root">
      <style>{dashStyles}</style>

      {/* Sidebar Desktop */}
      <aside className={`sb ${collapsed ? 'sb--collapsed' : ''}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sb-toggle"
        >
          {collapsed ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronLeft style={{ width: 16, height: 16 }} />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar Mobile */}
      <aside className={`sb-mobile ${mobileMenuOpen ? 'sb-mobile--open' : ''}`}>
        <SidebarContent isMobile />
      </aside>

      {/* Main area */}
      <div className="dash-main">
        {/* Desktop Header */}
        <header className="dash-header">
          <div className="dash-breadcrumb">
            <span className="bc-system">SRSS</span>
            <ChevronRight style={{ width: 14, height: 14, color: '#D1D0CC' }} />
            <span className="bc-page">{pageTitles[pathname] ?? 'Panel'}</span>
          </div>
          <div className="dash-header-right">
            <button className="header-bell">
              <Bell style={{ width: 17, height: 17 }} />
              <span className="bell-dot" />
            </button>
            <div className="header-sep" />
            <div className="header-avatar">
              <div className="avatar-circle">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="avatar-info">
                <div className="avatar-name">{user.firstName} {user.lastName}</div>
                <div className="avatar-role">{roleLabels[user.role]}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="dash-header-mobile">
          <span className="mobile-brand">SRSS Cusco</span>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-btn">
            {mobileMenuOpen ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
          </button>
        </header>

        <main className="dash-content">
          <div className="dash-content-inner animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const dashStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .dash-root {
    min-height: 100vh;
    display: flex;
    background: #FAFAF8;
    color: #1A1A1A;
    font-family: 'Outfit', 'DM Sans', -apple-system, sans-serif;
  }

  /* ═══ SIDEBAR ═══ */
  .sb {
    width: 260px;
    display: none;
    flex-direction: column;
    background: #FFFFFF;
    border-right: 1px solid #F0EEEB;
    position: relative;
    z-index: 30;
    transition: width 0.3s ease;
  }
  .sb--collapsed { width: 80px; }

  @media (min-width: 1024px) {
    .sb { display: flex; }
  }

  .sb-brand {
    padding: 1.5rem 1.25rem;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    border-bottom: 1px solid #F7F6F4;
  }
  .sb-brand-name {
    font-size: 1.1rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.02em;
  }
  .sb-brand-sub {
    font-size: 0.7rem;
    font-weight: 500;
    color: #B0ADA8;
  }

  .sb-nav {
    flex: 1;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .sb-link {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #8A8780;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  .sb-link:hover {
    background: #FAFAF8;
    color: #3A3A38;
  }
  .sb-link--active {
    background: #059669;
    color: #FFFFFF !important;
  }
  .sb-link--active:hover {
    background: #047857;
  }

  .sb-footer {
    padding: 1rem 0.75rem;
    margin-top: auto;
  }
  .sb-user {
    padding: 0.875rem;
    border-radius: 10px;
    background: #FAFAF8;
    border: 1px solid #F0EEEB;
    margin-bottom: 0.5rem;
  }
  .sb-user-status {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.25rem;
  }
  .sb-user-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #059669;
  }
  .sb-user-status span {
    font-size: 0.6rem;
    font-weight: 700;
    color: #059669;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .sb-user-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: #1A1A1A;
    line-height: 1.2;
  }
  .sb-user-role {
    font-size: 0.65rem;
    font-weight: 500;
    color: #B0ADA8;
    margin-top: 1px;
  }

  .sb-logout {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem;
    border-radius: 8px;
    border: 1px solid #F0EEEB;
    background: #FFFFFF;
    color: #8A8780;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .sb-logout:hover {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #DC2626;
  }

  .sb-toggle {
    position: absolute;
    right: -14px;
    top: 80px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: #FFFFFF;
    border: 1px solid #F0EEEB;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8A8780;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 40;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .sb-toggle:hover {
    color: #059669;
    border-color: #D1FAE5;
  }

  /* Mobile sidebar */
  .mobile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 40;
    display: none;
  }
  .sb-mobile {
    position: fixed;
    top: 0; bottom: 0; left: 0;
    width: 260px;
    background: #FFFFFF;
    z-index: 50;
    display: none;
    flex-direction: column;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  .sb-mobile--open { transform: translateX(0); }
  @media (max-width: 1023px) {
    .mobile-overlay { display: block; }
    .sb-mobile { display: flex; }
  }

  /* ═══ MAIN AREA ═══ */
  .dash-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  /* Desktop header */
  .dash-header {
    display: none;
    height: 56px;
    background: #FFFFFF;
    border-bottom: 1px solid #F0EEEB;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    flex-shrink: 0;
    z-index: 20;
  }
  @media (min-width: 1024px) {
    .dash-header { display: flex; }
  }

  .dash-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .bc-system {
    font-size: 0.8rem;
    font-weight: 600;
    color: #B0ADA8;
  }
  .bc-page {
    font-size: 0.8rem;
    font-weight: 700;
    color: #1A1A1A;
  }

  .dash-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .header-bell {
    position: relative;
    padding: 0.5rem;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #8A8780;
    cursor: pointer;
    transition: all 0.2s;
  }
  .header-bell:hover { background: #FAFAF8; color: #3A3A38; }
  .bell-dot {
    position: absolute;
    top: 8px; right: 8px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #059669;
    border: 1.5px solid #FFFFFF;
  }
  .header-sep {
    width: 1px;
    height: 20px;
    background: #F0EEEB;
    margin: 0 0.25rem;
  }
  .header-avatar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.25rem 0.75rem 0.25rem 0.25rem;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .header-avatar:hover { background: #FAFAF8; }
  .avatar-circle {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #059669;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 0.7rem;
    font-weight: 800;
  }
  .avatar-info { display: none; }
  @media (min-width: 1280px) {
    .avatar-info { display: block; }
  }
  .avatar-name {
    font-size: 0.8rem;
    font-weight: 700;
    color: #1A1A1A;
    line-height: 1.2;
  }
  .avatar-role {
    font-size: 0.65rem;
    font-weight: 500;
    color: #B0ADA8;
  }

  /* Mobile header */
  .dash-header-mobile {
    display: flex;
    height: 56px;
    background: #FFFFFF;
    border-bottom: 1px solid #F0EEEB;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.25rem;
    flex-shrink: 0;
  }
  @media (min-width: 1024px) {
    .dash-header-mobile { display: none; }
  }
  .mobile-brand {
    font-size: 0.9rem;
    font-weight: 800;
    color: #1A1A1A;
  }
  .mobile-menu-btn {
    padding: 0.4rem;
    border-radius: 6px;
    border: none;
    background: #FAFAF8;
    color: #5A5750;
    cursor: pointer;
  }

  /* Content */
  .dash-content {
    flex: 1;
    overflow: auto;
    padding: 1.25rem;
  }
  @media (min-width: 640px) {
    .dash-content { padding: 1.5rem; }
  }
  @media (min-width: 1024px) {
    .dash-content { padding: 2.5rem; }
  }
  .dash-content-inner {
    max-width: 1400px;
    margin: 0 auto;
  }
`;

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
  BarChart3,
  User as UserIcon,
} from 'lucide-react';
import AccessRestricted from '@/components/AccessRestricted';

interface MenuItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[];
}

interface MenuGroup {
  label: string | null;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: null,
    items: [{ href: '/dashboard', label: 'Resumen', icon: LayoutDashboard }],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
      { href: '/dashboard/zones', label: 'Zonas', icon: MapIcon },
      { href: '/dashboard/routes', label: 'Rutas', icon: Truck },
      { href: '/dashboard/vehicles', label: 'Vehículos', icon: Car },
    ],
  },
  {
    label: 'Catálogo',
    items: [{ href: '/dashboard/waste-types', label: 'Residuos', icon: Recycle }],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/dashboard/incidents', label: 'Incidentes', icon: AlertTriangle },
      { href: '/dashboard/tracking', label: 'Seguimiento', icon: Radio },
      { href: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ href: '/dashboard/profile', label: 'Mi Perfil', icon: UserIcon }],
  },
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
  '/dashboard/profile': 'Mi Perfil',
};

interface SidebarContentProps {
  isMobile?: boolean;
  collapsed: boolean;
  groups: MenuGroup[];
  pathname: string;
  user: { firstName: string; lastName: string; role: string };
  onNavigate: () => void;
  onLogout: () => void;
}

function BrandMark() {
  return (
    <span className="sb-brand-mark" aria-hidden>
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
        <defs>
          <linearGradient id="sbBrandBg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#10B981" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#sbBrandBg)" />

        <rect x="4.8" y="9.5" width="6.4" height="1.6" rx="0.8" fill="#FFFFFF" />
        <rect x="5.5" y="11.5" width="5" height="12" rx="1" fill="#FFFFFF" />
        <rect x="6.6" y="14.2" width="2.8" height="0.7" rx="0.35" fill="#059669" />
        <rect x="6.6" y="16" width="2.8" height="0.7" rx="0.35" fill="#059669" />
        <rect x="6.6" y="17.8" width="2.8" height="0.7" rx="0.35" fill="#059669" />

        <rect x="12.3" y="9.5" width="6.4" height="1.6" rx="0.8" fill="#ECFDF5" />
        <rect x="13" y="11.5" width="5" height="12" rx="1" fill="#ECFDF5" />
        <path d="M15.5 14.4 C13.9 15.8 13.9 17.3 15.5 18.6 C17.1 17.3 17.1 15.8 15.5 14.4 Z" fill="#059669" />

        <rect x="19.8" y="9.5" width="6.4" height="1.6" rx="0.8" fill="#D1FAE5" />
        <rect x="20.5" y="11.5" width="5" height="12" rx="1" fill="#D1FAE5" />
        <circle cx="23" cy="16.5" r="1.7" fill="none" stroke="#059669" strokeWidth="0.7" />
        <circle cx="23" cy="16.5" r="0.6" fill="#059669" />
      </svg>
    </span>
  );
}

function SidebarContent({
  isMobile = false,
  collapsed,
  groups,
  pathname,
  user,
  onNavigate,
  onLogout,
}: SidebarContentProps) {
  const expanded = !collapsed || isMobile;
  return (
    <>
      <div className="sb-brand">
        <BrandMark />
        {expanded && (
          <div className="sb-brand-text">
            <span className="sb-brand-name">SRSS</span>
            <span className="sb-brand-sub">Cusco</span>
          </div>
        )}
      </div>

      <nav className="sb-nav">
        {groups.map((group, gi) => {
          if (group.items.length === 0) return null;
          return (
            <div key={gi} className="sb-group">
              {expanded && group.label && (
                <span className="sb-group-label">{group.label}</span>
              )}
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`sb-link ${isActive ? 'sb-link--active' : ''}`}
                  >
                    <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                    {expanded && <span>{item.label}</span>}
                    {isActive && expanded && <span className="sb-link-pill" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sb-footer">
        {expanded && (
          <div className="sb-user">
            <div className="sb-user-top">
              <div className="sb-user-avatar">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="sb-user-meta">
                <div className="sb-user-name">{user.firstName} {user.lastName}</div>
                <div className="sb-user-role">{roleLabels[user.role]}</div>
              </div>
            </div>
            <div className="sb-user-status">
              <span className="sb-user-dot" />
              <span>En línea</span>
            </div>
          </div>
        )}
        <button onClick={onLogout} className="sb-logout" title="Cerrar sesión">
          <LogOut style={{ width: 16, height: 16 }} />
          {expanded && <span>Cerrar sesión</span>}
        </button>
      </div>
    </>
  );
}

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

  if (user.role !== 'admin') {
    return <AccessRestricted />;
  }

  const filteredGroups: MenuGroup[] = menuGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
  }));

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="dash-root">
      <style>{dashStyles}</style>

      <aside className={`sb ${collapsed ? 'sb--collapsed' : ''}`}>
        <SidebarContent
          collapsed={collapsed}
          groups={filteredGroups}
          pathname={pathname}
          user={user}
          onNavigate={closeMobileMenu}
          onLogout={logout}
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sb-toggle"
        >
          {collapsed ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronLeft style={{ width: 16, height: 16 }} />}
        </button>
      </aside>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sb-mobile ${mobileMenuOpen ? 'sb-mobile--open' : ''}`}>
        <SidebarContent
          isMobile
          collapsed={collapsed}
          groups={filteredGroups}
          pathname={pathname}
          user={user}
          onNavigate={closeMobileMenu}
          onLogout={logout}
        />
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
    padding: 1.4rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border-bottom: 1px solid #F7F6F4;
  }
  .sb-brand-mark {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 9px;
    box-shadow: 0 4px 12px rgba(5,150,105,0.22);
    overflow: hidden;
  }
  .sb-brand-mark svg {
    display: block;
    width: 32px;
    height: 32px;
  }
  .sb-brand-text {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    min-width: 0;
  }
  .sb-brand-name {
    font-size: 1.05rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.025em;
  }
  .sb-brand-sub {
    font-size: 0.68rem;
    font-weight: 500;
    color: #B0ADA8;
  }

  .sb-nav {
    flex: 1;
    padding: 1rem 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .sb-nav-label {
    font-size: 0.58rem;
    font-weight: 700;
    color: #C5C2BD;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    padding: 0 0.85rem 0.5rem;
  }
  .sb-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0 8px;
  }
  .sb-group:not(:first-child) {
    margin-top: 6px;
    padding-top: 10px;
    border-top: 1px solid #F4F2EF;
  }
  .sb-group-label {
    font-size: 0.6rem;
    font-weight: 700;
    color: #B0ADA8;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 6px 0.95rem 6px;
  }

  .sb-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.62rem 0.85rem;
    border-radius: 9px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #8A8780;
    text-decoration: none;
    transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
  }
  .sb-link:hover {
    background: #FAFAF8;
    color: #3A3A38;
  }
  .sb-link:hover:not(.sb-link--active) {
    transform: translateX(2px);
  }
  .sb-link--active {
    background: linear-gradient(135deg, #059669, #047857);
    color: #FFFFFF !important;
    box-shadow: 0 4px 12px rgba(5,150,105,0.22);
  }
  .sb-link--active:hover {
    transform: none;
  }
  .sb-link-pill {
    margin-left: auto;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255,255,255,0.85);
  }

  .sb-footer {
    padding: 0.85rem 0.75rem 1rem;
    margin-top: auto;
    border-top: 1px solid #F7F6F4;
  }
  .sb-user {
    padding: 0.85rem;
    border-radius: 11px;
    background: #FAFAF8;
    border: 1px solid #F0EEEB;
    margin-bottom: 0.55rem;
  }
  .sb-user-top {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.55rem;
  }
  .sb-user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #1A1A1A;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }
  .sb-user-meta {
    min-width: 0;
    flex: 1;
  }
  .sb-user-name {
    font-size: 0.78rem;
    font-weight: 700;
    color: #1A1A1A;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb-user-role {
    font-size: 0.65rem;
    font-weight: 500;
    color: #B0ADA8;
    margin-top: 1px;
  }
  .sb-user-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding-top: 0.5rem;
    border-top: 1px solid #F0EEEB;
  }
  .sb-user-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
  }
  .sb-user-status span:last-child {
    font-size: 0.6rem;
    font-weight: 700;
    color: #059669;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .sb-logout {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem;
    border-radius: 9px;
    border: 1px solid #F0EEEB;
    background: #FFFFFF;
    color: #8A8780;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
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
    gap: 0.45rem;
  }
  .bc-system {
    font-size: 0.78rem;
    font-weight: 600;
    color: #B0ADA8;
    letter-spacing: 0.01em;
  }
  .bc-page {
    font-size: 0.82rem;
    font-weight: 700;
    color: #1A1A1A;
    letter-spacing: -0.01em;
  }

  .dash-header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .header-bell {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    border: 1px solid transparent;
    background: transparent;
    color: #8A8780;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-bell:hover {
    background: #FAFAF8;
    color: #1A1A1A;
    border-color: #F0EEEB;
  }
  .bell-dot {
    position: absolute;
    top: 8px; right: 8px;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #DC2626;
    border: 2px solid #FFFFFF;
    box-shadow: 0 0 0 1px rgba(220,38,38,0.25);
  }
  .header-sep {
    width: 1px;
    height: 22px;
    background: #F0EEEB;
    margin: 0 0.35rem;
  }
  .header-avatar {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.3rem 0.85rem 0.3rem 0.35rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease;
  }
  .header-avatar:hover {
    background: #FAFAF8;
    border-color: #F0EEEB;
  }
  .avatar-circle {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, #059669, #047857);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.02em;
    box-shadow: 0 2px 6px rgba(5,150,105,0.25);
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
    letter-spacing: -0.01em;
  }
  .avatar-role {
    font-size: 0.65rem;
    font-weight: 500;
    color: #B0ADA8;
    margin-top: 1px;
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

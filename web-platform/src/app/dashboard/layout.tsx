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
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Bell,
  Car,
  AlertTriangle,
  BarChart3,
  User as UserIcon,
  HelpCircle,
  Settings,
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
  icon: typeof LayoutDashboard | null;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: null,
    icon: null,
    items: [{ href: '/dashboard', label: 'Panel general', icon: LayoutDashboard }],
  },
  {
    label: 'Gestión',
    icon: Users,
    items: [
      { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
      { href: '/dashboard/zones', label: 'Zonas', icon: MapIcon },
      { href: '/dashboard/routes', label: 'Rutas', icon: Truck },
      { href: '/dashboard/vehicles', label: 'Vehículos', icon: Car },
    ],
  },
  {
    label: 'Catálogo',
    icon: Recycle,
    items: [{ href: '/dashboard/waste-types', label: 'Tipos de residuos', icon: Recycle }],
  },
  {
    label: 'Operaciones',
    icon: Radio,
    items: [
      { href: '/dashboard/incidents', label: 'Incidentes', icon: AlertTriangle },
      { href: '/dashboard/tracking', label: 'Seguimiento GPS', icon: Radio },
      { href: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Cuenta',
    icon: UserIcon,
    items: [{ href: '/dashboard/profile', label: 'Mi perfil', icon: UserIcon }],
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
  groups: MenuGroup[];
  pathname: string;
  user: { firstName: string; lastName: string; role: string };
  onNavigate: () => void;
  onLogout: () => void;
}

function BrandMark() {
  return (
    <span className="sb-brand-mark" aria-hidden>
      <svg viewBox="0 0 36 32" width="36" height="32" fill="none">
        {/* Tacho 1 — orgánicos · verde profundo */}
        <rect x="0.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#00513A" />
        <rect x="1.5" y="9.5" width="9" height="20" rx="1.5" fill="#00684A" />
        <rect x="3.5" y="13.5" width="5" height="1" rx="0.5" fill="#E3FCEF" opacity="0.45" />
        <rect x="3.5" y="17" width="5" height="1" rx="0.5" fill="#E3FCEF" opacity="0.45" />
        <rect x="3.5" y="20.5" width="5" height="1" rx="0.5" fill="#E3FCEF" opacity="0.45" />

        {/* Tacho 2 — reciclables · verde medio */}
        <rect x="12.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#007F4A" />
        <rect x="13.5" y="9.5" width="9" height="20" rx="1.5" fill="#00A35C" />
        <path
          d="M18 13.5 C15.3 16 15.3 19 18 22 C20.7 19 20.7 16 18 13.5 Z"
          fill="#E3FCEF"
          opacity="0.85"
        />

        {/* Tacho 3 — peligrosos · verde claro */}
        <rect x="24.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#3A9F6A" />
        <rect x="25.5" y="9.5" width="9" height="20" rx="1.5" fill="#5BC18C" />
        <circle cx="30" cy="18" r="2.6" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.95" />
        <circle cx="30" cy="18" r="0.9" fill="#FFFFFF" opacity="0.95" />
      </svg>
    </span>
  );
}

function SidebarContent({
  groups,
  pathname,
  user,
  onNavigate,
  onLogout,
}: SidebarContentProps) {
  return (
    <>
      <div className="sb-brand">
        <BrandMark />
        <div className="sb-brand-text">
          <span className="sb-brand-name">SRSS Cusco</span>
        </div>
      </div>

      <nav className="sb-nav">
        {groups.map((group, gi) => {
          if (group.items.length === 0) return null;
          const GroupIcon = group.icon;
          const indented = group.label !== null;
          return (
            <div key={gi} className="sb-group">
              {group.label && GroupIcon ? (
                <div className="sb-group-header">
                  <GroupIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span className="sb-group-label">{group.label}</span>
                  <ChevronDown style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.5 }} />
                </div>
              ) : null}
              <div className="sb-group-items">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={`sb-link ${indented ? 'sb-link--indented' : ''} ${isActive ? 'sb-link--active' : ''}`}
                    >
                      {!indented && <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sb-footer">
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
        <button onClick={onLogout} className="sb-logout" title="Cerrar sesión">
          <LogOut style={{ width: 16, height: 16 }} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

      <aside className="sb">
        <SidebarContent
          groups={filteredGroups}
          pathname={pathname}
          user={user}
          onNavigate={closeMobileMenu}
          onLogout={logout}
        />
      </aside>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sb-mobile ${mobileMenuOpen ? 'sb-mobile--open' : ''}`}>
        <SidebarContent
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
            <div className="bc-segment">
              <span className="bc-label">ORGANIZACIÓN</span>
              <span className="bc-value">Municipalidad Cusco</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14, color: '#D1D0CC', flexShrink: 0 }} />
            <div className="bc-segment">
              <span className="bc-label">SECCIÓN</span>
              <span className="bc-value bc-page">{pageTitles[pathname] ?? 'Panel'}</span>
            </div>
          </div>
          <div className="dash-header-right">
            <button className="header-icon-btn" aria-label="Ayuda" title="Ayuda">
              <HelpCircle style={{ width: 17, height: 17 }} />
            </button>
            <button className="header-icon-btn" aria-label="Notificaciones" title="Notificaciones">
              <Bell style={{ width: 17, height: 17 }} />
              <span className="bell-dot" />
            </button>
            <button className="header-icon-btn" aria-label="Configuración" title="Configuración">
              <Settings style={{ width: 17, height: 17 }} />
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
  }

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
    width: 36px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sb-brand-mark svg {
    display: block;
    width: 36px;
    height: 32px;
  }
  .sb-brand-text {
    display: flex;
    align-items: baseline;
    min-width: 0;
  }
  .sb-brand-name {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 1.15rem;
    font-weight: 500;
    color: #001E2B;
    letter-spacing: -0.012em;
    font-variation-settings: "opsz" 36;
    line-height: 1.1;
  }

  .sb-nav {
    flex: 1;
    padding: 1rem 0.75rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .sb-group {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 4px 0 6px;
  }
  .sb-group:not(:first-child) {
    margin-top: 4px;
    padding-top: 8px;
  }
  .sb-group-header {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.6rem 0.45rem 0.95rem;
    color: #00513A;
    font-family: 'Geist', 'Outfit', sans-serif;
    user-select: none;
  }
  .sb-group-label {
    flex: 1;
    font-size: 0.65rem;
    font-weight: 700;
    color: #00513A;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .sb-group-items {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sb-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.85rem 0.5rem 0.95rem;
    border-radius: 6px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
    color: #5C6C75;
    text-decoration: none;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .sb-link--indented {
    padding-left: 2.4rem;
    font-size: 0.81rem;
  }
  .sb-link:hover:not(.sb-link--active) {
    background: #F4F6F4;
    color: #001E2B;
  }
  .sb-link--active {
    background: #E3FCEF;
    color: #00513A !important;
    font-weight: 600;
  }
  .sb-link--active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    background: #00684A;
    border-radius: 0 3px 3px 0;
  }
  .sb-link--indented.sb-link--active::before {
    left: 0;
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
    gap: 0.85rem;
    min-width: 0;
  }
  .bc-segment {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .bc-label {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.58rem;
    font-weight: 700;
    color: #889397;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .bc-value {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    color: #001E2B;
    letter-spacing: -0.005em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bc-page {
    color: #00513A;
  }

  .dash-header-right {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .header-icon-btn {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: #5C6C75;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-icon-btn:hover {
    background: #F4F6F4;
    color: #001E2B;
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
    background: linear-gradient(135deg, #00A35C, #00684A);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    box-shadow: 0 2px 6px rgba(0,104,74,0.25);
    font-family: 'Geist', 'Outfit', sans-serif;
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

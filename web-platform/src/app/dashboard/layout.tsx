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
  Menu,
  Bell,
  HelpCircle,
  Car,
  AlertTriangle,
  BarChart3,
  User as UserIcon,
  ChevronRight,
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
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: null,
    items: [{ href: '/dashboard', label: 'Panel general', icon: LayoutDashboard }],
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
    items: [{ href: '/dashboard/waste-types', label: 'Tipos de residuos', icon: Recycle }],
  },
  {
    label: 'Operaciones',
    items: [
      { href: '/dashboard/incidents', label: 'Incidentes', icon: AlertTriangle },
      { href: '/dashboard/tracking', label: 'Seguimiento GPS', icon: Radio },
      { href: '/dashboard/reports', label: 'Reportes', icon: BarChart3 },
    ],
  },
  {
    label: 'Cuenta',
    items: [{ href: '/dashboard/profile', label: 'Mi perfil', icon: UserIcon }],
  },
];

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  citizen: 'Ciudadano',
};

const pageTitles: Record<string, string> = {
  '/dashboard': 'Panel general',
  '/dashboard/users': 'Usuarios',
  '/dashboard/zones': 'Zonas',
  '/dashboard/waste-types': 'Tipos de residuos',
  '/dashboard/routes': 'Rutas',
  '/dashboard/vehicles': 'Vehículos',
  '/dashboard/incidents': 'Incidentes',
  '/dashboard/reports': 'Reportes',
  '/dashboard/tracking': 'Seguimiento GPS',
  '/dashboard/profile': 'Mi perfil',
};

function BrandLogo({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        color: 'var(--color-primary)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg viewBox="0 0 32 32" fill="none" style={{ width: '100%', height: '100%' }}>
        <path
          d="M16 4C16 4 8 10 8 18C8 23 11 27 16 27C21 27 24 23 24 18C24 10 16 4 16 4Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

interface SidebarContentProps {
  pathname: string;
  role: string;
  user: { firstName: string; lastName: string };
  onNavigate: () => void;
  onLogout: () => void;
}

function SidebarContent({ pathname, role, user, onNavigate, onLogout }: SidebarContentProps) {
  return (
    <>
      <div className="sb-brand">
        <BrandLogo />
        <div className="sb-brand-text">
          <span className="sb-brand-name">SRSS</span>
          <span className="sb-brand-sub">Cusco</span>
        </div>
      </div>

      <nav className="sb-nav" aria-label="Navegación principal">
        {menuGroups.map((group, gi) => {
          const visible = group.items.filter((item) => !item.roles || item.roles.includes(role));
          if (visible.length === 0) return null;
          return (
            <div key={gi} className="sb-group">
              {group.label ? <span className="sb-group-label">{group.label}</span> : null}
              {visible.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`sb-link ${isActive ? 'sb-link--active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-user-avatar">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div className="sb-user-meta">
            <div className="sb-user-name">
              {user.firstName} {user.lastName}
            </div>
            <div className="sb-user-role">{roleLabels[role] ?? role}</div>
          </div>
          <button onClick={onLogout} className="sb-logout" title="Cerrar sesión">
            <LogOut size={15} />
          </button>
        </div>
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
      <div className="dash-loading">
        <span className="dash-spinner" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return <AccessRestricted />;
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="dash-root">
      <style>{styles}</style>

      <aside className="sb sb--desktop">
        <SidebarContent
          pathname={pathname}
          role={user.role}
          user={user}
          onNavigate={closeMobileMenu}
          onLogout={logout}
        />
      </aside>

      {mobileMenuOpen && <div className="sb-overlay" onClick={closeMobileMenu} />}

      <aside className={`sb sb--mobile ${mobileMenuOpen ? 'sb--open' : ''}`}>
        <SidebarContent
          pathname={pathname}
          role={user.role}
          user={user}
          onNavigate={closeMobileMenu}
          onLogout={logout}
        />
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <button
            className="dash-burger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>

          <div className="dash-crumb">
            <span className="crumb-org">Municipalidad Cusco</span>
            <ChevronRight size={13} color="var(--color-text-faint)" />
            <span className="crumb-page">{pageTitles[pathname] ?? 'Panel'}</span>
          </div>

          <div className="dash-actions">
            <button className="header-icon-btn" aria-label="Ayuda">
              <HelpCircle size={17} />
            </button>
            <button className="header-icon-btn" aria-label="Notificaciones">
              <Bell size={17} />
              <span className="header-dot" />
            </button>
            <button className="header-icon-btn" aria-label="Configuración">
              <Settings size={17} />
            </button>
            <div className="header-avatar">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
          </div>
        </header>

        <main className="dash-content">
          <div className="dash-content-inner animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

const styles = `
  .dash-root {
    min-height: 100vh;
    display: flex;
    background: var(--color-canvas);
  }

  /* ─── Loading ─── */
  .dash-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-canvas);
  }
  .dash-spinner {
    width: 32px;
    height: 32px;
    border: 2.5px solid var(--color-line);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ═══ SIDEBAR ═══ */
  .sb {
    width: 248px;
    background: var(--color-paper);
    border-right: 1px solid var(--color-line);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .sb--desktop { display: none; }
  @media (min-width: 1024px) {
    .sb--desktop { display: flex; }
  }

  .sb--mobile {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: var(--shadow-lg);
  }
  .sb--mobile.sb--open { transform: translateX(0); }
  .sb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,30,43,0.45);
    z-index: 40;
    backdrop-filter: blur(2px);
  }
  @media (min-width: 1024px) {
    .sb--mobile, .sb-overlay { display: none; }
  }

  /* Brand */
  .sb-brand {
    padding: 20px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--color-line-soft);
  }
  .sb-brand-text {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .sb-brand-name {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: -0.01em;
    font-variation-settings: "opsz" 36;
  }
  .sb-brand-sub {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Nav */
  .sb-nav {
    flex: 1;
    padding: 16px 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
  }
  .sb-group {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 6px 0 10px;
  }
  .sb-group-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-faint);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 8px 14px 6px;
  }
  .sb-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--color-text-muted);
    transition: background 0.15s ease, color 0.15s ease;
  }
  .sb-link:hover {
    background: var(--color-cloud);
    color: var(--color-text);
  }
  .sb-link--active {
    background: var(--color-green-100);
    color: var(--color-green-700);
    font-weight: 600;
  }
  .sb-link--active::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 6px;
    bottom: 6px;
    width: 3px;
    background: var(--color-primary);
    border-radius: 0 3px 3px 0;
  }

  /* Footer / User */
  .sb-footer {
    padding: 14px 12px 16px;
    border-top: 1px solid var(--color-line-soft);
  }
  .sb-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 8px;
    transition: background 0.15s ease;
  }
  .sb-user:hover { background: var(--color-cloud); }
  .sb-user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--color-green-100);
    color: var(--color-green-700);
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }
  .sb-user-meta { min-width: 0; flex: 1; }
  .sb-user-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sb-user-role {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
  .sb-logout {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    display: grid;
    place-items: center;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    flex-shrink: 0;
  }
  .sb-logout:hover {
    background: var(--color-rose-100);
    color: var(--color-rose-500);
    border-color: rgba(178,58,58,0.2);
  }

  /* ═══ MAIN ═══ */
  .dash-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .dash-header {
    height: 56px;
    background: var(--color-paper);
    border-bottom: 1px solid var(--color-line);
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 16px;
    flex-shrink: 0;
  }
  @media (min-width: 1024px) {
    .dash-header { padding: 0 36px; }
  }

  .dash-burger {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text);
    transition: background 0.15s ease;
  }
  .dash-burger:hover { background: var(--color-cloud); }
  @media (min-width: 1024px) {
    .dash-burger { display: none; }
  }

  .dash-crumb {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .crumb-org {
    font-size: 12px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
    white-space: nowrap;
  }
  .crumb-page {
    font-size: 14px;
    color: var(--color-text);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 640px) {
    .crumb-org { display: none; }
  }

  .dash-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .header-icon-btn {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    display: grid;
    place-items: center;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .header-icon-btn:hover {
    background: var(--color-cloud);
    color: var(--color-text);
  }
  .header-dot {
    position: absolute;
    top: 9px;
    right: 9px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-rose-500);
    border: 2px solid var(--color-paper);
  }
  .header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--color-green-100);
    color: var(--color-green-700);
    display: grid;
    place-items: center;
    font-size: 11.5px;
    font-weight: 700;
    margin-left: 6px;
  }

  /* Content */
  .dash-content {
    flex: 1;
    overflow: auto;
    padding: 32px 24px;
  }
  @media (min-width: 1024px) {
    .dash-content { padding: 44px 48px; }
  }
  .dash-content-inner {
    max-width: 1280px;
    margin: 0 auto;
  }
`;

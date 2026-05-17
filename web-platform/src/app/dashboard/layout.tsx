'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  Briefcase,
  UserPlus,
  Grid3x3,
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
  collapsedGroups: Set<string>;
  onToggleGroup: (label: string) => void;
}

const COLLAPSED_STORAGE_KEY = 'srss-sidebar-collapsed-groups';

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
  collapsedGroups,
  onToggleGroup,
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
          const isCollapsed = group.label ? collapsedGroups.has(group.label) : false;
          const groupContainsActive = group.items.some((it) => it.href === pathname);
          return (
            <div key={gi} className={`sb-group ${isCollapsed ? 'sb-group--collapsed' : ''}`}>
              {group.label && GroupIcon ? (
                <button
                  type="button"
                  className={`sb-group-header ${groupContainsActive ? 'sb-group-header--has-active' : ''}`}
                  onClick={() => onToggleGroup(group.label!)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`sb-group-items-${gi}`}
                >
                  <GroupIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span className="sb-group-label">{group.label}</span>
                  {groupContainsActive && isCollapsed && (
                    <span className="sb-group-active-dot" aria-hidden />
                  )}
                  <ChevronDown
                    className="sb-group-chevron"
                    style={{ width: 13, height: 13, flexShrink: 0 }}
                  />
                </button>
              ) : null}
              <div
                id={`sb-group-items-${gi}`}
                className="sb-group-items"
                hidden={isCollapsed}
              >
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<'help' | 'bell' | 'apps' | 'avatar' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openMenu]);

  const toggleMenu = (menu: 'help' | 'bell' | 'apps' | 'avatar') => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) setCollapsedGroups(new Set(arr));
      }
    } catch {}
  }, []);

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try {
        window.localStorage.setItem(
          COLLAPSED_STORAGE_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {}
      return next;
    });
  };

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
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
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
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
        />
      </aside>

      {/* Main area */}
      <div className="dash-main">
        {/* Desktop Header */}
        <header className="dash-header" ref={headerRef}>
          <div className="dash-breadcrumb">
            <button
              type="button"
              className="bc-segment"
              onClick={() => router.push('/dashboard')}
              title="Ir al panel general"
            >
              <span className="bc-label">ORGANIZACIÓN</span>
              <span className="bc-value-row">
                <span className="bc-value">Municipalidad Cusco</span>
                <ChevronDown style={{ width: 13, height: 13, color: '#5C6C75', flexShrink: 0 }} />
              </span>
            </button>
            <ChevronRight style={{ width: 13, height: 13, color: '#C5C8CB', flexShrink: 0 }} />
            <button
              type="button"
              className={`bc-segment ${openMenu === 'apps' ? 'bc-segment--active' : ''}`}
              onClick={() => toggleMenu('apps')}
              aria-expanded={openMenu === 'apps'}
              title="Saltar a otra sección"
            >
              <span className="bc-label">SECCIÓN</span>
              <span className="bc-value-row">
                <span className="bc-value bc-page">{pageTitles[pathname] ?? 'Panel'}</span>
                <ChevronDown style={{ width: 13, height: 13, color: '#5C6C75', flexShrink: 0 }} />
              </span>
            </button>
          </div>
          <div className="dash-header-right">
            <div className="header-menu-wrap">
              <button
                className={`header-icon-btn ${openMenu === 'help' ? 'header-icon-btn--active' : ''}`}
                aria-label="Ayuda"
                title="Ayuda"
                onClick={() => toggleMenu('help')}
              >
                <HelpCircle style={{ width: 17, height: 17 }} />
              </button>
              {openMenu === 'help' && (
                <div className="header-dropdown header-dropdown--narrow" role="menu">
                  <div className="dropdown-head">
                    <span className="dropdown-title">Ayuda y recursos</span>
                  </div>
                  <a
                    className="dropdown-item"
                    href="https://github.com/milith0kun/Recoleccion_residuos_solidos#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpenMenu(null)}
                  >
                    <Briefcase size={15} />
                    <span>Documentación del sistema</span>
                  </a>
                  <a
                    className="dropdown-item"
                    href="mailto:soporte@cusco.gob.pe?subject=Soporte SRSS Cusco"
                    onClick={() => setOpenMenu(null)}
                  >
                    <HelpCircle size={15} />
                    <span>Contactar soporte</span>
                  </a>
                  <div className="dropdown-foot">SRSS Cusco · v1.0</div>
                </div>
              )}
            </div>

            <a
              className="header-icon-btn"
              href="https://github.com/milith0kun/Recoleccion_residuos_solidos#readme"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Documentación"
              title="Documentación"
            >
              <Briefcase style={{ width: 17, height: 17 }} />
            </a>

            <button
              className="header-icon-btn"
              aria-label="Invitar usuario"
              title="Invitar usuario"
              onClick={() => router.push('/dashboard/users')}
            >
              <UserPlus style={{ width: 17, height: 17 }} />
            </button>

            <div className="header-menu-wrap">
              <button
                className={`header-icon-btn ${openMenu === 'bell' ? 'header-icon-btn--active' : ''}`}
                aria-label="Notificaciones"
                title="Notificaciones"
                onClick={() => toggleMenu('bell')}
              >
                <Bell style={{ width: 17, height: 17 }} />
                <span className="bell-dot" />
              </button>
              {openMenu === 'bell' && (
                <div className="header-dropdown header-dropdown--bell" role="menu">
                  <div className="dropdown-head">
                    <span className="dropdown-title">Notificaciones</span>
                    <span className="dropdown-badge">0 nuevas</span>
                  </div>
                  <div className="dropdown-empty">
                    <div className="dropdown-empty-icon">
                      <Bell size={20} />
                    </div>
                    <p className="dropdown-empty-title">Sin notificaciones nuevas</p>
                    <p className="dropdown-empty-desc">
                      Las alertas de rutas, incidentes y reportes ciudadanos aparecerán acá.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="header-menu-wrap">
              <button
                className={`header-icon-btn ${openMenu === 'apps' ? 'header-icon-btn--active' : ''}`}
                aria-label="Accesos rápidos"
                title="Accesos rápidos"
                onClick={() => toggleMenu('apps')}
              >
                <Grid3x3 style={{ width: 17, height: 17 }} />
              </button>
              {openMenu === 'apps' && (
                <div className="header-dropdown header-dropdown--apps" role="menu">
                  <div className="dropdown-head">
                    <span className="dropdown-title">Accesos rápidos</span>
                  </div>
                  <div className="apps-grid">
                    {menuGroups
                      .flatMap((g) => g.items)
                      .filter((item) => !item.roles || item.roles.includes(user.role))
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="app-tile"
                            onClick={() => setOpenMenu(null)}
                          >
                            <span className="app-tile-icon">
                              <Icon size={18} />
                            </span>
                            <span className="app-tile-label">{item.label}</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="header-menu-wrap">
              <button
                className={`header-avatar-btn ${openMenu === 'avatar' ? 'header-avatar-btn--active' : ''}`}
                title={`${user.firstName} ${user.lastName}`}
                onClick={() => toggleMenu('avatar')}
              >
                {user.firstName[0]}{user.lastName[0]}
              </button>
              {openMenu === 'avatar' && (
                <div className="header-dropdown header-dropdown--avatar" role="menu">
                  <div className="avatar-dropdown-head">
                    <div className="avatar-dropdown-circle">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="avatar-dropdown-name">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="avatar-dropdown-email">{user.email}</div>
                      <span className="avatar-dropdown-role">{roleLabels[user.role]}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider" />
                  <Link
                    href="/dashboard/profile"
                    className="dropdown-item"
                    onClick={() => setOpenMenu(null)}
                  >
                    <UserIcon size={15} />
                    <span>Mi perfil</span>
                  </Link>
                  <Link
                    href="/dashboard/users"
                    className="dropdown-item"
                    onClick={() => setOpenMenu(null)}
                  >
                    <Users size={15} />
                    <span>Gestionar usuarios</span>
                  </Link>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item dropdown-item--danger"
                    onClick={() => {
                      setOpenMenu(null);
                      logout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
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
    width: 248px;
    display: none;
    flex-direction: column;
    background: #FFFFFF;
    border-right: 1px solid #E8EDEB;
    position: relative;
    z-index: 30;
  }

  @media (min-width: 1024px) {
    .sb { display: flex; }
  }

  .sb-brand {
    height: 56px;
    padding: 0 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    border-bottom: 1px solid #E8EDEB;
    flex-shrink: 0;
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
    padding: 10px 0 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }
  .sb-group {
    display: flex;
    flex-direction: column;
    padding: 2px 0 6px;
  }
  .sb-group:not(:first-child) {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 1px solid #F5F5F2;
  }
  .sb-group--collapsed {
    padding-bottom: 2px;
  }
  .sb-group-header {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    padding: 0.5rem 0.9rem 0.5rem 1.1rem;
    border: 0;
    background: transparent;
    color: #889397;
    font-family: 'Geist', 'Outfit', sans-serif;
    cursor: pointer;
    user-select: none;
    text-align: left;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .sb-group-header:hover {
    background: #F6F7F5;
    color: #001E2B;
  }
  .sb-group-header:focus-visible {
    outline: 2px solid #00A35C;
    outline-offset: -2px;
  }
  .sb-group-header--has-active {
    color: #00513A;
  }
  .sb-group-label {
    font-size: 0.62rem;
    font-weight: 700;
    color: inherit;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
  .sb-group-active-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #00A35C;
    box-shadow: 0 0 0 3px rgba(0,163,92,0.16);
    flex-shrink: 0;
    margin-left: 0.4rem;
  }
  .sb-group-chevron {
    margin-left: auto;
    color: #B2BAC0;
    opacity: 0.85;
    transition: transform 0.22s ease, opacity 0.15s ease, color 0.15s ease;
  }
  .sb-group-header:hover .sb-group-chevron,
  .sb-group-header--has-active .sb-group-chevron {
    color: #00513A;
    opacity: 1;
  }
  .sb-group--collapsed .sb-group-chevron {
    transform: rotate(-90deg);
  }
  .sb-group-items {
    display: flex;
    flex-direction: column;
    position: relative;
    margin-top: 2px;
    overflow: hidden;
  }
  .sb-group-items::before {
    content: '';
    position: absolute;
    left: calc(1.1rem + 7.5px);
    top: 4px;
    bottom: 4px;
    width: 1px;
    background: #EEF0EC;
  }
  .sb-group-items[hidden] {
    display: none;
  }

  .sb-link {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 1.1rem 0.5rem 1.1rem;
    border-radius: 0;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.84rem;
    font-weight: 500;
    color: #5C6C75;
    text-decoration: none;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .sb-link--indented {
    padding-left: 2.6rem;
    font-size: 0.825rem;
  }
  .sb-link:hover:not(.sb-link--active) {
    background: #F6F7F5;
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
    top: 4px;
    bottom: 4px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: #00684A;
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
    background: #E8EDEB;
    color: #001E2B;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
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
    border-bottom: 1px solid #E8EDEB;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    flex-shrink: 0;
    z-index: 20;
  }
  @media (min-width: 1024px) {
    .dash-header { display: flex; }
  }

  .dash-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
  }
  .bc-segment {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    padding: 4px 8px 4px 6px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    text-align: left;
  }
  .bc-segment:hover {
    background: #F4F6F4;
    border-color: #E8EDEB;
  }
  .bc-label {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.58rem;
    font-weight: 700;
    color: #889397;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .bc-value-row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
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
    gap: 2px;
  }
  .header-icon-btn {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 6px;
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
  }
  .header-avatar-btn {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid #E8EDEB;
    background: #F4F6F4;
    color: #001E2B;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    display: grid;
    place-items: center;
    cursor: pointer;
    margin-left: 8px;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .header-avatar-btn:hover,
  .header-avatar-btn--active {
    background: #E8EDEB;
    border-color: #D4D9D7;
  }
  .header-icon-btn--active {
    background: #F4F6F4;
    color: #001E2B;
    border-color: #E8EDEB;
  }
  .bc-segment--active {
    background: #F4F6F4;
    border-color: #E8EDEB;
  }

  /* Header dropdowns */
  .header-menu-wrap {
    position: relative;
    display: inline-flex;
  }
  .header-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 260px;
    max-width: 360px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,30,43,0.12), 0 2px 6px rgba(0,30,43,0.06);
    padding: 8px;
    z-index: 100;
    font-family: 'Geist', 'Outfit', sans-serif;
    animation: dropdown-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes dropdown-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .header-dropdown--narrow { min-width: 240px; }
  .header-dropdown--bell { min-width: 320px; }
  .header-dropdown--apps { min-width: 320px; padding: 12px; }
  .header-dropdown--avatar { min-width: 280px; }

  .dropdown-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 10px;
    border-bottom: 1px solid #F0F2F0;
    margin-bottom: 6px;
  }
  .dropdown-title {
    font-size: 0.72rem;
    font-weight: 700;
    color: #001E2B;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .dropdown-badge {
    font-size: 0.65rem;
    font-weight: 600;
    color: #5C6C75;
    background: #F4F6F4;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .dropdown-section-title {
    display: block;
    padding: 8px 12px 4px;
    font-size: 0.65rem;
    font-weight: 700;
    color: #889397;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    color: #001E2B;
    font-size: 0.82rem;
    font-weight: 500;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
    font-family: inherit;
  }
  .dropdown-item:hover {
    background: #F4F6F4;
    color: #00513A;
  }
  .dropdown-item--danger:hover {
    background: #FCE9E9;
    color: #B23A3A;
  }
  .dropdown-divider {
    height: 1px;
    background: #F0F2F0;
    margin: 6px -8px;
  }
  .dropdown-foot {
    font-size: 0.68rem;
    color: #889397;
    padding: 8px 12px 4px;
    border-top: 1px solid #F0F2F0;
    margin-top: 6px;
    text-align: center;
  }

  /* Bell empty state */
  .dropdown-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 24px 16px 16px;
    text-align: center;
  }
  .dropdown-empty-icon {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: #F4F6F4;
    color: #5C6C75;
    display: grid;
    place-items: center;
    margin-bottom: 4px;
  }
  .dropdown-empty-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: #001E2B;
    margin: 0;
  }
  .dropdown-empty-desc {
    font-size: 0.74rem;
    color: #5C6C75;
    line-height: 1.45;
    max-width: 240px;
    margin: 0;
  }

  /* Apps grid */
  .apps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 4px;
  }
  .app-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border-radius: 8px;
    color: #001E2B;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.1s ease;
  }
  .app-tile:hover {
    background: #E3FCEF;
    border-color: #C1F1D6;
    color: #00513A;
    transform: translateY(-1px);
  }
  .app-tile-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #F4F6F4;
    color: #00684A;
    display: grid;
    place-items: center;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .app-tile:hover .app-tile-icon {
    background: #FFFFFF;
    color: #00684A;
  }
  .app-tile-label {
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.2;
  }

  /* Avatar dropdown */
  .avatar-dropdown-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 14px;
    border-bottom: 1px solid #F0F2F0;
    margin-bottom: 6px;
  }
  .avatar-dropdown-circle {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: #E8EDEB;
    color: #001E2B;
    display: grid;
    place-items: center;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 0.88rem;
    font-weight: 700;
    flex-shrink: 0;
    border: 1px solid #DCE2E0;
  }
  .avatar-dropdown-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #001E2B;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .avatar-dropdown-email {
    font-size: 0.72rem;
    color: #5C6C75;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .avatar-dropdown-role {
    display: inline-block;
    margin-top: 6px;
    font-size: 0.62rem;
    font-weight: 700;
    color: #00513A;
    background: #E3FCEF;
    padding: 2px 8px;
    border-radius: 999px;
    letter-spacing: 0.04em;
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

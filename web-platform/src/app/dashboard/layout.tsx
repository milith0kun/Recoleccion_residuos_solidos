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
  Leaf,
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
  '/dashboard/tracking': 'Seguimiento GPS',
};

interface NavContentProps {
  collapsed: boolean;
  pathname: string;
  filteredMenu: typeof menuItems;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
  logout: () => void;
  roleLabels: Record<string, string>;
  setMobileMenuOpen: (open: boolean) => void;
}

const NavContent = ({ 
  collapsed, 
  pathname, 
  filteredMenu, 
  user, 
  logout, 
  roleLabels, 
  setMobileMenuOpen 
}: NavContentProps) => (
  <>
    {/* Logo */}
    <div className="p-8 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
        <Leaf className="w-7 h-7 text-white" />
      </div>
      {!collapsed && (
        <div className="animate-fade-in">
          <div className="font-black text-slate-900 text-xl tracking-tight leading-none">EcoRutas</div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400 mt-1">Cusco</div>
        </div>
      )}
    </div>

    {/* Menu */}
    <nav className="flex-1 px-6 space-y-2 mt-4 overflow-y-auto">
      {filteredMenu.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
              isActive
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'group-hover:text-emerald-500'}`} />
            {!collapsed && (
              <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>

    {/* User info */}
    <div className="p-6 mt-auto">
      {!collapsed && (
        <div className="bg-slate-50 rounded-3xl p-5 mb-4 animate-fade-in border border-slate-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">En línea</div>
          </div>
          <div className="text-sm font-black text-slate-900 truncate leading-tight">{user.firstName} {user.lastName}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{roleLabels[user.role]}</div>
        </div>
      )}
      <button
        onClick={logout}
        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-sm font-black transition-all border ${
          collapsed 
            ? 'bg-rose-50 text-rose-600 border-rose-100' 
            : 'bg-white text-slate-500 border-slate-100 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 shadow-sm hover:shadow-md'
        }`}
      >
        <LogOut className="w-5 h-5" />
        {!collapsed && <span>Cerrar Sesión</span>}
      </button>
    </div>
  </>
);

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredMenu = menuItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const navProps = {
    collapsed,
    pathname,
    filteredMenu,
    user,
    logout,
    roleLabels,
    setMobileMenuOpen
  };

  return (
    <div className="min-h-screen flex bg-[#FBFDFF] text-slate-900">
      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-500 relative z-30 bg-white border-r border-slate-100 ${
          collapsed ? 'w-28' : 'w-80'
        }`}
      >
        <NavContent {...navProps} />
        
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-4 top-24 w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-100 shadow-xl shadow-slate-200/50 transition-all z-40 group hover:scale-110"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Mobile */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-white z-50 transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent {...navProps} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-100 items-center px-8 shrink-0 gap-4 z-20">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm text-slate-400 font-semibold shrink-0">EcoRutas</span>
            <ChevronRight className="w-4 h-4 text-slate-200 shrink-0" />
            <span className="text-sm font-bold text-slate-800 truncate">
              {pageTitles[pathname] ?? 'Panel'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="relative p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="h-5 w-px bg-slate-100 mx-1" />
            <div className="flex items-center gap-3 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-emerald-500/20">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="hidden xl:block">
                <div className="text-sm font-bold text-slate-800 leading-tight">{user.firstName} {user.lastName}</div>
                <div className="text-[11px] text-slate-400 font-semibold">{roleLabels[user.role]}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-slate-900">EcoRutas</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-50 text-slate-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 bg-slate-50/30">
          <div className="max-w-[1400px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

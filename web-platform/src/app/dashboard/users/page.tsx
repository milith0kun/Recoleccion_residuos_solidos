'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo } from 'react';
import { Search, Filter, UserPlus, MoreHorizontal, UserCheck, UserX, MapPin, Users, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  dni: string;
  role: string;
  phone?: string;
  isActive: boolean;
  zone?: { name: string; district: string; _id: string };
  createdAt: string;
}

const roleBadge: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: 'text-rose-600', bg: 'bg-rose-50' },
  operator: { label: 'Operador', color: 'text-amber-600', bg: 'bg-amber-50' },
  citizen: { label: 'Ciudadano', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export default function UsersPage() {
  const { apiFetch } = useApi();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<UserData> & { password?: string }>({
    firstName: '',
    lastName: '',
    email: '',
    dni: '',
    role: 'citizen',
    phone: '',
    password: ''
  });

  const load = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const data = await apiFetch(`/api/v1/users?${params}`);
      setUsers(data.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [apiFetch, search, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      operator: users.filter(u => u.role === 'operator').length,
      citizen: users.filter(u => u.role === 'citizen').length,
    };
  }, [users]);

  const handleOpenModal = (user?: UserData) => {
    if (user) {
      setEditingId(user._id);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        dni: user.dni,
        role: user.role,
        phone: user.phone || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        dni: '',
        role: 'citizen',
        phone: '',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.password && editingId) {
        delete payload.password;
      }

      if (editingId) {
        await apiFetch(`/api/v1/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success('Usuario actualizado exitosamente');
      } else {
        await apiFetch('/api/v1/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Usuario creado exitosamente');
      }
      handleCloseModal();
      load();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (confirm(`¿Está seguro de que desea ${currentStatus ? 'desactivar' : 'activar'} este usuario?`)) {
      try {
        await apiFetch(`/api/v1/users/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !currentStatus }),
        });
        toast.success(`Usuario ${currentStatus ? 'desactivado' : 'activado'} exitosamente`);
        load();
      } catch (error: any) {
        toast.error(error.message || 'Error al cambiar estado del usuario');
      }
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">Administra ciudadanos, operadores y administradores del sistema.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-600/20 active:scale-95">
          <UserPlus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Quick Stats Mini-grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Admins', value: stats.admin, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Operadores', value: stats.operator, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Ciudadanos', value: stats.citizen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-3xl ${s.bg} border border-slate-100 flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
            <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-5">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-sm font-bold text-slate-700 focus:bg-white focus:border-emerald-500/20 transition-all placeholder:text-slate-300"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-12 pr-10 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-xs font-black text-slate-600 focus:bg-white focus:border-emerald-500/20 appearance-none transition-all cursor-pointer uppercase tracking-widest"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="operator">Operadores</option>
              <option value="citizen">Ciudadanos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Usuarios...</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Usuario', 'Identificación', 'Rol', 'Zona Asignada', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u, idx) => (
                  <tr 
                    key={u._id} 
                    className="hover:bg-slate-50/50 transition-all duration-300 group"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm border border-white shadow-sm transition-transform group-hover:scale-110">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <div className="text-[15px] font-black text-slate-900 leading-none tracking-tight">{u.firstName} {u.lastName}</div>
                          <div className="text-xs font-bold text-slate-400 mt-1.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                         <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">DNI</span>
                         <span className="text-sm font-bold text-slate-700">{u.dni}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${roleBadge[u.role]?.bg} ${roleBadge[u.role]?.color} border-current opacity-80`}>
                        {roleBadge[u.role]?.label}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {u.zone ? (
                        <div className="flex items-center gap-2 group/zone">
                          <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover/zone:bg-emerald-50 group-hover/zone:text-emerald-500 transition-colors">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-700 block leading-none">{u.zone.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 block">{u.zone.district}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 italic">
                          <div className="w-8 h-8 rounded-full border border-dashed border-slate-200 flex items-center justify-center">
                             <MoreHorizontal className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold">Sin zona</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border ${u.isActive ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{u.isActive ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenModal(u)} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(u._id, u.isActive)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${u.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                          {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-32">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200">
                          <Users className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin resultados encontrados</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total registros: {users.length}</p>
          <div className="flex gap-3">
            <button className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all" disabled>Anterior</button>
            <button className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-all" disabled>Siguiente</button>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? 'Editar Usuario' : 'Añadir Usuario'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
              <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Apellido</label>
              <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">DNI</label>
            <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.dni || ''} onChange={e => setFormData({...formData, dni: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
            <input required type="email" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
            <input type="tel" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Rol</label>
            <select required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.role || 'citizen'} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="citizen">Ciudadano</option>
              <option value="operator">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {!editingId && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
              <input required={!editingId} type="password" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={handleCloseModal} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
            <button type="submit" className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">{editingId ? 'Guardar Cambios' : 'Crear Usuario'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

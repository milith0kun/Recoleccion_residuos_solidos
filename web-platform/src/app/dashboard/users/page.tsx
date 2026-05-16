'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  UserCheck,
  UserX,
  MapPin,
  Users,
  Edit2,
  Layers,
  Compass,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

interface ZoneRef {
  _id: string;
  name: string;
  color?: string;
  district?: string;
}

interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  dni: string;
  role: 'admin' | 'operator' | 'citizen';
  phone?: string;
  address?: string;
  isActive: boolean;
  zone?: ZoneRef | null;
  createdAt: string;
}

interface ZoneOption {
  _id: string;
  name: string;
  color: string;
  district: string;
  isActive: boolean;
}

const roleBadge: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  admin: {
    label: 'Admin',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
  operator: {
    label: 'Operador',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  citizen: {
    label: 'Ciudadano',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
};

interface CreateForm {
  firstName: string;
  lastName: string;
  email: string;
  dni: string;
  phone: string;
  address: string;
  password: string;
  role: 'operator' | 'admin';
}

interface EditForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  role: 'citizen' | 'operator' | 'admin';
  isActive: boolean;
}

const emptyCreate: CreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  dni: '',
  phone: '',
  address: '',
  password: '',
  role: 'operator',
};

export default function UsersPage() {
  const { apiFetch } = useApi();
  const [users, setUsers] = useState<UserData[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneTargetUser, setZoneTargetUser] = useState<UserData | null>(null);
  const [zoneSelection, setZoneSelection] = useState<string>('');
  const [zoneSubmitting, setZoneSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (zoneFilter) params.set('zone', zoneFilter);
      params.set('limit', '100');
      const data = await apiFetch(`/api/v1/users?${params.toString()}`);
      setUsers(data.data.users ?? []);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, roleFilter, zoneFilter]);

  const loadZones = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/zones');
      const list: ZoneOption[] = (data.data ?? []).map((z: ZoneOption) => ({
        _id: z._id,
        name: z.name,
        color: z.color,
        district: z.district,
        isActive: z.isActive,
      }));
      setZones(list);
    } catch (err) {
      console.error(err);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const stats = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      operator: users.filter((u) => u.role === 'operator').length,
      citizen: users.filter((u) => u.role === 'citizen').length,
    }),
    [users]
  );

  const openCreate = () => {
    setCreateForm(emptyCreate);
    setCreateOpen(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createSubmitting) return;
    setCreateSubmitting(true);
    try {
      await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast.success('Operador creado exitosamente');
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo crear el operador');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEdit = (u: UserData) => {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone ?? '',
      address: u.address ?? '',
      role: u.role,
      isActive: u.isActive,
    });
    setEditOpen(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editForm || editSubmitting) return;
    setEditSubmitting(true);
    try {
      await apiFetch(`/api/v1/users/${editingUser._id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      toast.success('Usuario actualizado');
      setEditOpen(false);
      setEditingUser(null);
      load();
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo actualizar');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openZoneModal = (u: UserData) => {
    setZoneTargetUser(u);
    setZoneSelection(u.zone?._id ?? '');
    setZoneModalOpen(true);
  };

  const submitZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneTargetUser || zoneSubmitting) return;
    setZoneSubmitting(true);
    try {
      await apiFetch(`/api/v1/users/${zoneTargetUser._id}/zone`, {
        method: 'PATCH',
        body: JSON.stringify({ zoneId: zoneSelection || null }),
      });
      toast.success(zoneSelection ? 'Zona asignada' : 'Zona desasignada');
      setZoneModalOpen(false);
      setZoneTargetUser(null);
      load();
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo asignar la zona');
    } finally {
      setZoneSubmitting(false);
    }
  };

  const handleToggleActive = async (u: UserData) => {
    if (
      !confirm(
        `¿Deseas ${u.isActive ? 'desactivar' : 'activar'} a ${u.firstName} ${u.lastName}?`
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/api/v1/users/${u._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (err) {
      toast.error((err as Error).message || 'No se pudo cambiar el estado');
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Gestión de Usuarios
          </h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">
            Administra ciudadanos, operadores y administradores del sistema.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          <span>Nuevo Operador</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Admins', value: stats.admin, color: 'text-rose-600', bg: 'bg-rose-50' },
          {
            label: 'Operadores',
            value: stats.operator,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Ciudadanos',
            value: stats.citizen,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`p-4 rounded-3xl ${s.bg} border border-slate-100 flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}
          >
            <span className={`text-2xl font-black ${s.color}`}>{s.value}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {s.label}
            </span>
          </div>
        ))}
      </div>

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
        <div className="flex flex-wrap gap-4">
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
          <div className="relative">
            <Layers className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="pl-12 pr-10 py-4 rounded-2xl bg-slate-50 border-2 border-transparent text-xs font-black text-slate-600 focus:bg-white focus:border-emerald-500/20 appearance-none transition-all cursor-pointer uppercase tracking-widest"
            >
              <option value="">Todas las zonas</option>
              {zones.map((z) => (
                <option key={z._id} value={z._id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                Sincronizando Usuarios...
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Usuario', 'Identificación', 'Rol', 'Zona Asignada', 'Estado', 'Acciones'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-8 py-6 text-left text-[11px] font-black uppercase tracking-widest text-slate-400"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => {
                  const badge = roleBadge[u.role] ?? roleBadge.citizen;
                  return (
                    <tr
                      key={u._id}
                      className="hover:bg-slate-50/50 transition-all duration-300 group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm border border-white shadow-sm transition-transform group-hover:scale-110">
                            {u.firstName?.[0]}
                            {u.lastName?.[0]}
                          </div>
                          <div>
                            <div className="text-[15px] font-black text-slate-900 leading-none tracking-tight">
                              {u.firstName} {u.lastName}
                            </div>
                            <div className="text-xs font-bold text-slate-400 mt-1.5">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            DNI
                          </span>
                          <span className="text-sm font-bold text-slate-700 tabular-nums">
                            {u.dni}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span
                          className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge.bg} ${badge.color} ${badge.border}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {u.zone ? (
                          <button
                            onClick={() => openZoneModal(u)}
                            className="flex items-center gap-2 group/zone hover:opacity-80 transition"
                          >
                            <span
                              className="w-3 h-3 rounded-full shadow-[0_0_8px] transition-transform group-hover/zone:scale-125"
                              style={{
                                background: u.zone.color || '#10B981',
                                color: u.zone.color || '#10B981',
                              }}
                            />
                            <div className="text-left">
                              <span className="text-sm font-bold text-slate-700 block leading-none">
                                {u.zone.name}
                              </span>
                              {u.zone.district && (
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1 block">
                                  {u.zone.district}
                                </span>
                              )}
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() => openZoneModal(u)}
                            className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 transition group/none"
                          >
                            <div className="w-8 h-8 rounded-full border border-dashed border-slate-200 flex items-center justify-center group-hover/none:border-emerald-300">
                              <Compass className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold italic">Asignar zona</span>
                          </button>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border ${
                            u.isActive
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : 'bg-rose-50 border-rose-100 text-rose-500'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
                            }`}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            title="Editar"
                            className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openZoneModal(u)}
                            title="Asignar zona"
                            className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            title={u.isActive ? 'Desactivar' : 'Activar'}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              u.isActive
                                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {u.isActive ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-32">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200">
                          <Users className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                          Sin resultados encontrados
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Total registros: {users.length}
          </p>
        </div>
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear Operador"
      >
        <form onSubmit={submitCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Nombre</label>
              <input
                required
                value={createForm.firstName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label>Apellido</label>
              <input
                required
                value={createForm.lastName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>DNI</label>
              <input
                required
                value={createForm.dni}
                onChange={(e) => setCreateForm({ ...createForm, dni: e.target.value })}
              />
            </div>
            <div>
              <label>Teléfono</label>
              <input
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm({ ...createForm, phone: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label>Email</label>
            <input
              required
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
          </div>
          <div>
            <label>Dirección</label>
            <input
              required
              value={createForm.address}
              onChange={(e) =>
                setCreateForm({ ...createForm, address: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Contraseña</label>
              <input
                required
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />
            </div>
            <div>
              <label>Rol</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value as 'operator' | 'admin',
                  })
                }
              >
                <option value="operator">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
            >
              {createSubmitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Editar Usuario">
        {editForm && editingUser && (
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Nombre</label>
                <input
                  required
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Apellido</label>
                <input
                  required
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label>Teléfono</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label>Dirección</label>
              <input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      role: e.target.value as EditForm['role'],
                    })
                  }
                >
                  <option value="citizen">Ciudadano</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label>Estado</label>
                <select
                  value={editForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.value === 'active' })
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        title="Reasignar Zona"
      >
        {zoneTargetUser && (
          <form onSubmit={submitZone} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Usuario
              </p>
              <p className="text-sm font-bold text-slate-700 mt-1">
                {zoneTargetUser.firstName} {zoneTargetUser.lastName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{zoneTargetUser.email}</p>
            </div>
            <div>
              <label>Zona activa</label>
              <select
                value={zoneSelection}
                onChange={(e) => setZoneSelection(e.target.value)}
              >
                <option value="">— Sin zona —</option>
                {zones
                  .filter((z) => z.isActive)
                  .map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.name} ({z.district})
                    </option>
                  ))}
              </select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setZoneModalOpen(false)}
                className="px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={zoneSubmitting}
                className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                {zoneSubmitting ? 'Asignando...' : 'Aplicar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

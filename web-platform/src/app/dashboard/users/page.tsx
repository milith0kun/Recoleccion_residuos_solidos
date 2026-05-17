'use client';

import { useApi } from '@/hooks/useApi';
import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  MapPin,
  Users,
  Edit2,
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

  const fetchUsers = useCallback(async (): Promise<UserData[]> => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (zoneFilter) params.set('zone', zoneFilter);
    params.set('limit', '100');
    const data = await apiFetch(`/api/v1/users?${params.toString()}`);
    return data.data.users ?? [];
  }, [apiFetch, search, roleFilter, zoneFilter]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await fetchUsers();
      setUsers(list);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [fetchUsers]);

  const fetchZones = useCallback(async (): Promise<ZoneOption[]> => {
    const data = await apiFetch('/api/v1/zones');
    return (data.data ?? []).map((z: ZoneOption) => ({
      _id: z._id,
      name: z.name,
      color: z.color,
      district: z.district,
      isActive: z.isActive,
    }));
  }, [apiFetch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) setLoading(true);
        const list = await fetchUsers();
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error('No se pudieron cargar los usuarios');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchUsers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchZones();
        if (!cancelled) setZones(list);
      } catch (err) {
        if (!cancelled) console.error(err);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchZones]);

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
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      };
      await apiFetch(`/api/v1/users/${editingUser._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
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
    <div className="up animate-fade-in">
      <style>{upStyles}</style>

      <header className="up-header">
        <div>
          <h1 className="up-title">Usuarios</h1>
          <p className="up-sub">
            Administra ciudadanos, operadores y administradores del sistema.
          </p>
        </div>
        <div className="up-header-actions">
          <button onClick={openCreate} className="up-btn-primary">
            <UserPlus size={15} />
            <span>Invitar al proyecto</span>
          </button>
        </div>
      </header>

      <div className="up-toolbar">
        <div className="up-search">
          <Search size={14} className="up-search-icon" />
          <input
            type="text"
            placeholder="Buscar usuario"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="up-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">Todos los roles</option>
          <option value="admin">Administradores</option>
          <option value="operator">Operadores</option>
          <option value="citizen">Ciudadanos</option>
        </select>
        <select
          className="up-filter"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="">Todas las zonas</option>
          {zones.map((z) => (
            <option key={z._id} value={z._id}>
              {z.name}
            </option>
          ))}
        </select>
        <div className="up-stat-pills">
          <span className="up-stat-pill"><strong>{stats.total}</strong> total</span>
          <span className="up-stat-pill up-stat-pill--admin"><strong>{stats.admin}</strong> admin</span>
          <span className="up-stat-pill up-stat-pill--op"><strong>{stats.operator}</strong> oper.</span>
          <span className="up-stat-pill up-stat-pill--cit"><strong>{stats.citizen}</strong> ciud.</span>
        </div>
      </div>

      <div className="up-table-wrap">
        {loading ? (
          <div className="up-state">
            <span className="up-spinner" />
            <p>Cargando usuarios…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="up-state">
            <div className="up-state-icon">
              <Users size={22} />
            </div>
            <p className="up-state-title">Sin resultados</p>
            <p className="up-state-desc">No hay usuarios que coincidan con tus filtros.</p>
          </div>
        ) : (
          <table className="up-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>DNI</th>
                <th>Rol</th>
                <th>Zona</th>
                <th>Estado</th>
                <th>Creado</th>
                <th className="up-th-actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const badge = roleBadge[u.role] ?? roleBadge.citizen;
                const initials = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="up-user-cell">
                        <span className="up-user-avatar">{initials}</span>
                        <span className="up-user-name">
                          {u.firstName} {u.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="up-cell-muted">{u.email}</td>
                    <td className="up-cell-mono">{u.dni || '—'}</td>
                    <td>
                      <span className={`up-role-pill up-role-pill--${u.role}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      {u.zone ? (
                        <button
                          onClick={() => openZoneModal(u)}
                          className="up-zone-btn"
                          title={u.zone.district || u.zone.name}
                        >
                          <span
                            className="up-zone-dot"
                            style={{ background: u.zone.color || '#00684A' }}
                          />
                          <span>{u.zone.name}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => openZoneModal(u)}
                          className="up-zone-btn up-zone-btn--empty"
                        >
                          <Compass size={13} />
                          <span>Asignar</span>
                        </button>
                      )}
                    </td>
                    <td>
                      <span
                        className={`up-status ${
                          u.isActive ? 'up-status--active' : 'up-status--inactive'
                        }`}
                      >
                        <span className="up-status-dot" />
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="up-cell-muted up-cell-mono">
                      {new Date(u.createdAt).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="up-td-actions">
                      <div className="up-actions">
                        <button
                          onClick={() => openEdit(u)}
                          title="Editar"
                          className="up-icon-btn"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => openZoneModal(u)}
                          title="Asignar zona"
                          className="up-icon-btn"
                        >
                          <MapPin size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.isActive ? 'Desactivar' : 'Activar'}
                          className={`up-icon-btn ${
                            !u.isActive ? 'up-icon-btn--success' : ''
                          }`}
                        >
                          {u.isActive ? (
                            <UserX size={14} />
                          ) : (
                            <UserCheck size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="up-table-foot">
          {users.length} usuario{users.length !== 1 ? 's' : ''}
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

const upStyles = `
  .up { display: flex; flex-direction: column; gap: 20px; }

  .up-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .up-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: clamp(28px, 4vw, 36px);
    font-weight: 500;
    color: #001E2B;
    letter-spacing: -0.018em;
    line-height: 1.1;
    font-variation-settings: "opsz" 36;
  }
  .up-sub {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 14px;
    color: #5C6C75;
    margin-top: 6px;
  }
  .up-header-actions { display: flex; gap: 8px; }
  .up-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    background: #00684A;
    color: #FFFFFF;
    border: 1px solid #00684A;
    border-radius: 6px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .up-btn-primary:hover { background: #00513A; border-color: #00513A; }

  /* Toolbar */
  .up-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .up-search {
    position: relative;
    flex: 1;
    min-width: 220px;
    max-width: 320px;
  }
  .up-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #889397;
  }
  .up-search input {
    width: 100%;
    padding: 8px 12px 8px 34px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 6px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13.5px;
    color: #001E2B;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .up-search input::placeholder { color: #889397; }
  .up-search input:focus {
    border-color: #00684A;
    box-shadow: 0 0 0 3px rgba(0,104,74,0.12);
  }
  .up-filter {
    padding: 8px 12px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 6px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 13px;
    color: #001E2B;
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .up-filter:focus {
    outline: none;
    border-color: #00684A;
    box-shadow: 0 0 0 3px rgba(0,104,74,0.12);
  }
  .up-stat-pills {
    display: flex;
    gap: 6px;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .up-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    background: #F4F6F4;
    color: #5C6C75;
    border-radius: 999px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 500;
  }
  .up-stat-pill strong { color: #001E2B; font-weight: 700; }
  .up-stat-pill--admin { background: #FCE9E9; color: #8B3030; }
  .up-stat-pill--admin strong { color: #6B2424; }
  .up-stat-pill--op { background: #FFF5D6; color: #8C6300; }
  .up-stat-pill--op strong { color: #6E4D00; }
  .up-stat-pill--cit { background: #E3FCEF; color: #00513A; }
  .up-stat-pill--cit strong { color: #003A29; }

  /* Table */
  .up-table-wrap {
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 8px;
    overflow: hidden;
  }
  .up-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .up-table thead tr {
    background: #F9FBFA;
    border-bottom: 1px solid #E8EDEB;
  }
  .up-table th {
    padding: 10px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #5C6C75;
  }
  .up-th-actions { width: 132px; }
  .up-table tbody tr {
    border-bottom: 1px solid #F0F2F0;
    transition: background 0.12s ease;
  }
  .up-table tbody tr:last-child { border-bottom: none; }
  .up-table tbody tr:hover { background: #F9FBFA; }
  .up-table td {
    padding: 12px 16px;
    font-size: 13.5px;
    color: #001E2B;
    vertical-align: middle;
  }
  .up-cell-muted { color: #5C6C75; }
  .up-cell-mono {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 12.5px;
  }
  .up-td-actions { text-align: right; }

  .up-user-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .up-user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    background: #E8EDEB;
    color: #001E2B;
    border: 1px solid #DCE2E0;
    display: grid;
    place-items: center;
    font-size: 11.5px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .up-user-name {
    font-weight: 600;
    color: #001E2B;
  }

  .up-role-pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0;
  }
  .up-role-pill--admin { background: #FCE9E9; color: #8B3030; }
  .up-role-pill--operator { background: #FFF5D6; color: #8C6300; }
  .up-role-pill--citizen { background: #E3FCEF; color: #00513A; }

  .up-zone-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: #001E2B;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease;
  }
  .up-zone-btn:hover {
    background: #F4F6F4;
    border-color: #E8EDEB;
  }
  .up-zone-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .up-zone-btn--empty {
    color: #889397;
    border-style: dashed;
    border-color: #DCE2E0;
  }

  .up-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .up-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
  .up-status--active { background: #E3FCEF; color: #00513A; }
  .up-status--inactive { background: #F4F6F4; color: #5C6C75; }

  .up-actions {
    display: inline-flex;
    gap: 4px;
    justify-content: flex-end;
  }
  .up-icon-btn {
    width: 30px;
    height: 30px;
    border: 1px solid #E8EDEB;
    background: #FFFFFF;
    color: #5C6C75;
    border-radius: 6px;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }
  .up-icon-btn:hover {
    background: #F4F6F4;
    border-color: #DCE2E0;
    color: #001E2B;
  }
  .up-icon-btn--success:hover {
    background: #E3FCEF;
    border-color: #C1F1D6;
    color: #00513A;
  }

  .up-table-foot {
    padding: 10px 16px;
    background: #F9FBFA;
    border-top: 1px solid #E8EDEB;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12px;
    color: #5C6C75;
  }

  .up-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 60px 24px;
    text-align: center;
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .up-state-icon {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: #F4F6F4;
    color: #5C6C75;
    display: grid;
    place-items: center;
    margin-bottom: 6px;
  }
  .up-state-title {
    font-size: 14px;
    font-weight: 700;
    color: #001E2B;
    margin: 0;
  }
  .up-state-desc {
    font-size: 12.5px;
    color: #5C6C75;
    margin: 0;
  }
  .up-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid #E8EDEB;
    border-top-color: #00684A;
    border-radius: 50%;
    animation: up-spin 0.8s linear infinite;
  }
  @keyframes up-spin { to { transform: rotate(360deg); } }
`;

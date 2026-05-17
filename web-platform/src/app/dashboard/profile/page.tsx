'use client';

import { useEffect, useState } from 'react';
import { useAuth, type User } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import {
  User as UserIcon,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  IdCard,
  Phone,
} from 'lucide-react';

interface Zone {
  _id: string;
  name: string;
  district?: string;
}

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  citizen: 'Ciudadano',
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { apiFetch } = useApi();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setDni(user.dni || '');
    const currentZone =
      typeof user.zone === 'string' ? user.zone : user.zone?._id ?? '';
    setZoneId(currentZone);
  }, [user]);

  useEffect(() => {
    apiFetch('/api/v1/zones')
      .then((res) => setZones((res.data as Zone[]) || []))
      .catch(() => setZones([]));
  }, [apiFetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (dni && !/^\d{8}$/.test(dni)) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        dni: dni.trim() || null,
        zone: zoneId || null,
      };
      const res = await apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const updated = res.data as Record<string, unknown>;
      const nextUser: User = {
        ...(user as User),
        id: (updated._id as string) ?? user!.id,
        _id: updated._id as string,
        firstName: updated.firstName as string,
        lastName: updated.lastName as string,
        email: updated.email as string,
        role: updated.role as User['role'],
        dni: updated.dni as string | undefined,
        phone: updated.phone as string | undefined,
        zone: updated.zone as User['zone'],
        avatar: updated.avatar as string | undefined,
        profileComplete: updated.profileComplete as boolean | undefined,
      };
      setUser(nextUser);
      setSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setError((err as Error).message || 'No se pudieron guardar los cambios.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const initials =
    `${(firstName || user.firstName || '?')[0] ?? ''}${(lastName || user.lastName || '')[0] ?? ''}`.toUpperCase();
  const fullName =
    `${firstName || user.firstName} ${lastName || user.lastName}`.trim() || user.email;
  const currentZoneName =
    zones.find((z) => z._id === zoneId)?.name ?? 'Sin asignar';

  return (
    <div className="adm-page animate-fade-in">
      <style>{pageStyles}</style>

      <header className="adm-header">
        <div>
          <h1 className="adm-title">
            Tu <em style={{ color: '#00684A', fontStyle: 'italic', fontWeight: 500 }}>perfil</em>.
          </h1>
          <p className="adm-sub">
            Actualizá tus datos personales y la zona donde operás.
          </p>
        </div>
        <div className="adm-header-actions">
          <span className="adm-stat-pill adm-stat-pill--green">
            <ShieldCheck size={12} />
            <strong>{roleLabel[user.role] ?? user.role}</strong>
          </span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="prf-form">
        <div className="prf-grid">
          {/* ─── Columna principal: 3 secciones diferenciadas ─── */}
          <div className="prf-main">
            {/* Identidad */}
            <section className="adm-section">
              <div className="adm-section-header" style={{ marginBottom: 12 }}>
                <div className="adm-section-title-with-icon">
                  <span className="adm-tile-icon adm-tile-icon--sm">
                    <UserIcon size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="adm-section-title">Identidad</h2>
                    <p className="adm-section-sub">
                      Cómo te identificás dentro del sistema.
                    </p>
                  </div>
                </div>
              </div>
              <div className="adm-form-grid">
                <div className="adm-form-field">
                  <label className="adm-form-label">Nombre</label>
                  <input
                    className="adm-form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="adm-form-field">
                  <label className="adm-form-label">Apellido</label>
                  <input
                    className="adm-form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div className="adm-form-field adm-form-field--full">
                  <label className="adm-form-label">DNI</label>
                  <input
                    className="adm-form-input"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="8 dígitos (opcional)"
                  />
                  <span className="adm-form-hint">
                    Usá tu DNI peruano sin guiones ni espacios.
                  </span>
                </div>
              </div>
            </section>

            {/* Contacto */}
            <section className="adm-section">
              <div className="adm-section-header" style={{ marginBottom: 12 }}>
                <div className="adm-section-title-with-icon">
                  <span className="adm-tile-icon adm-tile-icon--sm">
                    <Mail size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="adm-section-title">Contacto</h2>
                    <p className="adm-section-sub">
                      Por dónde te contactamos para notificaciones y soporte.
                    </p>
                  </div>
                </div>
              </div>
              <div className="adm-form-grid">
                <div className="adm-form-field adm-form-field--full">
                  <label className="adm-form-label">Correo</label>
                  <input
                    className="adm-form-input"
                    value={user.email}
                    disabled
                  />
                  <span className="adm-form-hint">
                    Vinculado a tu cuenta · no se puede modificar.
                  </span>
                </div>
                <div className="adm-form-field adm-form-field--full">
                  <label className="adm-form-label">Teléfono</label>
                  <input
                    className="adm-form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="numeric"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </section>

            {/* Asignación */}
            <section className="adm-section">
              <div className="adm-section-header" style={{ marginBottom: 12 }}>
                <div className="adm-section-title-with-icon">
                  <span className="adm-tile-icon adm-tile-icon--sm">
                    <MapPin size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <h2 className="adm-section-title">Asignación</h2>
                    <p className="adm-section-sub">
                      Rol y zona operativa definidos por administración.
                    </p>
                  </div>
                </div>
              </div>
              <div className="adm-form-grid">
                <div className="adm-form-field">
                  <label className="adm-form-label">Rol</label>
                  <input
                    className="adm-form-input"
                    value={roleLabel[user.role] ?? user.role}
                    disabled
                  />
                </div>
                <div className="adm-form-field">
                  <label className="adm-form-label">Zona</label>
                  <select
                    className="adm-form-select"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                  >
                    <option value="">— Sin asignar —</option>
                    {zones.map((z) => (
                      <option key={z._id} value={z._id}>
                        {z.name}
                        {z.district ? ` · ${z.district}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>

          {/* ─── Aside: resumen + estado ─── */}
          <aside className="prf-aside">
            <section className="adm-section prf-summary">
              <div className="prf-avatar">{initials || '—'}</div>
              <div className="prf-summary-name">{fullName}</div>
              <span className="prf-summary-role">
                <ShieldCheck size={11} />
                {roleLabel[user.role] ?? user.role}
              </span>

              <div className="prf-summary-divider" />

              <div className="prf-summary-row">
                <Mail size={13} className="prf-summary-row-icon" />
                <div className="prf-summary-row-body">
                  <span className="prf-summary-row-label">Correo</span>
                  <span className="prf-summary-row-value" title={user.email}>
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="prf-summary-row">
                <IdCard size={13} className="prf-summary-row-icon" />
                <div className="prf-summary-row-body">
                  <span className="prf-summary-row-label">DNI</span>
                  <span className="prf-summary-row-value">
                    {dni || '—'}
                  </span>
                </div>
              </div>
              <div className="prf-summary-row">
                <Phone size={13} className="prf-summary-row-icon" />
                <div className="prf-summary-row-body">
                  <span className="prf-summary-row-label">Teléfono</span>
                  <span className="prf-summary-row-value">
                    {phone || '—'}
                  </span>
                </div>
              </div>
              <div className="prf-summary-row">
                <MapPin size={13} className="prf-summary-row-icon" />
                <div className="prf-summary-row-body">
                  <span className="prf-summary-row-label">Zona</span>
                  <span className="prf-summary-row-value">
                    {currentZoneName}
                  </span>
                </div>
              </div>
            </section>

            <div className="adm-system-status" style={{ paddingLeft: 4 }}>
              <span className="adm-system-status-dot" />
              <span>
                Sesión: <strong>verificada</strong>
              </span>
            </div>
          </aside>
        </div>

        {/* Footer fijo con acciones + alertas */}
        <div className="prf-footer">
          <div className="prf-footer-msg">
            {error && (
              <div className="adm-alert adm-alert--error">{error}</div>
            )}
            {success && !error && (
              <div className="adm-alert adm-alert--success">{success}</div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="adm-btn-primary"
          >
            <Save size={14} strokeWidth={2} />
            <span>{loading ? 'Guardando…' : 'Guardar cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

const pageStyles = `
  .prf-form { display: flex; flex-direction: column; gap: 14px; }

  .prf-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 1024px) {
    .prf-grid { grid-template-columns: minmax(0, 1fr) 300px; }
  }

  .prf-main {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .prf-aside {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Summary card */
  .prf-summary {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 20px 20px 18px;
  }
  .prf-avatar {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    background: #DBF5E5;
    color: #00513A;
    border: 1px solid #A7E0BD;
    display: grid;
    place-items: center;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
    box-shadow: 0 1px 0 rgba(0, 104, 74, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.55);
    margin-bottom: 12px;
  }
  .prf-summary-name {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 19px;
    font-weight: 500;
    color: #001E2B;
    letter-spacing: -0.015em;
    line-height: 1.15;
    font-variation-settings: "opsz" 36;
  }
  .prf-summary-role {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 10.5px;
    font-weight: 700;
    color: #00684A;
    background: #E3FCEF;
    padding: 3px 8px;
    border-radius: 999px;
    align-self: flex-start;
    margin-top: 6px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .prf-summary-divider {
    height: 1px;
    background: #ECEEEB;
    margin: 14px -20px;
  }
  .prf-summary-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 5px 0;
  }
  .prf-summary-row-icon {
    color: #889397;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .prf-summary-row-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .prf-summary-row-label {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: #889397;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .prf-summary-row-value {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12.5px;
    font-weight: 500;
    color: #001E2B;
    margin-top: 1px;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  /* Sticky footer with save + alerts */
  .prf-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 16px;
    background: #FFFFFF;
    border: 1px solid #E8EDEB;
    border-radius: 10px;
    position: sticky;
    bottom: 14px;
    z-index: 5;
    box-shadow: 0 6px 22px -10px rgba(0, 30, 43, 0.12);
  }
  .prf-footer-msg { flex: 1; min-width: 0; }
  .prf-footer-msg:empty { display: none; }
  .prf-footer-msg .adm-alert {
    margin-top: 0;
    padding: 6px 10px;
    font-size: 12px;
  }
  @media (max-width: 640px) {
    .prf-footer { flex-direction: column; align-items: stretch; }
    .prf-footer .adm-btn-primary { justify-content: center; }
  }
`;

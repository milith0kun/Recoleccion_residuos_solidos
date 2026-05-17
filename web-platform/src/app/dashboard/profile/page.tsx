'use client';

import { useEffect, useState } from 'react';
import { useAuth, type User } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { User as UserIcon, Save } from 'lucide-react';

interface Zone {
  _id: string;
  name: string;
  district?: string;
}

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
      setError('El DNI debe tener exactamente 8 dígitos');
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
      setSuccess('Perfil actualizado correctamente');
    } catch (err) {
      setError((err as Error).message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="profile-root">
      <style>{styles}</style>

      <div className="profile-header">
        <div className="profile-icon">
          <UserIcon style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="profile-title">Mi Perfil</h1>
          <p className="profile-subtitle">Gestioná tus datos personales</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-card">
        <div className="profile-grid">
          <div className="profile-field">
            <label>Correo</label>
            <input value={user.email} disabled className="profile-input profile-input--disabled" />
            <span className="profile-hint">No se puede modificar</span>
          </div>

          <div className="profile-field">
            <label>Rol</label>
            <input value={user.role} disabled className="profile-input profile-input--disabled" />
            <span className="profile-hint">Asignado por administración</span>
          </div>

          <div className="profile-field">
            <label>Nombre</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="profile-input"
              required
            />
          </div>

          <div className="profile-field">
            <label>Apellido</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="profile-input"
              required
            />
          </div>

          <div className="profile-field">
            <label>Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="profile-input"
              inputMode="numeric"
              placeholder="Opcional"
            />
          </div>

          <div className="profile-field">
            <label>DNI</label>
            <input
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="profile-input"
              inputMode="numeric"
              maxLength={8}
              placeholder="8 dígitos (opcional)"
            />
          </div>

          <div className="profile-field profile-field--full">
            <label>Zona</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="profile-input"
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

        {error && <div className="profile-msg profile-msg--error">{error}</div>}
        {success && <div className="profile-msg profile-msg--ok">{success}</div>}

        <div className="profile-actions">
          <button type="submit" disabled={loading} className="profile-btn">
            <Save style={{ width: 16, height: 16 }} />
            <span>{loading ? 'Guardando…' : 'Guardar cambios'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = `
  .profile-root { max-width: 760px; }

  .profile-header {
    display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.75rem;
  }
  .profile-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(135deg, #059669, #047857);
    color: #FFFFFF; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 6px 14px rgba(5,150,105,0.22);
  }
  .profile-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
  .profile-subtitle { font-size: 0.85rem; color: #8A8780; margin-top: 2px; }

  .profile-card {
    background: #FFFFFF; border: 1px solid #F0EEEB; border-radius: 16px;
    padding: 1.75rem; box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  }

  .profile-grid {
    display: grid; grid-template-columns: 1fr; gap: 1.1rem;
  }
  @media (min-width: 640px) {
    .profile-grid { grid-template-columns: 1fr 1fr; }
  }
  .profile-field--full { grid-column: 1 / -1; }

  .profile-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .profile-field label {
    font-size: 0.7rem; font-weight: 700; color: #6B6862;
    text-transform: uppercase; letter-spacing: 0.08em;
  }
  .profile-input {
    width: 100%; padding: 0.7rem 0.9rem; border-radius: 10px;
    border: 1.5px solid #ECEAE6; background: #FAFAF8; color: #1A1A1A;
    font-family: inherit; font-size: 0.88rem; font-weight: 500;
    outline: none; transition: border-color 0.2s ease, background 0.2s ease;
  }
  .profile-input:focus {
    border-color: #059669; background: #FFFFFF;
    box-shadow: 0 0 0 4px rgba(5,150,105,0.08);
  }
  .profile-input--disabled { background: #F7F6F4; color: #8A8780; cursor: not-allowed; }
  .profile-hint { font-size: 0.7rem; color: #B0ADA8; }

  .profile-msg {
    margin-top: 1rem; padding: 0.7rem 0.95rem; border-radius: 10px;
    font-size: 0.82rem; font-weight: 600;
  }
  .profile-msg--error { background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; }
  .profile-msg--ok { background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; }

  .profile-actions { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
  .profile-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1.4rem; border-radius: 10px; border: none;
    background: #059669; color: #FFFFFF;
    font-family: inherit; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.02em;
    cursor: pointer; transition: background 0.2s ease, transform 0.15s ease;
    box-shadow: 0 4px 12px rgba(5,150,105,0.22);
  }
  .profile-btn:hover:not(:disabled) {
    background: #047857; transform: translateY(-1px);
  }
  .profile-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`;

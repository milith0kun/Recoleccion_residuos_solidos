'use client';

import { useEffect, useState } from 'react';
import { useAuth, type User } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { Save } from 'lucide-react';
import { Card, Button, Input, PageHeader } from '@/components/ui';

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
    const currentZone = typeof user.zone === 'string' ? user.zone : user.zone?._id ?? '';
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
      setSuccess('Tus datos se actualizaron correctamente.');
    } catch (err) {
      setError((err as Error).message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Mi perfil"
        subtitle="Gestioná tu información personal y tu zona de operación."
      />

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="profile-grid">
            <Input
              label="Correo institucional"
              value={user.email}
              disabled
              hint="El correo no se puede modificar."
            />
            <Input
              label="Rol asignado"
              value={user.role}
              disabled
              hint="Asignado por administración."
            />
            <Input
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              label="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
              placeholder="Opcional"
            />
            <Input
              label="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              inputMode="numeric"
              maxLength={8}
              placeholder="8 dígitos (opcional)"
            />
            <div className="profile-field-full ui-field">
              <label className="ui-label" htmlFor="zone-select">Zona asignada</label>
              <select
                id="zone-select"
                className="ui-input"
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

          {error ? <div className="ui-error" style={{ marginTop: 18 }}>{error}</div> : null}
          {success ? (
            <div
              className="ui-error"
              style={{
                marginTop: 18,
                background: 'var(--color-green-100)',
                color: 'var(--color-green-700)',
                borderColor: 'rgba(0,104,74,0.25)',
              }}
            >
              {success}
            </div>
          ) : null}

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" loading={loading} leadingIcon={<Save size={15} />}>
              Guardar cambios
            </Button>
          </div>
        </Card>
      </form>

      <style>{`
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        @media (min-width: 640px) {
          .profile-grid { grid-template-columns: 1fr 1fr; }
        }
        .profile-field-full { grid-column: 1 / -1; }
      `}</style>
    </>
  );
}

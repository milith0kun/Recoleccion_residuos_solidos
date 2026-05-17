'use client';

import { LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, IconTile } from '@/components/ui';

export default function AccessRestricted() {
  const { user, logout } = useAuth();
  const roleLabel =
    user?.role === 'operator' ? 'Operador' : user?.role === 'citizen' ? 'Ciudadano' : 'Usuario';

  return (
    <div className="ar-root">
      <style>{styles}</style>
      <div className="ar-card animate-fade-up">
        <IconTile tone="green" size="lg">
          <Smartphone size={28} />
        </IconTile>
        <h1 className="text-h1" style={{ marginTop: 22, fontSize: 30 }}>
          Solo administradores
        </h1>
        <p className="text-body" style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>
          Hola {user?.firstName ?? 'invitado'}. Tu cuenta tiene rol <strong style={{ color: 'var(--color-text)' }}>{roleLabel}</strong>,
          por lo que no podés acceder al panel administrativo desde la web.
        </p>
        <p className="text-body" style={{ color: 'var(--color-text-muted)', marginTop: 10 }}>
          Si sos ciudadano u operador, descargá la app móvil oficial <strong style={{ color: 'var(--color-text)' }}>SRSS Cusco</strong> en
          tu celular y accedé con la misma cuenta.
        </p>
        <Button
          variant="ghost-bordered"
          onClick={logout}
          leadingIcon={<LogOut size={15} />}
          className="ar-action"
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

const styles = `
  .ar-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(700px 500px at 50% -20%, rgba(0,104,74,0.06), transparent 60%),
      var(--color-canvas);
    padding: 32px 20px;
  }
  .ar-card {
    width: 100%;
    max-width: 460px;
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: 14px;
    padding: 40px 36px;
    text-align: left;
    box-shadow: var(--shadow-md);
  }
  .ar-action { margin-top: 28px; }
`;

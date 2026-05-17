'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandMark } from '@/components/branding/BrandMark';

export default function AccessRestricted() {
  const { user, logout } = useAuth();
  const roleLabel =
    user?.role === 'operator'
      ? 'Operador'
      : user?.role === 'citizen'
        ? 'Ciudadano'
        : 'Usuario';

  return (
    <div className="ar-root">
      <style>{styles}</style>
      <div className="ar-card">
        <div className="ar-brand">
          <BrandMark size={44} />
        </div>
        <h1 className="ar-title">
          Esta plataforma es solo para{' '}
          <em
            style={{
              color: 'var(--color-atlas)',
              fontStyle: 'italic',
              fontWeight: 500,
            }}
          >
            administradores
          </em>
          .
        </h1>
        <p className="ar-desc">
          Hola {user?.firstName ?? ''}. Tu cuenta tiene rol{' '}
          <strong>{roleLabel}</strong>, por lo que no podés acceder al panel
          administrativo.
        </p>
        <p className="ar-desc">
          Para usar el sistema SRSS Cusco, descargá la app móvil oficial en tu
          celular y accedé con la misma cuenta.
        </p>
        <button onClick={logout} className="ar-logout">
          <LogOut style={{ width: 14, height: 14 }} />
          <span>Cerrar sesión</span>
        </button>
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
    background: #FFFFFF;
    padding: 32px 18px;
    font-family: 'Geist', 'Outfit', sans-serif;
    color: var(--color-ink);
  }
  .ar-card {
    width: 100%;
    max-width: 480px;
    background: #FFFFFF;
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 36px 30px;
    text-align: left;
    box-shadow: 0 1px 0 #ECF4F0, 0 12px 36px -18px rgba(0, 30, 43, 0.10);
  }
  .ar-brand {
    display: inline-flex;
    align-items: center;
    margin-bottom: 22px;
  }
  .ar-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: clamp(24px, 3.6vw, 30px);
    font-weight: 500;
    color: var(--color-ink);
    letter-spacing: -0.018em;
    line-height: 1.18;
    font-variation-settings: "opsz" 36;
    margin: 0 0 14px;
  }
  .ar-desc {
    font-size: 13.5px;
    color: var(--color-ink-muted);
    line-height: 1.6;
    margin: 0 0 12px;
    letter-spacing: -0.003em;
  }
  .ar-desc strong {
    color: var(--color-ink);
    font-weight: 600;
  }
  .ar-logout {
    margin-top: 18px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 6px;
    border: 1px solid var(--color-line);
    background: #FFFFFF;
    color: var(--color-ink-muted);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.003em;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .ar-logout:hover {
    background: #FCEEEE;
    border-color: #F5C9C9;
    color: #B23A3A;
  }
  @media (max-width: 479px) {
    .ar-card { padding: 28px 22px; }
  }
`;

'use client';

import { LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AccessRestricted() {
  const { user, logout } = useAuth();
  const roleLabel =
    user?.role === 'operator' ? 'Operador' : user?.role === 'citizen' ? 'Ciudadano' : 'Usuario';

  return (
    <div className="ar-root">
      <style>{styles}</style>
      <div className="ar-card">
        <div className="ar-icon">
          <Smartphone style={{ width: 32, height: 32 }} />
        </div>
        <h1 className="ar-title">Esta plataforma es solo para administradores</h1>
        <p className="ar-desc">
          Hola {user?.firstName ?? ''}. Tu cuenta tiene rol <strong>{roleLabel}</strong>,
          por lo que no podés acceder al panel administrativo.
        </p>
        <p className="ar-desc">
          Para usar el sistema SRSS Cusco, descargá la app móvil oficial en tu celular y
          accedé con la misma cuenta.
        </p>
        <button onClick={logout} className="ar-logout">
          <LogOut style={{ width: 16, height: 16 }} />
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
    background: #FAFAF8;
    padding: 2rem 1.25rem;
    font-family: 'Outfit', 'DM Sans', -apple-system, sans-serif;
    color: #1A1A1A;
  }
  .ar-card {
    width: 100%;
    max-width: 440px;
    background: #FFFFFF;
    border: 1px solid #F0EEEB;
    border-radius: 18px;
    padding: 2.5rem 2rem;
    text-align: center;
    box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  }
  .ar-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #059669, #047857);
    color: #FFFFFF;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    box-shadow: 0 6px 16px rgba(5,150,105,0.25);
  }
  .ar-title {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 1rem;
    line-height: 1.25;
  }
  .ar-desc {
    font-size: 0.9rem;
    color: #6B6862;
    line-height: 1.55;
    margin: 0 0 0.9rem;
  }
  .ar-desc strong {
    color: #1A1A1A;
    font-weight: 700;
  }
  .ar-logout {
    margin-top: 1.5rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.4rem;
    border-radius: 10px;
    border: 1px solid #F0EEEB;
    background: #FFFFFF;
    color: #5A5750;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
  .ar-logout:hover {
    background: #FEF2F2;
    border-color: #FECACA;
    color: #DC2626;
  }
`;

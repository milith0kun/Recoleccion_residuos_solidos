'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';

function ResetPasswordInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Token no proporcionado');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Error');
      setDone(true);
      setTimeout(() => router.push('/'), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-root">
      <style>{styles}</style>
      <div className="auth-card">
        <Link href="/" className="auth-back">
          <ArrowLeft style={{ width: 14, height: 14 }} />
          <span>Volver al inicio</span>
        </Link>

        <div className="auth-header">
          <div className="auth-icon">
            <KeyRound style={{ width: 22, height: 22 }} />
          </div>
          <h2>Nueva contraseña</h2>
          <p>Define una contraseña nueva para tu cuenta.</p>
        </div>

        {done ? (
          <div className="auth-success">
            <div className="auth-success-icon">
              <CheckCircle2 style={{ width: 28, height: 28 }} />
            </div>
            <p>Contraseña actualizada. Redirigiendo al inicio de sesión...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="auth-field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {!token && (
              <div className="auth-error">
                No se encontró un token válido en la URL.
              </div>
            )}
            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              disabled={submitting || !token}
              className="auth-btn"
            >
              {submitting ? (
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              ) : (
                'Actualizar contraseña'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

const styles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .auth-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: #FAFAF8;
    font-family: 'Outfit', 'DM Sans', -apple-system, sans-serif;
    color: #1A1A1A;
  }
  .auth-card {
    width: 100%;
    max-width: 420px;
    background: #FFFFFF;
    border: 1px solid #F0EEEB;
    border-radius: 20px;
    padding: 2.5rem 2rem;
    box-shadow: 0 12px 40px rgba(15,23,42,0.06);
  }
  .auth-back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: #8A8780;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 1.75rem;
  }
  .auth-back:hover { color: #059669; }
  .auth-icon {
    width: 48px; height: 48px;
    border-radius: 14px;
    background: #ECFDF5;
    color: #059669;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
  }
  .auth-header h2 {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #1A1A1A;
    margin-bottom: 0.4rem;
  }
  .auth-header p {
    font-size: 0.82rem;
    color: #8A8780;
    line-height: 1.55;
    margin-bottom: 1.75rem;
  }
  .auth-field { margin-bottom: 1.25rem; }
  .auth-field label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #8A8780;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.4rem;
  }
  .auth-field input {
    width: 100%;
    padding: 0.8rem 1rem;
    border-radius: 10px;
    border: 1.5px solid #ECEAE6;
    background: #FAFAF8;
    font-size: 0.875rem;
    font-weight: 500;
    color: #1A1A1A;
    font-family: inherit;
    outline: none;
    transition: all 0.2s;
  }
  .auth-field input:focus {
    border-color: #059669;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(5,150,105,0.06);
  }
  .auth-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    padding: 0.85rem;
    border-radius: 10px;
    border: none;
    background: #059669;
    color: #FFFFFF;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.2s;
  }
  .auth-btn:hover { background: #047857; }
  .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .auth-error {
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  .auth-success {
    text-align: center;
    padding: 1rem 0;
  }
  .auth-success-icon {
    width: 64px; height: 64px;
    border-radius: 20px;
    background: #ECFDF5;
    color: #059669;
    margin: 0 auto 1rem;
    display: flex; align-items: center; justify-content: center;
  }
  .auth-success p {
    font-size: 0.85rem;
    color: #5A5750;
    line-height: 1.55;
    margin-bottom: 1.5rem;
  }
`;

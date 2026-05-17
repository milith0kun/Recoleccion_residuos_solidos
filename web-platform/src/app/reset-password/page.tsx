'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';

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
        <div className="auth-brand">
          <BrandMark size={32} />
          <span className="auth-brand-text">SRSS Cusco</span>
        </div>

        <Link href="/" className="auth-back">
          <ArrowLeft style={{ width: 13, height: 13 }} />
          <span>Volver al inicio</span>
        </Link>

        <div className="auth-header">
          <h2 className="auth-title">Nueva contraseña</h2>
          <p className="auth-sub">
            Definí una contraseña nueva para tu cuenta.
          </p>
        </div>

        {done ? (
          <div className="auth-success">
            <div className="auth-success-icon">
              <CheckCircle2 style={{ width: 26, height: 26 }} />
            </div>
            <p>Contraseña actualizada. Redirigiendo al inicio de sesión…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label className="adm-form-label" htmlFor="reset-new">
                Nueva contraseña
              </label>
              <input
                id="reset-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="adm-form-input"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="auth-field">
              <label className="adm-form-label" htmlFor="reset-confirm">
                Confirmar contraseña
              </label>
              <input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="adm-form-input"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            {!token && (
              <div className="auth-error" role="alert">
                <span className="auth-error-dot" aria-hidden />
                <span>No se encontró un token válido en la URL.</span>
              </div>
            )}
            {error && (
              <div className="auth-error" role="alert">
                <span className="auth-error-dot" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !token}
              className="adm-btn-primary auth-submit"
            >
              {submitting ? (
                <Loader2
                  style={{ width: 16, height: 16, animation: 'auth-spin 0.7s linear infinite' }}
                />
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
  @keyframes auth-spin { to { transform: rotate(360deg); } }
  .auth-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 18px;
    background: #FFFFFF;
    font-family: 'Geist', 'Outfit', sans-serif;
    color: var(--color-ink);
  }
  .auth-card {
    width: 100%;
    max-width: 440px;
    background: #FFFFFF;
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 30px 28px;
    box-shadow: 0 1px 0 #ECF4F0, 0 12px 36px -18px rgba(0, 30, 43, 0.10);
  }
  .auth-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
  }
  .auth-brand-text {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-weight: 500;
    font-size: 18px;
    color: var(--color-ink);
    letter-spacing: -0.012em;
    line-height: 1;
    font-variation-settings: "opsz" 24;
  }
  .auth-back {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--color-ink-muted);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 22px;
    transition: color 0.15s ease;
  }
  .auth-back:hover { color: var(--color-atlas); }

  .auth-header { margin-bottom: 22px; }
  .auth-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 24px;
    font-weight: 500;
    color: var(--color-ink);
    letter-spacing: -0.014em;
    line-height: 1.18;
    font-variation-settings: "opsz" 24;
    margin: 0 0 6px;
  }
  .auth-sub {
    font-size: 13px;
    color: var(--color-ink-muted);
    line-height: 1.5;
    margin: 0;
    letter-spacing: -0.003em;
  }

  .auth-form { display: flex; flex-direction: column; gap: 14px; }
  .auth-field { display: flex; flex-direction: column; gap: 6px; }
  .auth-field .adm-form-input { height: 40px; }

  .auth-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 6px;
    background: #FCEEEE;
    border: 1px solid #F5C9C9;
    color: #B23A3A;
    font-size: 12.5px;
    font-weight: 500;
  }
  .auth-error-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #B23A3A;
    flex-shrink: 0;
  }

  .auth-submit {
    width: 100%;
    justify-content: center;
    height: 42px;
    font-size: 13.5px;
    margin-top: 4px;
  }

  .auth-success {
    text-align: center;
    padding: 8px 0;
  }
  .auth-success-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: var(--color-atlas-soft);
    color: var(--color-atlas-dark);
    border: 1px solid var(--color-atlas-border);
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .auth-success p {
    font-size: 13.5px;
    color: var(--color-ink-muted);
    line-height: 1.55;
    margin: 0;
  }

  @media (max-width: 479px) {
    .auth-card { padding: 24px 20px; }
    .auth-title { font-size: 22px; }
  }
`;

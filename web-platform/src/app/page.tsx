'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (resp: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfig {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GoogleIdApi {
  initialize: (config: GoogleIdConfig) => void;
  prompt: () => void;
  renderButton: (parent: HTMLElement, config: GoogleButtonConfig) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdApi;
      };
    };
  }
}

export default function HomePage() {
  const { user, login, loginWithGoogle, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleGoogleCredential = useCallback(async (resp: GoogleCredentialResponse) => {
    setSubmitting(true);
    setError('');
    try {
      await loginWithGoogle(resp.credential);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError((err as Error).message || 'Error con Google');
    } finally {
      setSubmitting(false);
    }
  }, [loginWithGoogle, router]);

  useEffect(() => {
    if (!gisReady) return;
    if (!googleClientId) return;
    if (!window.google) return;
    if (!googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      cancel_on_tap_outside: false,
    });
    googleBtnRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 332,
      locale: 'es',
    });
  }, [gisReady, googleClientId, handleGoogleCredential]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="landing-root" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <style>{styles}</style>
        <span className="spinner-lg" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="landing-root">
      <style>{styles}</style>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />

      {/* Panel Izquierdo */}
      <div className="panel-left">
        <div className="left-decor" aria-hidden />
        <div className="left-content animate-fade-in">

          <div className="brand">
            <span className="wordmark">SRSS</span>
            <span className="brand-bar" aria-hidden />
            <span className="brand-loc">Cusco</span>
          </div>

          <div className="hero">
            <span className="hero-eyebrow">Plataforma de Gestión Municipal</span>
            <h1 className="hero-title">
              Recolección inteligente<br />
              de residuos sólidos<br />
              para una ciudad limpia.
            </h1>
            <p className="hero-desc">
              Monitorea, planifica y optimiza la recolección de residuos en
              tiempo real con datos al servicio de la ciudadanía del Cusco.
            </p>
          </div>

          <div className="features">
            {[
              'Geolocalización de zonas y rutas',
              'Seguimiento GPS en tiempo real',
              'Planificación de recorridos diarios',
              'Reportes y analítica operativa',
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <span className="feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="left-footer">
            <span>Municipalidad Provincial del Cusco</span>
            <span className="sep">·</span>
            <span>Gerencia de Medio Ambiente</span>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Login */}
      <div className="panel-right">
        <div className="login-box animate-fade-in">
          <div className="login-header">
            <span className="login-eyebrow">Acceso al sistema</span>
            <h2>Bienvenido de vuelta</h2>
            <p>Inicia sesión para continuar con la gestión.</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@cusco.gob.pe"
                required
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="error-msg" role="alert">
                <span className="error-dot" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-login">
              {submitting ? <span className="spinner-sm" /> : 'Ingresar'}
            </button>

            <div className="forgot-row">
              <Link href="/forgot-password" className="forgot-link">¿Olvidaste tu contraseña?</Link>
            </div>
          </form>

          <div className="divider-or" role="separator" aria-label="o">
            <span className="divider-line" />
            <span className="divider-text">o</span>
            <span className="divider-line" />
          </div>

          <div className="google-wrap">
            <div ref={googleBtnRef} className="google-btn-host" />
            {googleClientId && !gisReady && (
              <p className="google-hint">Cargando Google Sign-In…</p>
            )}
            {!googleClientId && (
              <p className="google-hint">
                Configura <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en <code>.env.local</code> para activar Google Sign-In
              </p>
            )}
          </div>

          <div className="login-footer">
            © 2026 Municipalidad Provincial del Cusco
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
  .landing-root {
    min-height: 100vh;
    display: flex;
    font-family: 'Outfit', 'DM Sans', -apple-system, sans-serif;
    background: #FFFFFF;
    color: #1A1A1A;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Panel Izquierdo */
  .panel-left {
    flex: 1.15;
    background: #FAFAF8;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4.5rem 4rem;
    position: relative;
    border-right: 1px solid #F0EEEB;
    overflow: hidden;
  }
  .left-decor {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(600px 400px at 90% -10%, rgba(5,150,105,0.07), transparent 60%),
      radial-gradient(500px 350px at -10% 110%, rgba(5,150,105,0.05), transparent 60%);
    pointer-events: none;
  }
  .panel-left::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #E8E5E0, transparent);
  }

  .left-content {
    position: relative;
    max-width: 540px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 2.75rem;
    z-index: 1;
  }

  /* Brand */
  .brand {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .wordmark {
    font-size: 1.7rem;
    font-weight: 900;
    color: #059669;
    letter-spacing: -0.05em;
    line-height: 1;
  }
  .brand-bar {
    display: inline-block;
    width: 1px;
    height: 22px;
    background: #D6D3CE;
  }
  .brand-loc {
    font-size: 0.78rem;
    font-weight: 600;
    color: #6B6862;
    letter-spacing: 0.02em;
  }

  /* Hero */
  .hero-eyebrow {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #059669;
    background: rgba(5,150,105,0.08);
    padding: 0.35rem 0.75rem;
    border-radius: 99px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 1.25rem;
  }
  .hero-title {
    font-size: clamp(1.9rem, 3.6vw, 2.85rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: #1A1A1A;
    margin-bottom: 1.25rem;
  }
  .hero-desc {
    font-size: 1rem;
    color: #6B6862;
    font-weight: 400;
    line-height: 1.7;
    max-width: 460px;
  }

  /* Features */
  .features {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4A4742;
  }
  .feature-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #059669;
    flex-shrink: 0;
    box-shadow: 0 0 0 4px rgba(5,150,105,0.1);
  }

  /* Footer left */
  .left-footer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: #B0ADA8;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
  .left-footer .sep { color: #DDDBD7; }

  /* Panel Derecho */
  .panel-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: #FFFFFF;
  }

  .login-box {
    width: 100%;
    max-width: 380px;
  }

  .login-header {
    margin-bottom: 1.75rem;
  }
  .login-eyebrow {
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    color: #B0ADA8;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.6rem;
  }
  .login-header h2 {
    font-size: 1.85rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.025em;
    margin-bottom: 0.4rem;
    line-height: 1.15;
  }
  .login-header p {
    font-size: 0.875rem;
    color: #8A8780;
    font-weight: 400;
  }

  /* Form */
  .field {
    margin-bottom: 1.15rem;
  }
  .field label {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    color: #8A8780;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.45rem;
  }
  .field input {
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    border: 1.5px solid #ECEAE6;
    background: #FAFAF8;
    color: #1A1A1A;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    outline: none;
    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  }
  .field input::placeholder {
    color: #CDCAC5;
    font-weight: 400;
  }
  .field input:hover {
    border-color: #E0DDD8;
  }
  .field input:focus {
    border-color: #059669;
    background: #FFFFFF;
    box-shadow: 0 0 0 4px rgba(5,150,105,0.08);
  }

  .error-msg {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: 1.15rem;
  }
  .error-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #DC2626;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px rgba(220,38,38,0.15);
  }

  .btn-login {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.9rem;
    border-radius: 10px;
    border: none;
    background: #059669;
    color: #FFFFFF;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.25s ease;
    box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 12px rgba(5,150,105,0.18);
  }
  .btn-login:hover:not(:disabled) {
    background: #047857;
    transform: translateY(-1px) scale(1.005);
    box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 8px 20px rgba(5,150,105,0.28);
  }
  .btn-login:active:not(:disabled) {
    transform: translateY(0) scale(0.99);
  }
  .btn-login:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }

  .forgot-row {
    margin-top: 0.85rem;
    text-align: center;
  }
  .forgot-link {
    font-size: 0.73rem;
    font-weight: 600;
    color: #8A8780;
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: color 0.2s ease;
  }
  .forgot-link:hover {
    color: #059669;
  }

  .login-footer {
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #F0EEEB;
    text-align: center;
    font-size: 0.65rem;
    color: #C5C2BD;
    font-weight: 500;
  }

  /* Divider OR */
  .divider-or {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.5rem 0 1.1rem;
  }
  .divider-line {
    flex: 1;
    height: 1px;
    background: #F0EEEB;
  }
  .divider-text {
    font-size: 0.7rem;
    font-weight: 600;
    color: #8A8780;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  /* Google */
  .google-wrap {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
  }
  .google-btn-host {
    display: flex;
    justify-content: center;
    min-height: 44px;
  }
  .google-btn-host > div {
    width: 100% !important;
  }
  .google-hint {
    font-size: 0.65rem;
    color: #B0ADA8;
    font-weight: 500;
    line-height: 1.5;
    text-align: center;
    margin: 0;
  }
  .google-hint code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    background: #F0EEEB;
    color: #6B6862;
    padding: 1px 5px;
    border-radius: 4px;
  }

  /* Spinners (sin librería de iconos) */
  .spinner-lg {
    display: inline-block;
    width: 32px;
    height: 32px;
    border: 3px solid #E8E5E0;
    border-top-color: #059669;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .spinner-sm {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: #FFFFFF;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .landing-root { flex-direction: column; }
    .panel-left {
      padding: 3rem 2rem;
      border-right: none;
      border-bottom: 1px solid #F0EEEB;
    }
    .left-content { gap: 2rem; }
    .panel-right { padding: 2.5rem 2rem; }
  }
  @media (max-width: 640px) {
    .panel-left { padding: 2.25rem 1.5rem; }
    .panel-right { padding: 2rem 1.5rem; }
    .hero-title { font-size: 1.7rem; }
    .login-header h2 { font-size: 1.55rem; }
  }
`;

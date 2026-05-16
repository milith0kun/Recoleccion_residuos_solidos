'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, Loader2 } from 'lucide-react';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (resp: GoogleCredentialResponse) => void;
}

interface GoogleRenderConfig {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  width?: number;
  shape?: 'rectangular' | 'pill';
  logo_alignment?: 'left' | 'center';
}

interface GoogleIdApi {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleRenderConfig) => void;
  prompt: () => void;
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
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
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
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
    });
    if (googleBtnRef.current) {
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 320,
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    }
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

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      const res = await fetch('/api/v1/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSeedMsg('Base de datos inicializada correctamente.');
      } else {
        setSeedMsg('Error: ' + data.error?.message);
      }
    } catch {
      setSeedMsg('Error de conexión');
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="landing-root" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <style>{styles}</style>
        <Loader2 style={{ width: 32, height: 32, color: '#059669', animation: 'spin 1s linear infinite' }} />
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
            <div className="brand-mark" aria-hidden>
              <span className="brand-mark-dot" />
            </div>
            <div className="brand-text">
              <h2 className="brand-name">SRSS</h2>
              <span className="brand-loc">Cusco</span>
            </div>
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
              {submitting ? (
                <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  Ingresar
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
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
            {googleClientId ? (
              <div ref={googleBtnRef} className="google-btn-host" aria-label="Continuar con Google" />
            ) : (
              <>
                <button type="button" disabled className="btn-google-fallback">
                  Continuar con Google
                </button>
                <p className="google-hint">
                  Configura <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> en <code>.env.local</code> para activar Google Sign-In
                </p>
              </>
            )}
          </div>

          {/* Credenciales de prueba - tarjeta oscura */}
          <div className="creds-dark">
            <div className="creds-dark-header">
              <span className="creds-dark-label">Cuentas de prueba</span>
              <span className="creds-dark-hint">Click para autocompletar</span>
            </div>
            <div className="creds-dark-list">
              {[
                { role: 'Administrador', email: 'admin@residuos.cusco.gob.pe', pass: 'admin123' },
                { role: 'Operador', email: 'operador@residuos.cusco.gob.pe', pass: 'operator123' },
                { role: 'Ciudadano', email: 'ciudadano@gmail.com', pass: 'citizen123' },
              ].map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                  className="cred-row-dark"
                >
                  <span className="cred-role-dark">{c.role}</span>
                  <span className="cred-email-dark">{c.email}</span>
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSeed} disabled={seeding} className="seed-link">
            {seeding ? 'Inicializando...' : 'Inicializar datos de prueba'}
          </button>
          {seedMsg && <div className="seed-feedback">{seedMsg}</div>}

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
    gap: 0.6rem;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: linear-gradient(135deg, #059669, #047857);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(5,150,105,0.25);
  }
  .brand-mark-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #FFFFFF;
  }
  .brand-text {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }
  .brand-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.03em;
  }
  .brand-loc {
    font-size: 0.75rem;
    font-weight: 500;
    color: #A09D98;
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

  /* Credenciales - tarjeta oscura */
  .creds-dark {
    margin-top: 1.75rem;
    background: #1A1A1A;
    border-radius: 14px;
    padding: 1rem;
    color: #FFFFFF;
  }
  .creds-dark-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.2rem 0.65rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 0.5rem;
  }
  .creds-dark-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .creds-dark-hint {
    font-size: 0.62rem;
    font-weight: 500;
    color: rgba(255,255,255,0.35);
  }
  .creds-dark-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cred-row-dark {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.55rem 0.55rem;
    border: none;
    background: transparent;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s ease;
  }
  .cred-row-dark:hover {
    background: rgba(255,255,255,0.06);
  }
  .cred-role-dark {
    font-size: 0.75rem;
    font-weight: 700;
    color: #FFFFFF;
    flex-shrink: 0;
  }
  .cred-email-dark {
    font-size: 0.68rem;
    font-weight: 500;
    color: rgba(255,255,255,0.45);
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Seed */
  .seed-link {
    display: block;
    width: 100%;
    margin-top: 1rem;
    border: none;
    background: transparent;
    color: #C5C2BD;
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s;
    text-align: center;
    padding: 0.4rem;
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 3px;
  }
  .seed-link:hover:not(:disabled) {
    color: #059669;
    text-decoration-color: #059669;
  }
  .seed-link:disabled { opacity: 0.6; cursor: not-allowed; }
  .seed-feedback {
    text-align: center;
    margin-top: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #059669;
    padding: 0.4rem;
  }

  .login-footer {
    margin-top: 1.75rem;
    padding-top: 1rem;
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
    align-items: center;
    gap: 0.5rem;
  }
  .google-btn-host {
    width: 100%;
    display: flex;
    justify-content: center;
    min-height: 40px;
  }
  .btn-google-fallback {
    width: 100%;
    padding: 0.85rem 1rem;
    border-radius: 10px;
    border: 1.5px solid #ECEAE6;
    background: #FAFAF8;
    color: #8A8780;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: not-allowed;
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

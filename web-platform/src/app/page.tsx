'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, BookOpen, Eye, EyeOff } from 'lucide-react';
import { BrandLockup, BrandMark } from '@/components/branding/BrandMark';

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

const FEATURES = [
  'Rutas y zonas geográficas',
  'Vehículos y seguimiento GPS',
  'Catálogo NTP 900.058',
];

export default function HomePage() {
  const { user, login, loginWithGoogle, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleGoogleCredential = useCallback(
    async (resp: GoogleCredentialResponse) => {
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
    },
    [loginWithGoogle, router],
  );

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
      <div className="home-root home-root--center">
        <style>{styles}</style>
        <span className="home-spinner" aria-label="Cargando" />
      </div>
    );
  }

  return (
    <div className="home-root">
      <style>{styles}</style>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />

      <header className="home-top">
        <div className="home-top-inner">
          <BrandLockup size={30} />
          <a
            href="https://github.com/milith0kun/Recoleccion_residuos_solidos#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="home-top-link"
          >
            <BookOpen size={14} strokeWidth={2} />
            <span>Documentación</span>
            <ArrowRight size={13} strokeWidth={2} />
          </a>
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero animate-fade-in">
          <div className="home-hero-mark" aria-hidden>
            <BrandMark size={64} />
          </div>
          <span className="home-eyebrow">
            <span className="home-eyebrow-dot" aria-hidden />
            SRSS · Cusco
          </span>
          <h1 className="home-title">
            Recolección de{' '}
            <em
              style={{
                color: 'var(--color-atlas)',
                fontStyle: 'italic',
                fontWeight: 500,
              }}
            >
              residuos
            </em>
            <br />
            segregados.
          </h1>
          <p className="home-sub">
            Plataforma de gestión ambiental urbana del Cusco, con rutas,
            vehículos y seguimiento GPS en tiempo real.
          </p>
          <ul className="home-features">
            {FEATURES.map((f) => (
              <li key={f}>
                <span className="home-feature-dot" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-auth animate-fade-in">
          <div className="home-auth-card">
            <div className="home-auth-brand-mobile">
              <BrandMark size={32} />
            </div>
            <h2 className="home-auth-title">Ingresar al sistema</h2>
            <p className="home-auth-sub">
              Accedé con tu cuenta institucional o Google.
            </p>

            <form onSubmit={handleLogin} className="home-form">
              <div className="home-field">
                <label className="adm-form-label" htmlFor="login-email">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@cusco.gob.pe"
                  className="adm-form-input"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="home-field">
                <label className="adm-form-label" htmlFor="login-password">
                  Contraseña
                </label>
                <div className="home-password-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="adm-form-input home-password-input"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="home-password-toggle"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="home-error" role="alert">
                  <span className="home-error-dot" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="adm-btn-primary home-submit"
              >
                {submitting ? (
                  <span className="home-spinner home-spinner--sm" />
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight size={14} strokeWidth={2.2} />
                  </>
                )}
              </button>

              <div className="home-forgot">
                <Link href="/forgot-password" className="home-link">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>

            <div className="home-divider" role="separator" aria-label="o">
              <span className="home-divider-line" />
              <span className="home-divider-text">o</span>
              <span className="home-divider-line" />
            </div>

            <div className="home-google">
              <div ref={googleBtnRef} className="home-google-host" />
              {googleClientId && !gisReady && (
                <p className="home-google-hint">Cargando Google Sign-In…</p>
              )}
              {!googleClientId && (
                <p className="home-google-hint">
                  Configurá <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> para activar Google.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="home-foot">
        <div className="home-foot-inner">
          <span>© {year} SRSS Cusco</span>
          <span className="home-foot-sep" aria-hidden>·</span>
          <span className="home-foot-affil">
            Municipalidad Provincial del Cusco
          </span>
        </div>
      </footer>
    </div>
  );
}

const styles = `
  .home-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: #FFFFFF;
    color: var(--color-ink);
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .home-root--center {
    align-items: center;
    justify-content: center;
  }

  /* ─── Top bar minimal ─── */
  .home-top {
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-line);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: saturate(180%) blur(10px);
    -webkit-backdrop-filter: saturate(180%) blur(10px);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .home-top-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .home-top-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--color-line);
    background: #FFFFFF;
    color: var(--color-ink-muted);
    font-size: 12.5px;
    font-weight: 500;
    letter-spacing: -0.003em;
    text-decoration: none;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }
  .home-top-link:hover {
    background: var(--color-atlas-soft);
    border-color: var(--color-atlas-border);
    color: var(--color-atlas-dark);
  }

  /* ─── Main: hero + auth ─── */
  .home-main {
    flex: 1;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 56px 28px 40px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 48px;
    align-items: center;
  }
  @media (min-width: 1024px) {
    .home-main {
      grid-template-columns: minmax(0, 1.05fr) minmax(420px, 480px);
      gap: 80px;
      padding-top: 72px;
      padding-bottom: 56px;
    }
  }

  /* ─── Hero ─── */
  .home-hero { min-width: 0; }
  .home-hero-mark {
    display: inline-flex;
    align-items: center;
    margin-bottom: 22px;
  }
  .home-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 11px 5px 9px;
    border-radius: 999px;
    background: var(--color-atlas-soft);
    color: var(--color-atlas-dark);
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  .home-eyebrow-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-atlas);
    box-shadow: 0 0 0 3px rgba(0, 104, 74, 0.18);
  }
  .home-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: clamp(36px, 6vw, 60px);
    font-weight: 500;
    color: var(--color-ink);
    letter-spacing: -0.022em;
    line-height: 1.04;
    font-variation-settings: "opsz" 36;
    margin: 0;
  }
  .home-sub {
    font-family: 'Geist', sans-serif;
    font-size: clamp(14px, 1.4vw, 16px);
    color: var(--color-ink-muted);
    line-height: 1.55;
    margin: 18px 0 26px;
    max-width: 460px;
    letter-spacing: -0.003em;
  }
  .home-features {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .home-features li {
    display: flex;
    align-items: center;
    gap: 11px;
    font-size: 13.5px;
    color: var(--color-ink);
    letter-spacing: -0.003em;
  }
  .home-feature-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-atlas);
    flex-shrink: 0;
  }

  /* ─── Auth card ─── */
  .home-auth {
    width: 100%;
    display: flex;
    justify-content: center;
    min-width: 0;
  }
  .home-auth-card {
    width: 100%;
    max-width: 460px;
    background: #FFFFFF;
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 30px 28px;
    box-shadow: 0 1px 0 #ECF4F0, 0 12px 36px -18px rgba(0, 30, 43, 0.10);
  }
  .home-auth-brand-mobile {
    display: none;
    margin-bottom: 14px;
  }
  @media (max-width: 1023px) {
    .home-auth-brand-mobile { display: block; }
  }
  .home-auth-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 26px;
    font-weight: 500;
    color: var(--color-ink);
    letter-spacing: -0.014em;
    line-height: 1.15;
    font-variation-settings: "opsz" 24;
    margin: 0 0 4px;
  }
  .home-auth-sub {
    font-size: 13px;
    color: var(--color-ink-muted);
    margin: 0 0 22px;
    letter-spacing: -0.003em;
  }
  .home-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .home-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .home-field .adm-form-input {
    height: 40px;
  }
  .home-password-wrap {
    position: relative;
  }
  .home-password-input {
    padding-right: 36px !important;
  }
  .home-password-toggle {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    border-radius: 4px;
    color: var(--color-ink-soft);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .home-password-toggle:hover {
    background: var(--color-surface-soft);
    color: var(--color-ink);
  }
  .home-error {
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
    margin-top: -4px;
  }
  .home-error-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #B23A3A;
    flex-shrink: 0;
  }
  .home-submit {
    width: 100%;
    justify-content: center;
    height: 42px;
    font-size: 13.5px;
    margin-top: 4px;
  }
  .home-forgot {
    display: flex;
    justify-content: flex-end;
    margin-top: -2px;
  }
  .home-link {
    font-size: 12.5px;
    color: var(--color-ink-muted);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .home-link:hover { color: var(--color-atlas); }

  /* ─── Divider "o" estilo Claude ─── */
  .home-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0 18px;
  }
  .home-divider-line {
    flex: 1;
    height: 1px;
    background: var(--color-line);
  }
  .home-divider-text {
    font-size: 11.5px;
    color: var(--color-ink-soft);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 500;
  }

  /* ─── Google ─── */
  .home-google {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .home-google-host {
    width: 100%;
    display: flex;
    justify-content: center;
    min-height: 40px;
  }
  .home-google-host > div { width: 100% !important; max-width: 332px; }
  .home-google-hint {
    font-size: 11.5px;
    color: var(--color-ink-soft);
    margin: 0;
    text-align: center;
  }
  .home-google-hint code {
    font-family: 'Geist Mono', ui-monospace, monospace;
    font-size: 10.5px;
    padding: 1px 5px;
    background: var(--color-surface-soft);
    border: 1px solid var(--color-line);
    border-radius: 3px;
  }

  /* ─── Footer público ─── */
  .home-foot {
    flex-shrink: 0;
    border-top: 1px solid var(--color-line);
    background: #FFFFFF;
  }
  .home-foot-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 14px 28px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: var(--color-ink-muted);
    flex-wrap: wrap;
  }
  .home-foot-sep {
    color: #C2C9CD;
    user-select: none;
  }
  .home-foot-affil {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-style: italic;
    font-size: 13px;
    letter-spacing: -0.005em;
    color: var(--color-ink-muted);
    font-variation-settings: "opsz" 14;
  }

  /* ─── Spinner ─── */
  .home-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid #E8EDEB;
    border-top-color: var(--color-atlas);
    border-radius: 50%;
    animation: home-spin 0.7s linear infinite;
    display: inline-block;
  }
  .home-spinner--sm { width: 16px; height: 16px; border-width: 2px; }
  @keyframes home-spin { to { transform: rotate(360deg); } }

  /* ─── Mobile: top bar más compacto, padding reducido ─── */
  @media (max-width: 767px) {
    .home-top-inner { padding: 12px 18px; }
    .home-main { padding: 28px 18px 32px; gap: 32px; }
    .home-auth-card { padding: 24px 20px; }
    .home-foot-inner { padding: 14px 18px; font-size: 11.5px; }
  }
`;

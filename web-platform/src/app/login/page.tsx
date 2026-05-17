'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft } from 'lucide-react';
import { Button, Input } from '@/components/ui';

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

export default function LoginPage() {
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
    [loginWithGoogle, router]
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
      width: 348,
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
      setError((err as Error).message || 'Error de autenticación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-root">
      <style>{styles}</style>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />

      <Link href="/" className="back-home">
        <ArrowLeft size={14} />
        <span>Volver al inicio</span>
      </Link>

      <main className="login-stage">
        <div className="login-card animate-fade-up">
          <div className="login-brand">
            <span className="brand-mark" aria-hidden>
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4C16 4 8 10 8 18C8 23 11 27 16 27C21 27 24 23 24 18C24 10 16 4 16 4Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="brand-word">SRSS Cusco</span>
          </div>

          <div className="login-head">
            <h1 className="text-h1" style={{ fontSize: 28 }}>
              Iniciar sesión
            </h1>
            <p className="text-small" style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
              Accedé al panel administrativo del sistema municipal.
            </p>
          </div>

          <div className="google-wrap">
            <div ref={googleBtnRef} className="google-btn-host" />
            {googleClientId && !gisReady && (
              <p className="text-small" style={{ color: 'var(--color-text-faint)', textAlign: 'center' }}>
                Cargando Google Sign-In…
              </p>
            )}
            {!googleClientId && (
              <p className="text-small" style={{ color: 'var(--color-text-faint)', textAlign: 'center' }}>
                Falta configurar <code className="code-chip">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>
              </p>
            )}
          </div>

          <div className="ui-divider-text">o continuar con correo</div>

          <form onSubmit={handleLogin} className="form">
            <Input
              label="Correo institucional"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@cusco.gob.pe"
              autoComplete="email"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />

            {error ? <div className="ui-error">{error}</div> : null}

            <Button type="submit" variant="primary" size="lg" block loading={submitting}>
              Iniciar sesión
            </Button>
          </form>

          <div className="login-extras">
            <Link href="/forgot-password" className="extra-link">
              ¿Olvidaste tu contraseña?
            </Link>
            <Link href="/register" className="extra-link">
              Crear cuenta
            </Link>
          </div>
        </div>

        <p className="login-foot">
          © 2026 Municipalidad Provincial del Cusco · Gerencia de Medio Ambiente
        </p>
      </main>
    </div>
  );
}

const styles = `
  .login-root {
    min-height: 100vh;
    background:
      radial-gradient(700px 500px at 50% -20%, rgba(0,104,74,0.06), transparent 60%),
      var(--color-canvas);
    display: flex;
    flex-direction: column;
  }

  .back-home {
    position: absolute;
    top: 28px;
    left: 32px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text-muted);
    padding: 8px 12px;
    border-radius: 8px;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .back-home:hover {
    color: var(--color-text);
    background: var(--color-paper);
  }
  @media (max-width: 640px) {
    .back-home { top: 18px; left: 16px; }
  }

  .login-stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 80px 24px 48px;
    gap: 24px;
  }

  .login-card {
    width: 100%;
    max-width: 420px;
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: 14px;
    padding: 40px 36px;
    box-shadow: var(--shadow-md);
    position: relative;
  }
  @media (max-width: 480px) {
    .login-card { padding: 28px 22px; border-radius: 12px; }
  }

  .login-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
  }
  .brand-mark {
    width: 26px; height: 26px;
    color: var(--color-primary);
    display: grid; place-items: center;
  }
  .brand-mark svg { width: 100%; height: 100%; }
  .brand-word {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-text);
    font-variation-settings: "opsz" 36;
  }

  .login-head {
    margin-bottom: 28px;
  }

  .google-wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .google-btn-host {
    display: flex;
    justify-content: center;
    min-height: 44px;
  }
  .google-btn-host > div {
    width: 100% !important;
  }
  .code-chip {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--color-cloud);
    color: var(--color-text-muted);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .login-extras {
    margin-top: 22px;
    padding-top: 22px;
    border-top: 1px solid var(--color-line-soft);
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .extra-link {
    font-size: 13px;
    color: var(--color-text-muted);
    font-weight: 500;
    transition: color 0.15s ease;
  }
  .extra-link:hover { color: var(--color-primary); }

  .login-foot {
    font-size: 12px;
    color: var(--color-text-faint);
    text-align: center;
    max-width: 420px;
  }
`;

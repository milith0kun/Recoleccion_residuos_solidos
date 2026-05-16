'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

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
        setSeedMsg('✓ Base de datos inicializada.');
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

      {/* ═══ PANEL IZQUIERDO ═══ */}
      <div className="panel-left">
        <div className="left-content">

          {/* Brand */}
          <div className="brand">
            <h2 className="brand-name">SRSS</h2>
            <span className="brand-loc">Cusco</span>
          </div>

          {/* Hero */}
          <div className="hero">
            <h1 className="hero-title">
              Sistema Inteligente de<br />
              Recolección de Residuos<br />
              Sólidos Segregados
            </h1>
            <p className="hero-desc">
              Gestión, monitoreo y optimización de la recolección de 
              residuos sólidos para la ciudad del Cusco.
            </p>
          </div>

          {/* Features */}
          <div className="features">
            {[
              'Geolocalización de zonas y rutas',
              'Seguimiento GPS en tiempo real',
              'Planificación de recorridos',
              'Reportes y analítica avanzada',
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <span className="feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="left-footer">
            <span>Municipalidad Provincial del Cusco</span>
            <span className="sep">·</span>
            <span>Gerencia de Medio Ambiente</span>
          </div>
        </div>
      </div>

      {/* ═══ PANEL DERECHO — LOGIN ═══ */}
      <div className="panel-right">
        <div className="login-box">
          <div className="login-header">
            <h2>Bienvenido</h2>
            <p>Accede al panel de gestión del sistema.</p>
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
              <div className="error-msg">
                <ShieldCheck style={{ width: 14, height: 14, flexShrink: 0 }} />
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

          {/* Credenciales */}
          <div className="creds">
            <span className="creds-label">Cuentas de prueba</span>
            {[
              { role: 'Administrador', email: 'admin@residuos.cusco.gob.pe', pass: 'admin123' },
              { role: 'Operador', email: 'operador@residuos.cusco.gob.pe', pass: 'operator123' },
              { role: 'Ciudadano', email: 'ciudadano@gmail.com', pass: 'citizen123' },
            ].map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                className="cred-row"
              >
                <span className="cred-role">{c.role}</span>
                <span className="cred-email">{c.email}</span>
              </button>
            ))}
          </div>

          {/* Seed */}
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

  /* ═══ PANEL IZQUIERDO ═══ */
  .panel-left {
    flex: 1.2;
    background: #FAFAF8;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    position: relative;
    border-right: 1px solid #F0EEEB;
  }
  .panel-left::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #E8E5E0, transparent);
  }

  .left-content {
    max-width: 540px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  /* Brand */
  .brand {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }
  .brand-name {
    font-size: 1.35rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.03em;
  }
  .brand-loc {
    font-size: 0.8rem;
    font-weight: 500;
    color: #B0ADA8;
    letter-spacing: 0.02em;
  }

  /* Hero */
  .hero-title {
    font-size: clamp(1.8rem, 3.5vw, 2.75rem);
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.025em;
    color: #1A1A1A;
    margin-bottom: 1rem;
  }
  .hero-desc {
    font-size: 1rem;
    color: #8A8780;
    font-weight: 400;
    line-height: 1.7;
    max-width: 440px;
  }

  /* Features */
  .features {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #5A5750;
  }
  .feature-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #059669;
    flex-shrink: 0;
  }

  /* Footer left */
  .left-footer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: #C5C2BD;
    font-weight: 500;
    letter-spacing: 0.01em;
  }
  .left-footer .sep { color: #DDDBD7; }

  /* ═══ PANEL DERECHO ═══ */
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
    max-width: 360px;
  }

  .login-header {
    margin-bottom: 2rem;
  }
  .login-header h2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: #1A1A1A;
    letter-spacing: -0.02em;
    margin-bottom: 0.35rem;
  }
  .login-header p {
    font-size: 0.85rem;
    color: #A09D98;
    font-weight: 400;
  }

  /* Form */
  .field {
    margin-bottom: 1.25rem;
  }
  .field label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #8A8780;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.4rem;
  }
  .field input {
    width: 100%;
    padding: 0.8rem 1rem;
    border-radius: 10px;
    border: 1.5px solid #ECEAE6;
    background: #FAFAF8;
    color: #1A1A1A;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    outline: none;
    transition: all 0.25s ease;
  }
  .field input::placeholder {
    color: #CDCAC5;
  }
  .field input:focus {
    border-color: #059669;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(5,150,105,0.06);
  }

  .error-msg {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 0.9rem;
    border-radius: 10px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 1.25rem;
  }

  .btn-login {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
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
    transition: all 0.25s ease;
  }
  .btn-login:hover {
    background: #047857;
    box-shadow: 0 4px 16px rgba(5,150,105,0.2);
  }
  .btn-login:active {
    transform: scale(0.98);
  }
  .btn-login:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Forgot password link */
  .forgot-row {
    margin-top: 0.75rem;
    text-align: center;
  }
  .forgot-link {
    font-size: 0.72rem;
    font-weight: 600;
    color: #8A8780;
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: color 0.2s ease;
  }
  .forgot-link:hover {
    color: #059669;
  }

  /* Creds */
  .creds {
    margin-top: 1.5rem;
    border: 1px solid #F0EEEB;
    border-radius: 12px;
    overflow: hidden;
  }
  .creds-label {
    display: block;
    padding: 0.6rem 0.9rem;
    font-size: 0.65rem;
    font-weight: 700;
    color: #B0ADA8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: #FAFAF8;
    border-bottom: 1px solid #F0EEEB;
  }
  .cred-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.9rem;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s ease;
  }
  .cred-row:not(:last-child) {
    border-bottom: 1px solid #F7F6F4;
  }
  .cred-row:hover {
    background: #FAFAF8;
  }
  .cred-role {
    font-size: 0.75rem;
    font-weight: 600;
    color: #3A3A38;
  }
  .cred-email {
    font-size: 0.7rem;
    font-weight: 400;
    color: #B0ADA8;
  }

  /* Seed */
  .seed-link {
    display: block;
    width: 100%;
    margin-top: 1rem;
    border: none;
    background: transparent;
    color: #CDCAC5;
    font-family: inherit;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition: color 0.2s;
    text-align: center;
    padding: 0.4rem;
  }
  .seed-link:hover { color: #059669; }
  .seed-feedback {
    text-align: center;
    margin-top: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #059669;
    padding: 0.4rem;
  }

  .login-footer {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #F0EEEB;
    text-align: center;
    font-size: 0.65rem;
    color: #CDCAC5;
    font-weight: 500;
  }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 1024px) {
    .landing-root { flex-direction: column; }
    .panel-left {
      padding: 2.5rem 2rem;
      border-right: none;
      border-bottom: 1px solid #F0EEEB;
    }
    .panel-right { padding: 2.5rem 2rem; }
  }
  @media (max-width: 640px) {
    .panel-left { padding: 2rem 1.5rem; }
    .panel-right { padding: 2rem 1.5rem; }
    .hero-title { font-size: 1.6rem; }
  }
`;

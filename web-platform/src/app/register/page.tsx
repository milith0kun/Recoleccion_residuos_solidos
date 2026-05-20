'use client';

import Link from 'next/link';
import { Suspense, useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  MailCheck,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { BrandMark } from '@/components/branding/BrandMark';
import { useAuth } from '@/context/AuthContext';

type Step = 'form' | 'verify' | 'done';

type PublicZone = {
  _id: string;
  name: string;
  district: string;
  color?: string;
};

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  const initialEmail = params.get('email') || '';
  const initialStep: Step =
    params.get('step') === 'verify' && initialEmail ? 'verify' : 'form';

  const [step, setStep] = useState<Step>(initialStep);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [zones, setZones] = useState<PublicZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const [code, setCode] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const [pendingAuth, setPendingAuth] = useState<{
    accessToken: string;
    refreshToken: string;
    user: Record<string, unknown>;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadZones = async () => {
      setZonesLoading(true);
      try {
        const res = await fetch('/api/v1/public/zones');
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          setZones(data.data as PublicZone[]);
        }
      } catch {
        setZones([]);
      } finally {
        setZonesLoading(false);
      }
    };

    void loadZones();
  }, []);

  const districts = Array.from(new Set(zones.map((z) => z.district))).sort((a, b) =>
    a.localeCompare(b)
  );
  const filteredZones = district
    ? zones.filter((z) => z.district.toLowerCase() === district.toLowerCase())
    : zones;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          dni,
          email,
          password,
          phone: phone.trim() || undefined,
          address,
          district: district || undefined,
          zoneId: zoneId || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Error de registro');
      setPendingAuth({
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
        user: data.data.user,
      });
      setStep('verify');
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Código incorrecto');

      if (pendingAuth) {
        const verifiedUser = { ...pendingAuth.user, isVerified: true };
        localStorage.setItem('accessToken', pendingAuth.accessToken);
        localStorage.setItem('refreshToken', pendingAuth.refreshToken);
        localStorage.setItem('user', JSON.stringify(verifiedUser));
        setUser(verifiedUser as Parameters<typeof setUser>[0]);
      }
      setStep('done');
      setTimeout(() => router.push('/dashboard'), 2200);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = useCallback(async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setResendMsg(data.message || 'Código reenviado');
    } catch {
      setResendMsg('Error al reenviar. Intenta de nuevo.');
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  const obfuscateEmail = (e: string) => {
    const [local, domain] = e.split('@');
    if (!domain) return e;
    return `${local.slice(0, 2)}***@${domain}`;
  };

  return (
    <div className="reg-root">
      <style>{styles}</style>

      <div className={`reg-card${step === 'form' ? ' reg-card--wide' : ''}`}>
        <div className="auth-brand">
          <BrandMark size={32} />
          <span className="auth-brand-text">SRSS Cusco</span>
        </div>

        {step === 'form' && (
          <Link href="/" className="auth-back">
            <ArrowLeft style={{ width: 13, height: 13 }} />
            <span>Volver al inicio</span>
          </Link>
        )}
        {step === 'verify' && (
          <button type="button" className="auth-back" onClick={() => { setStep('form'); setError(''); }}>
            <ArrowLeft style={{ width: 13, height: 13 }} />
            <span>Volver al formulario</span>
          </button>
        )}

        {/* ── Step 1: Registration form ── */}
        {step === 'form' && (
          <>
            <div className="auth-header">
              <h2 className="auth-title">Crear cuenta ciudadana</h2>
              <p className="auth-sub">
                Registro para ciudadanos de la ciudad del Cusco.
              </p>
            </div>

            <form onSubmit={handleRegister} className="auth-form" noValidate>
              <div className="reg-grid">
                <div className="auth-field">
                  <label className="adm-form-label" htmlFor="reg-first">
                    Nombres
                  </label>
                  <input
                    id="reg-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                    className="adm-form-input"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="auth-field">
                  <label className="adm-form-label" htmlFor="reg-last">
                    Apellidos
                  </label>
                  <input
                    id="reg-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Mamani Quispe"
                    className="adm-form-input"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="reg-grid">
                <div className="auth-field">
                  <label className="adm-form-label" htmlFor="reg-dni">
                    DNI
                  </label>
                  <input
                    id="reg-dni"
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={dni}
                    onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="12345678"
                    className="adm-form-input"
                    required
                    autoComplete="off"
                  />
                  <span className="adm-form-hint">8 dígitos numéricos</span>
                </div>
                <div className="auth-field">
                  <label className="adm-form-label" htmlFor="reg-phone">
                    Teléfono{' '}
                    <span className="reg-optional">(opcional)</span>
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="987 654 321"
                    className="adm-form-input"
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="adm-form-label" htmlFor="reg-email">
                  Correo electrónico
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@gmail.com"
                  className="adm-form-input"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="reg-grid">
                <div className="auth-field">
                  <label className="adm-form-label" htmlFor="reg-district">
                    Distrito
                  </label>
                  <select
                    id="reg-district"
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setZoneId('');
                    }}
                    className="adm-form-input"
                  >
                    <option value="">Selecciona un distrito</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="auth-field">
                  <label className="adm-form-label" htmlFor="reg-zone">
                    Zona de recolección
                  </label>
                  <select
                    id="reg-zone"
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="adm-form-input"
                    disabled={zonesLoading || filteredZones.length === 0}
                  >
                    <option value="">
                      {zonesLoading
                        ? 'Cargando zonas...'
                        : filteredZones.length === 0
                          ? 'No hay zonas disponibles'
                          : 'Selecciona una zona'}
                    </option>
                    {filteredZones.map((z) => (
                      <option key={z._id} value={z._id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="auth-field">
                <label className="adm-form-label" htmlFor="reg-password">
                  Contraseña
                </label>
                <div className="pw-wrap">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="adm-form-input pw-input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="pw-toggle"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span className="adm-form-hint">Mínimo 6 caracteres</span>
              </div>

              <div className="auth-field">
                <label className="adm-form-label" htmlFor="reg-address">
                  Dirección
                </label>
                <input
                  id="reg-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. El Sol 123, Cusco"
                  className="adm-form-input"
                  required
                  autoComplete="street-address"
                />
                <span className="adm-form-hint">
                  Usada para asignarte automáticamente a tu zona de recolección
                </span>
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  <span className="auth-error-dot" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="adm-btn-primary auth-submit"
              >
                {submitting ? (
                  <Loader2
                    style={{ width: 16, height: 16, animation: 'reg-spin 0.7s linear infinite' }}
                  />
                ) : (
                  'Crear cuenta'
                )}
              </button>

              <p className="reg-login-hint">
                ¿Ya tenés cuenta?{' '}
                <Link href="/" className="reg-text-link">
                  Iniciar sesión
                </Link>
              </p>
            </form>
          </>
        )}

        {/* ── Step 2: Email verification ── */}
        {step === 'verify' && (
          <>
            <div className="reg-verify-header">
              <div className="reg-verify-icon">
                <MailCheck size={26} />
              </div>
              <h2 className="auth-title">Verificá tu correo</h2>
              <p className="auth-sub">
                Enviamos un código de 6 dígitos a{' '}
                <strong>{obfuscateEmail(email)}</strong>. Ingrésalo para activar tu cuenta.
              </p>
            </div>

            <form onSubmit={handleVerify} className="auth-form" noValidate>
              <div className="auth-field">
                <label className="adm-form-label" htmlFor="reg-code">
                  Código de verificación
                </label>
                <input
                  id="reg-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="adm-form-input reg-code-input"
                  required
                  autoComplete="one-time-code"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                <span className="adm-form-hint">
                  Entorno académico: el código se imprime en la consola del servidor.
                </span>
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  <span className="auth-error-dot" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              {resendMsg && (
                <div className="reg-resend-ok" role="status">
                  {resendMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || code.length < 6}
                className="adm-btn-primary auth-submit"
              >
                {submitting ? (
                  <Loader2
                    style={{ width: 16, height: 16, animation: 'reg-spin 0.7s linear infinite' }}
                  />
                ) : (
                  'Verificar cuenta'
                )}
              </button>

              <div className="reg-resend-row">
                <span>¿No recibiste el código?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="reg-text-link"
                  style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}
                >
                  {resendLoading ? 'Enviando…' : 'Reenviar código'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 3: Success ── */}
        {step === 'done' && (
          <div className="reg-done">
            <div className="reg-done-icon">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="auth-title" style={{ marginBottom: 8 }}>
              ¡Cuenta activada!
            </h2>
            <p className="auth-sub">
              Tu cuenta fue verificada correctamente. Redirigiendo al dashboard…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}

const styles = `
  @keyframes reg-spin { to { transform: rotate(360deg); } }

  .reg-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 18px;
    background: #FFFFFF;
    font-family: 'Geist', 'Outfit', sans-serif;
    color: var(--color-ink);
  }

  .reg-card {
    width: 100%;
    max-width: 460px;
    background: #FFFFFF;
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 30px 28px;
    box-shadow: 0 1px 0 #ECF4F0, 0 12px 36px -18px rgba(0, 30, 43, 0.10);
  }
  .reg-card--wide {
    max-width: 540px;
  }

  /* ── Brand header ── */
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

  /* ── Back link ── */
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
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .auth-back:hover { color: var(--color-atlas); }

  /* ── Header ── */
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

  /* ── Form ── */
  .auth-form { display: flex; flex-direction: column; gap: 13px; }
  .auth-field { display: flex; flex-direction: column; gap: 5px; }
  .auth-field .adm-form-input { height: 40px; }

  .reg-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 11px;
  }
  @media (max-width: 479px) {
    .reg-grid { grid-template-columns: 1fr; }
  }

  .reg-optional {
    font-size: 10px;
    font-weight: 400;
    color: var(--color-ink-soft);
    text-transform: none;
    letter-spacing: 0;
  }

  /* ── Error banner ── */
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

  /* ── Submit button ── */
  .auth-submit {
    width: 100%;
    justify-content: center;
    height: 42px;
    font-size: 13.5px;
    margin-top: 2px;
  }

  /* ── Login hint ── */
  .reg-login-hint {
    text-align: center;
    font-size: 12.5px;
    color: var(--color-ink-muted);
    margin: 0;
  }
  .reg-text-link {
    color: var(--color-atlas);
    font-weight: 600;
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .reg-text-link:hover { color: var(--color-atlas-dark); }

  /* ── Verify step ── */
  .reg-verify-header {
    text-align: center;
    margin-bottom: 22px;
  }
  .reg-verify-icon {
    width: 58px;
    height: 58px;
    border-radius: 14px;
    background: var(--color-atlas-soft);
    color: var(--color-atlas-dark);
    border: 1px solid var(--color-atlas-border);
    margin: 0 auto 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reg-code-input {
    text-align: center;
    font-size: 22px !important;
    font-weight: 600 !important;
    letter-spacing: 0.24em;
    height: 52px !important;
    font-family: 'Geist Mono', ui-monospace, monospace !important;
  }

  .reg-resend-ok {
    padding: 9px 12px;
    border-radius: 6px;
    background: #E3FCEF;
    border: 1px solid var(--color-atlas-border);
    color: var(--color-atlas-dark);
    font-size: 12.5px;
    font-weight: 500;
  }

  .reg-resend-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 12.5px;
    color: var(--color-ink-muted);
    flex-wrap: wrap;
  }

  /* ── Done step ── */
  .reg-done {
    text-align: center;
    padding: 12px 0 8px;
  }
  .reg-done-icon {
    width: 60px;
    height: 60px;
    border-radius: 14px;
    background: var(--color-atlas-soft);
    color: var(--color-atlas-dark);
    border: 1px solid var(--color-atlas-border);
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 479px) {
    .reg-root { padding: 24px 16px; }
    .reg-card { padding: 24px 18px; }
    .auth-title { font-size: 21px; }
  }
`;

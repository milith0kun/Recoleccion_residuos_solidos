'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Route,
  MapPin,
  AlertTriangle,
  BarChart3,
  Recycle,
  Users,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { IconTile } from '@/components/ui';

export default function LandingPage() {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isAdmin, isLoading, router]);

  return (
    <div className="landing">
      <style>{styles}</style>

      <header className="landing-nav">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="M16 4C16 4 8 10 8 18C8 23 11 27 16 27C21 27 24 23 24 18C24 10 16 4 16 4Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="brand-word">SRSS Cusco</span>
        </Link>
        <nav className="nav-links">
          <a href="#caracteristicas" className="nav-link">Características</a>
          <a href="#actores" className="nav-link">Para quién</a>
          <a href="#modulos" className="nav-link">Módulos</a>
          <Link href="/login" className="ui-btn ui-btn--secondary ui-btn--sm">
            Iniciar sesión
          </Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-inner stagger">
            <div className="hero-copy animate-fade-up">
              <span className="hero-eyebrow">
                <span className="hero-eyebrow-dot" />
                Municipalidad Provincial del Cusco
              </span>
              <h1 className="hero-title text-display">
                Recolección inteligente
                <br />
                de residuos sólidos
                <br />
                <em className="hero-italic">para la ciudad del Cusco.</em>
              </h1>
              <p className="hero-sub">
                Plataforma de gestión ambiental urbana que integra rutas de recolección, zonas
                geográficas, seguimiento GPS en tiempo real y participación ciudadana en una sola
                experiencia.
              </p>
              <div className="hero-cta">
                <Link href="/login" className="ui-btn ui-btn--primary ui-btn--lg">
                  Ingresar al panel
                  <ArrowRight size={16} />
                </Link>
                <a href="#caracteristicas" className="ui-btn ui-btn--ghost-bordered ui-btn--lg">
                  Conocer el sistema
                </a>
              </div>
              <p className="hero-fineprint">
                Acceso restringido a personal autorizado. Ciudadanos y operadores usan la
                aplicación móvil SRSS Cusco.
              </p>
            </div>

            <aside className="hero-card animate-fade-up" aria-hidden>
              <div className="hero-card-head">
                <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                  Resumen operativo
                </span>
                <span className="ui-badge ui-badge--green">
                  <span className="ui-badge-dot" />
                  En vivo
                </span>
              </div>

              <div className="hero-card-stats">
                <Stat number="24" label="Zonas activas" />
                <Stat number="8" label="Rutas en curso" />
                <Stat number="312" label="Reportes ciudadanos" />
              </div>

              <div className="hero-card-row">
                <IconTile tone="green">
                  <Route size={20} />
                </IconTile>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                    Ruta Centro AM · 06:30
                  </div>
                  <div className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                    Camión 8 · Centro Histórico
                  </div>
                </div>
                <ChevronRight size={16} color="var(--color-text-faint)" />
              </div>

              <div className="hero-card-row">
                <IconTile tone="amber">
                  <AlertTriangle size={20} />
                </IconTile>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                    Incidencia reportada
                  </div>
                  <div className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                    Wanchaq · Hace 12 minutos
                  </div>
                </div>
                <ChevronRight size={16} color="var(--color-text-faint)" />
              </div>

              <div className="hero-card-row">
                <IconTile tone="blue">
                  <MapPin size={20} />
                </IconTile>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                    GPS en tiempo real
                  </div>
                  <div className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                    Actualizado cada 10 segundos
                  </div>
                </div>
                <ChevronRight size={16} color="var(--color-text-faint)" />
              </div>
            </aside>
          </div>
        </section>

        <section id="caracteristicas" className="features-section">
          <div className="section-inner">
            <div className="section-head">
              <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                Características
              </span>
              <h2 className="text-h1" style={{ marginTop: 8 }}>
                Una plataforma. Tres roles. Un solo sistema.
              </h2>
              <p
                className="text-body"
                style={{ color: 'var(--color-text-muted)', marginTop: 12, maxWidth: 640 }}
              >
                Cada actor tiene una experiencia diseñada para su rol: panel administrativo
                web para la municipalidad, app móvil para operadores y ciudadanos.
              </p>
            </div>

            <div id="actores" className="features-grid stagger">
              <FeatureCard
                tone="green"
                icon={<Users size={22} />}
                title="Administrador municipal"
                description="Gestiona zonas, rutas, vehículos, operadores y residuos. Consulta reportes y métricas de cumplimiento en tiempo real."
                tag="Web · Panel"
              />
              <FeatureCard
                tone="blue"
                icon={<Route size={22} />}
                title="Operador de recolección"
                description="Ejecuta rutas planificadas desde la app móvil, registra incidencias operativas y emite tracking GPS continuo."
                tag="Móvil · Operativo"
              />
              <FeatureCard
                tone="amber"
                icon={<MapPin size={22} />}
                title="Ciudadano del Cusco"
                description="Consulta horarios de su zona, recibe alertas de cercanía del camión y reporta incidencias con foto y geolocalización."
                tag="Móvil · Comunidad"
              />
            </div>
          </div>
        </section>

        <section id="modulos" className="modules-section">
          <div className="section-inner">
            <div className="section-head">
              <span className="text-tiny" style={{ color: 'var(--color-text-muted)' }}>
                Módulos del sistema
              </span>
              <h2 className="text-h1" style={{ marginTop: 8 }}>
                Cobertura integral, del catálogo a la analítica.
              </h2>
            </div>

            <div className="modules-grid stagger">
              <ModuleCard
                icon={<Users size={20} />}
                title="Gestión de usuarios y zonas"
                items={[
                  'Registro ciudadano con asignación geográfica',
                  'Autenticación segura con JWT y Google',
                  'Mapa interactivo para definir zonas en GeoJSON',
                ]}
              />
              <ModuleCard
                icon={<Recycle size={20} />}
                title="Gestión de residuos"
                items={[
                  'Catálogo por categoría: orgánico, reciclable, peligroso',
                  'Guía visual NTP 900.058 para ciudadanos',
                  'Instrucciones de manejo y código de colores',
                ]}
              />
              <ModuleCard
                icon={<Route size={20} />}
                title="Monitoreo de rutas"
                items={[
                  'Visualización en mapa con paradas y horarios',
                  'Seguimiento GPS en tiempo real cada 10 s',
                  'Asignación vehículo-operador-zona',
                ]}
              />
              <ModuleCard
                icon={<AlertTriangle size={20} />}
                title="Sistema de alertas"
                items={[
                  'Notificación push de cercanía del camión',
                  'Alertas de retraso o cambio de horario',
                  'Reporte ciudadano con foto y ubicación',
                ]}
              />
              <ModuleCard
                icon={<BarChart3 size={20} />}
                title="Reportes y analítica"
                items={[
                  'Volumen de residuos por zona y categoría',
                  'Cumplimiento de rutas y desviaciones',
                  'Participación ciudadana y métricas de impacto',
                ]}
              />
              <ModuleCard
                icon={<MapPin size={20} />}
                title="Aplicación móvil"
                items={[
                  'Consulta de horarios offline',
                  'Educación sobre segregación',
                  'Reporte de incidencias con cámara y GPS',
                ]}
              />
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="section-inner">
            <div className="cta-card">
              <div>
                <h2 className="text-h1">¿Sos parte del personal municipal?</h2>
                <p
                  className="text-body"
                  style={{ color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 520 }}
                >
                  Accedé al panel administrativo con tu cuenta institucional. Si sos ciudadano u
                  operador, descargá la app móvil SRSS Cusco.
                </p>
              </div>
              <Link href="/login" className="ui-btn ui-btn--primary ui-btn--lg">
                Ingresar al panel
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <div className="section-inner foot-inner">
          <div>
            <span className="text-tiny" style={{ color: 'var(--color-text-faint)' }}>
              © 2026 Municipalidad Provincial del Cusco
            </span>
          </div>
          <div className="foot-links">
            <span>Gerencia de Medio Ambiente</span>
            <span className="foot-sep">·</span>
            <a href="https://www.gob.pe/munic" className="foot-link">Web institucional</a>
            <span className="foot-sep">·</span>
            <a href="#" className="foot-link">Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat-num">{number}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function FeatureCard({
  tone,
  icon,
  title,
  description,
  tag,
}: {
  tone: 'green' | 'blue' | 'amber';
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
}) {
  return (
    <article className="feature-card animate-fade-up">
      <IconTile tone={tone} size="lg">
        {icon}
      </IconTile>
      <span
        className="text-tiny"
        style={{ color: 'var(--color-text-muted)', marginTop: 20, display: 'block' }}
      >
        {tag}
      </span>
      <h3 className="text-h2" style={{ marginTop: 6, color: 'var(--color-text)' }}>
        {title}
      </h3>
      <p className="text-body" style={{ color: 'var(--color-text-muted)', marginTop: 10 }}>
        {description}
      </p>
    </article>
  );
}

function ModuleCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <article className="module-card animate-fade-up">
      <div className="module-head">
        <IconTile tone="green">{icon}</IconTile>
        <h3 className="text-h3" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
      </div>
      <ul className="module-list">
        {items.map((i) => (
          <li key={i}>
            <span className="module-dot" aria-hidden />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

const styles = `
  .landing {
    min-height: 100vh;
    background:
      radial-gradient(900px 600px at 90% -10%, rgba(0,104,74,0.06), transparent 60%),
      radial-gradient(700px 500px at -10% 30%, rgba(0,104,74,0.04), transparent 60%),
      var(--color-canvas);
  }

  .landing-nav {
    height: 64px;
    padding: 0 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: rgba(249, 251, 250, 0.85);
    backdrop-filter: saturate(140%) blur(8px);
    -webkit-backdrop-filter: saturate(140%) blur(8px);
    border-bottom: 1px solid var(--color-line-soft);
    z-index: 10;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark {
    width: 26px; height: 26px;
    color: var(--color-primary);
    display: grid; place-items: center;
  }
  .brand-mark svg { width: 100%; height: 100%; }
  .brand-word {
    font-family: var(--font-display);
    font-size: 19px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-text);
    font-variation-settings: "opsz" 36;
  }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 28px;
  }
  .nav-link {
    font-size: 14px;
    color: var(--color-text-muted);
    transition: color 0.15s ease;
  }
  .nav-link:hover { color: var(--color-text); }

  @media (max-width: 720px) {
    .landing-nav { padding: 0 20px; }
    .nav-links { gap: 12px; }
    .nav-link:not(:last-child) { display: none; }
  }

  .landing-main { padding-bottom: 80px; }

  /* HERO */
  .hero { padding: 80px 32px 48px; }
  .hero-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 64px;
    align-items: center;
  }
  @media (max-width: 1024px) {
    .hero-inner { grid-template-columns: 1fr; gap: 48px; }
    .hero { padding: 56px 24px 40px; }
  }

  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    padding: 6px 14px 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-muted);
    margin-bottom: 28px;
  }
  .hero-eyebrow-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
    box-shadow: 0 0 0 4px rgba(0,104,74,0.18);
  }

  .hero-title {
    color: var(--color-text);
    font-weight: 500;
  }
  .hero-italic {
    font-style: italic;
    color: var(--color-primary);
    font-weight: 400;
  }
  .hero-sub {
    margin-top: 24px;
    font-size: 17px;
    line-height: 1.6;
    color: var(--color-text-muted);
    max-width: 540px;
  }

  .hero-cta {
    display: flex;
    gap: 12px;
    margin-top: 36px;
    flex-wrap: wrap;
  }
  .hero-fineprint {
    margin-top: 20px;
    font-size: 12.5px;
    color: var(--color-text-faint);
    max-width: 480px;
  }

  /* Hero card */
  .hero-card {
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: 14px;
    padding: 24px;
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
  }
  .hero-card::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 15px;
    border: 1px solid transparent;
    background: linear-gradient(140deg, rgba(0,104,74,0.18), transparent 50%) border-box;
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .hero-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .hero-card-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 16px 0;
    border-top: 1px solid var(--color-line-soft);
    border-bottom: 1px solid var(--color-line-soft);
  }
  .stat { display: flex; flex-direction: column; gap: 2px; }
  .stat-num {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 500;
    color: var(--color-text);
    letter-spacing: -0.02em;
    font-variation-settings: "opsz" 36;
  }
  .stat-label {
    font-size: 11.5px;
    color: var(--color-text-muted);
    font-weight: 500;
  }
  .hero-card-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0;
  }

  /* SECTIONS */
  .section-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 32px;
  }
  @media (max-width: 720px) {
    .section-inner { padding: 0 20px; }
  }
  .features-section, .modules-section, .cta-section {
    padding: 80px 0;
  }
  @media (max-width: 720px) {
    .features-section, .modules-section, .cta-section { padding: 56px 0; }
  }

  .section-head {
    max-width: 720px;
    margin-bottom: 48px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) {
    .features-grid { grid-template-columns: 1fr; }
  }
  .feature-card {
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: 12px;
    padding: 28px;
  }

  .modules-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--color-line);
    border: 1px solid var(--color-line);
    border-radius: 12px;
    overflow: hidden;
  }
  @media (max-width: 1024px) {
    .modules-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .modules-grid { grid-template-columns: 1fr; }
  }
  .module-card {
    background: var(--color-paper);
    padding: 28px;
  }
  .module-head {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }
  .module-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .module-list li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    color: var(--color-text-muted);
    line-height: 1.5;
  }
  .module-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-primary);
    margin-top: 9px;
    flex-shrink: 0;
  }

  /* CTA */
  .cta-card {
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: 14px;
    padding: 40px 44px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    flex-wrap: wrap;
  }
  @media (max-width: 720px) {
    .cta-card { padding: 28px; }
  }

  /* FOOTER */
  .landing-foot {
    border-top: 1px solid var(--color-line);
    padding: 28px 0;
    background: var(--color-paper);
  }
  .foot-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .foot-links {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12.5px;
    color: var(--color-text-muted);
  }
  .foot-sep { color: var(--color-text-faint); }
  .foot-link { transition: color 0.15s ease; }
  .foot-link:hover { color: var(--color-text); }
`;

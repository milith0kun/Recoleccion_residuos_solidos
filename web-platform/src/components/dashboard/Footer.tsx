'use client';

import Link from 'next/link';

export function DashboardFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="adm-footer">
      <div className="adm-footer-inner">
        <div className="adm-footer-status">
          <span className="adm-system-status-dot" />
          <span>Estado del sistema:</span>
          <strong>Operativo</strong>
        </div>

        <div className="adm-footer-meta">
          <span>© {year} SRSS Cusco</span>
          <span className="adm-footer-sep" aria-hidden>·</span>
          <span className="adm-footer-affil">
            Municipalidad Provincial del Cusco
          </span>

          <nav className="adm-footer-links" aria-label="Pie de página">
            <Link href="/dashboard/reports">Reportes</Link>
            <Link href="/dashboard/profile">Soporte</Link>
            <a
              href="https://github.com/milith0kun/Recoleccion_residuos_solidos#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentación
            </a>
            <a
              href="https://www.gob.pe/institucion/munidelcusco/normas-legales"
              target="_blank"
              rel="noopener noreferrer"
            >
              Términos
            </a>
            <span className="adm-footer-norm" title="Norma Técnica Peruana">
              NTP 900.058
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}

'use client';

interface BrandMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Logo institucional SRSS Cusco — 3 tachos de residuos en tonos de verde
 * (orgánicos, reciclables, peligrosos). Reutilizable en sidebar, login,
 * auth y access-restricted. Mantener coherencia visual del sistema.
 */
export function BrandMark({ size = 36, className, title }: BrandMarkProps) {
  const w = size;
  const h = Math.round(size * (32 / 36));
  return (
    <span className={className} aria-hidden={title ? undefined : true}>
      {title ? <span className="sr-only">{title}</span> : null}
      <svg
        viewBox="0 0 36 32"
        width={w}
        height={h}
        fill="none"
        role={title ? 'img' : 'presentation'}
      >
        {/* Tacho 1 — orgánicos · verde profundo */}
        <rect x="0.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#00513A" />
        <rect x="1.5" y="9.5" width="9" height="20" rx="1.5" fill="#00684A" />
        <rect x="3.5" y="13.5" width="5" height="1" rx="0.5" fill="#E3FCEF" opacity="0.45" />
        <rect x="3.5" y="17" width="5" height="1" rx="0.5" fill="#E3FCEF" opacity="0.45" />
        <rect x="3.5" y="20.5" width="5" height="1" rx="0.5" fill="#E3FCEF" opacity="0.45" />

        {/* Tacho 2 — reciclables · verde medio */}
        <rect x="12.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#007F4A" />
        <rect x="13.5" y="9.5" width="9" height="20" rx="1.5" fill="#00A35C" />
        <path
          d="M18 13.5 C15.3 16 15.3 19 18 22 C20.7 19 20.7 16 18 13.5 Z"
          fill="#E3FCEF"
          opacity="0.85"
        />

        {/* Tacho 3 — peligrosos · verde claro */}
        <rect x="24.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#3A9F6A" />
        <rect x="25.5" y="9.5" width="9" height="20" rx="1.5" fill="#5BC18C" />
        <circle cx="30" cy="18" r="2.6" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.95" />
        <circle cx="30" cy="18" r="0.9" fill="#FFFFFF" opacity="0.95" />
      </svg>
    </span>
  );
}

interface BrandLockupProps {
  size?: number;
  variant?: 'light' | 'dark';
}

/**
 * BrandMark + texto "SRSS Cusco" en Newsreader serif. Para top bars,
 * cards de auth, headers públicos. Variant dark invierte para fondos oscuros.
 */
export function BrandLockup({ size = 28, variant = 'light' }: BrandLockupProps) {
  const isDark = variant === 'dark';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <BrandMark size={size} />
      <span
        style={{
          fontFamily: "'Newsreader', 'EB Garamond', Georgia, serif",
          fontWeight: 500,
          fontSize: Math.round(size * 0.62),
          color: isDark ? '#FFFFFF' : '#001E2B',
          letterSpacing: '-0.012em',
          lineHeight: 1,
          fontVariationSettings: '"opsz" 24',
        }}
      >
        SRSS Cusco
      </span>
    </span>
  );
}

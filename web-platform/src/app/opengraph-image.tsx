import { ImageResponse } from 'next/og';

export const alt = 'SRSS Cusco — Sistema de Recolección de Residuos Sólidos Segregados';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * OG image — diseño centrado para que se vea bien tanto en preview
 * cuadrado (Telegram, WhatsApp, Discord thumbs) como en expanded (Slack,
 * Twitter, LinkedIn 1200×630). Brand mark grande arriba + título serif
 * centrado + URL al fondo. Composición vertical simétrica.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #00513A 0%, #00684A 50%, #007F4A 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: '64px 80px',
          position: 'relative',
        }}
      >
        {/* Layer decorativo de fondo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'radial-gradient(circle at 85% 12%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 15% 92%, rgba(16,185,129,0.30), transparent 50%)',
          }}
        />

        {/* BrandMark grande centrado */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <svg viewBox="0 0 36 32" width={180} height={Math.round(180 * 32 / 36)} fill="none">
            <rect x="0.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#FFFFFF" />
            <rect x="1.5" y="9.5" width="9" height="20" rx="1.5" fill="#FFFFFF" />
            <rect x="3.5" y="13.5" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />
            <rect x="3.5" y="17" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />
            <rect x="3.5" y="20.5" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />

            <rect x="12.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#C1F1D6" />
            <rect x="13.5" y="9.5" width="9" height="20" rx="1.5" fill="#E3FCEF" />
            <path
              d="M18 13.5 C15.3 16 15.3 19 18 22 C20.7 19 20.7 16 18 13.5 Z"
              fill="#00684A"
              opacity="0.7"
            />

            <rect x="24.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#A7E0BD" />
            <rect x="25.5" y="9.5" width="9" height="20" rx="1.5" fill="#C1F1D6" />
            <circle cx="30" cy="18" r="2.6" fill="none" stroke="#00513A" strokeWidth="1" opacity="0.9" />
            <circle cx="30" cy="18" r="0.9" fill="#00513A" opacity="0.9" />
          </svg>
        </div>

        {/* Eyebrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 18px',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 999,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#A7F3D0',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 9,
              height: 9,
              borderRadius: 999,
              background: '#34D399',
              boxShadow: '0 0 0 4px rgba(52,211,153,0.25)',
            }}
          />
          SRSS · Cusco
        </div>

        {/* Título principal */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.8,
            color: '#FFFFFF',
            textAlign: 'center',
            marginBottom: 18,
            maxWidth: 980,
          }}
        >
          Recolección de residuos segregados
        </div>

        {/* Subtítulo */}
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            lineHeight: 1.4,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.82)',
            textAlign: 'center',
            maxWidth: 820,
            marginBottom: 36,
          }}
        >
          Plataforma de gestión ambiental urbana del Cusco — rutas, vehículos y seguimiento GPS en tiempo real.
        </div>

        {/* Footer URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            fontSize: 20,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
          }}
        >
          <span>srss.ecosdelseo.com</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>Municipalidad Provincial del Cusco</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from 'next/og';

export const alt = 'SRSS Cusco — Sistema de Recolección de Residuos Sólidos Segregados';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background:
            'linear-gradient(135deg, #064E3B 0%, #047857 45%, #059669 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
          padding: 72,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 15% 95%, rgba(16,185,129,0.35), transparent 50%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '58%',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              alignSelf: 'flex-start',
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#A7F3D0',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: '#34D399',
                boxShadow: '0 0 0 4px rgba(52,211,153,0.25)',
              }}
            />
            SRSS · Cusco
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 86,
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: -2,
                marginBottom: 20,
                color: '#FFFFFF',
              }}
            >
              Recolección de
              <br />
              residuos
              <br />
              <span style={{ color: '#6EE7B7' }}>segregados.</span>
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.35,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.78)',
                maxWidth: 560,
              }}
            >
              Gestión ambiental urbana en tiempo real — rutas, zonas, vehículos y seguimiento GPS para la ciudad del Cusco.
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              fontSize: 20,
              color: 'rgba(255,255,255,0.65)',
              fontWeight: 500,
            }}
          >
            <span>srss.ecosdelseo.com</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Municipalidad Provincial del Cusco</span>
          </div>
        </div>

        <div
          style={{
            width: '42%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 56,
              borderRadius: 32,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.28)',
            }}
          >
            <svg viewBox="0 0 36 32" width={320} height={Math.round(320 * 32 / 36)} fill="none">
              {/* Tacho 1 — orgánicos */}
              <rect x="0.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#FFFFFF" />
              <rect x="1.5" y="9.5" width="9" height="20" rx="1.5" fill="#FFFFFF" />
              <rect x="3.5" y="13.5" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />
              <rect x="3.5" y="17" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />
              <rect x="3.5" y="20.5" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />

              {/* Tacho 2 — reciclables */}
              <rect x="12.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#C1F1D6" />
              <rect x="13.5" y="9.5" width="9" height="20" rx="1.5" fill="#E3FCEF" />
              <path
                d="M18 13.5 C15.3 16 15.3 19 18 22 C20.7 19 20.7 16 18 13.5 Z"
                fill="#00684A"
                opacity="0.7"
              />

              {/* Tacho 3 — peligrosos */}
              <rect x="24.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#A7E0BD" />
              <rect x="25.5" y="9.5" width="9" height="20" rx="1.5" fill="#C1F1D6" />
              <circle cx="30" cy="18" r="2.6" fill="none" stroke="#00513A" strokeWidth="1" opacity="0.9" />
              <circle cx="30" cy="18" r="0.9" fill="#00513A" opacity="0.9" />
            </svg>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

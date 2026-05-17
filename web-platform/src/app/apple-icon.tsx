import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Apple touch icon — 180×180 PNG generado por Next.js. Coherente con
 * el BrandMark del dashboard (3 tachos con tapa + cuerpo + detalle interno)
 * pero con colores invertidos para contraste sobre el fondo verde Atlas,
 * de modo que destaque en la home screen de iOS.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #00684A 0%, #00513A 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 36 32" width={138} height={Math.round(138 * 32 / 36)} fill="none">
          {/* Tacho 1 — tapa + cuerpo + 3 líneas internas */}
          <rect x="0.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#FFFFFF" />
          <rect x="1.5" y="9.5" width="9" height="20" rx="1.5" fill="#FFFFFF" />
          <rect x="3.5" y="13.5" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />
          <rect x="3.5" y="17" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />
          <rect x="3.5" y="20.5" width="5" height="1" rx="0.5" fill="#00684A" opacity="0.55" />

          {/* Tacho 2 — tapa + cuerpo + gota */}
          <rect x="12.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#C1F1D6" />
          <rect x="13.5" y="9.5" width="9" height="20" rx="1.5" fill="#E3FCEF" />
          <path
            d="M18 13.5 C15.3 16 15.3 19 18 22 C20.7 19 20.7 16 18 13.5 Z"
            fill="#00684A"
            opacity="0.75"
          />

          {/* Tacho 3 — tapa + cuerpo + ojo de buey */}
          <rect x="24.5" y="6.5" width="11" height="2.6" rx="1.1" fill="#A7E0BD" />
          <rect x="25.5" y="9.5" width="9" height="20" rx="1.5" fill="#C1F1D6" />
          <circle cx="30" cy="18" r="2.6" fill="none" stroke="#00513A" strokeWidth="1" opacity="0.9" />
          <circle cx="30" cy="18" r="0.9" fill="#00513A" opacity="0.9" />
        </svg>
      </div>
    ),
    { ...size },
  );
}

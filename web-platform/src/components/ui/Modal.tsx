'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  description?: string;
}

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: '440px',
  md: '560px',
  lg: '720px',
  xl: '880px',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  description,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // Mount flag for SSR-safe portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Lock body scroll cuando está abierto
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;
  const panelWidth = sizeMap[size];

  // Render into <body> via portal so position: fixed escapes any ancestor
  // with `transform`/`filter`/`will-change` (which would otherwise become the
  // containing block and visually clip the modal).
  return createPortal(
    <>
      <style>{styles}</style>
      <div className="mdo-overlay" onClick={onClose} />
      <aside
        className="mdo-panel"
        style={{ maxWidth: panelWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="mdo-header">
          <div className="mdo-header-text">
            <h2 className="mdo-title">{title}</h2>
            {description ? <p className="mdo-desc">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="mdo-close"
            aria-label="Cerrar"
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className="mdo-body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}

const styles = `
  .mdo-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 30, 43, 0.42);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    animation: mdo-overlay-in 0.2s ease;
  }
  .mdo-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    z-index: 101;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
    box-shadow: -18px 0 36px -8px rgba(0, 30, 43, 0.14),
                -2px 0 8px rgba(0, 30, 43, 0.04);
    animation: mdo-panel-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Geist', 'Outfit', sans-serif;
  }
  .mdo-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 18px 22px 16px;
    border-bottom: 1px solid #E8EDEB;
    flex-shrink: 0;
  }
  .mdo-header-text {
    min-width: 0;
    flex: 1;
  }
  .mdo-title {
    font-family: 'Newsreader', 'EB Garamond', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    color: #001E2B;
    letter-spacing: -0.013em;
    line-height: 1.15;
    font-variation-settings: "opsz" 32;
    margin: 0;
  }
  .mdo-desc {
    font-family: 'Geist', 'Outfit', sans-serif;
    font-size: 12.5px;
    color: #5C6C75;
    margin: 3px 0 0;
    line-height: 1.45;
    letter-spacing: -0.003em;
  }
  .mdo-close {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: #5C6C75;
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
    flex-shrink: 0;
    margin-top: -2px;
  }
  .mdo-close:hover {
    background: #F1F4F2;
    color: #00684A;
    border-color: #E8EDEB;
  }
  .mdo-body {
    padding: 18px 22px 22px;
    overflow-y: auto;
    flex: 1;
  }

  @keyframes mdo-overlay-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes mdo-panel-in {
    from { transform: translateX(40px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .mdo-panel, .mdo-overlay { animation: none !important; }
  }

  @media (max-width: 479px) {
    .mdo-header { padding: 14px 16px 13px; gap: 10px; }
    .mdo-title { font-size: 18px; }
    .mdo-desc { font-size: 12px; }
    .mdo-body { padding: 14px 16px 18px; }
    .mdo-close { width: 28px; height: 28px; }
  }
`;

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: '420px',
  md: '480px',
  lg: '780px',
  xl: '960px',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const maxWidth = sizeMap[size];

  return (
    <>
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          animation: modalFadeIn 0.2s ease;
        }
        .modal-box {
          background: #FFFFFF;
          border-radius: 16px;
          box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalZoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #F0EEEB;
        }
        .modal-header h2 {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1A1A1A;
          letter-spacing: -0.01em;
        }
        .modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #8A8780;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .modal-close:hover {
          background: #FAFAF8;
          color: #1A1A1A;
        }
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        /* Form styles inside modal */
        .modal-body label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #5A5750;
          margin-bottom: 0.35rem;
        }
        .modal-body input,
        .modal-body select,
        .modal-body textarea {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 10px;
          border: 1.5px solid #ECEAE6;
          background: #FAFAF8;
          color: #1A1A1A;
          font-family: inherit;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .modal-body input:focus,
        .modal-body select:focus,
        .modal-body textarea:focus {
          border-color: #059669;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.06);
          outline: none;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalZoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{title}</h2>
            <button onClick={onClose} className="modal-close">
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

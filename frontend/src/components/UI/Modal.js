import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sizes = {
    sm: { maxWidth: 400 },
    md: { maxWidth: 560 },
    lg: { maxWidth: 720 },
    xl: { maxWidth: 960 }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)'
        }}
      />
      <div
        className="glass modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', ...sizes[size],
          padding: 0, overflow: 'hidden'
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 24px', borderBottom: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h3>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
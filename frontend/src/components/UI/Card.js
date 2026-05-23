import React from 'react';

const Card = ({ children, className = '', style, hoverable = true, glass = false }) => {
  const baseStyle = glass
    ? { background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-color)' }
    : { background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' };

  return (
    <div
      className={`${glass ? 'glass-card' : 'card'} ${className}`}
      style={{
        ...baseStyle,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        transition: 'all var(--transition-base)',
        ...(hoverable ? { cursor: 'default' } : {}),
        ...style
      }}
    >
      {children}
    </div>
  );
};

export default Card;

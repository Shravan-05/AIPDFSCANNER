import React from 'react';

const ProgressBar = ({ progress = 0, height = 6, variant = 'primary', style }) => {
  const colors = {
    primary: 'var(--accent-gradient)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--error)'
  };

  return (
    <div style={{
      width: '100%', height,
      background: 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden',
      ...style
    }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, progress))}%`,
        height: '100%',
        background: colors[variant] || colors.primary,
        borderRadius: 'var(--radius-full)',
        transition: 'width 300ms ease'
      }} />
    </div>
  );
};

export default ProgressBar;

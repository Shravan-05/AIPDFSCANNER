import React from 'react';
import { ScanLine, FileText, HardDrive, Star, TrendingUp } from 'lucide-react';

const CARDS = [
  {
    key: 'totalScans',
    label: 'Total Scans',
    icon: ScanLine,
    gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    glow: 'rgba(99,102,241,0.3)',
    suffix: 'docs'
  },
  {
    key: 'totalPages',
    label: 'Pages Processed',
    icon: FileText,
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    glow: 'rgba(16,185,129,0.3)',
    suffix: 'pages'
  },
  {
    key: 'storageUsed',
    label: 'Storage Used',
    icon: HardDrive,
    gradient: 'linear-gradient(135deg, #f59e0b, #f97316)',
    glow: 'rgba(245,158,11,0.3)',
    format: 'size'
  },
  {
    key: 'favoriteScans',
    label: 'Favorites',
    icon: Star,
    gradient: 'linear-gradient(135deg, #ef4444, #ec4899)',
    glow: 'rgba(239,68,68,0.3)',
    suffix: 'saved'
  }
];

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const StatsCards = ({ stats = {}, loading = false }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 16
  }}>
    {CARDS.map((card) => {
      const raw = stats[card.key] || 0;
      const display = card.format === 'size' ? formatSize(raw) : raw.toLocaleString();

      return (
        <div
          key={card.key}
          className="glass-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 200ms, box-shadow 200ms',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 12px 40px ${card.glow}, var(--shadow-md)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
        >
          {/* Decorative glow */}
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100, borderRadius: '50%',
            background: card.gradient, opacity: 0.08,
            filter: 'blur(20px)', pointerEvents: 'none'
          }} />

          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-md)',
            background: card.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${card.glow}`, flexShrink: 0
          }}>
            <card.icon size={24} color="white" />
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {card.label}
            </p>
            {loading ? (
              <div className="skeleton" style={{ width: 80, height: 28, borderRadius: 6 }} />
            ) : (
              <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                {display}
                {card.suffix && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 6 }}>
                    {card.suffix}
                  </span>
                )}
              </p>
            )}
          </div>

          <TrendingUp size={14} style={{ color: 'var(--success)', opacity: 0.7, flexShrink: 0 }} />
        </div>
      );
    })}
  </div>
);

export default StatsCards;

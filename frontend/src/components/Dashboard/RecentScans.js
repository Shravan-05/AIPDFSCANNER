import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Clock, Layers, ArrowRight } from 'lucide-react';
import EmptyState from '../UI/EmptyState';
import { getFileUrl } from '../../services/api';

const RecentScans = ({ scans = [], loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="card" style={{ height: 220, overflow: 'hidden', padding: 0 }}>
            <div className="skeleton" style={{ width: '100%', height: 130 }} />
            <div style={{ padding: 12 }}>
              <div className="skeleton" style={{ width: '75%', height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '50%', height: 11 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!scans?.length) {
    return (
      <EmptyState
        icon={ScanLine}
        title="No scans yet"
        description="Upload your first document to get started scanning"
      />
    );
  }

  const statusBadge = (status) => {
    const map = {
      completed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Done' },
      processing: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Processing' },
      draft: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1', label: 'Draft' },
      failed: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Failed' }
    };
    const s = map[status] || map.draft;
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 7px',
        borderRadius: 'var(--radius-full)',
        background: s.bg, color: s.color, letterSpacing: '0.03em'
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
      {scans.slice(0, 8).map(scan => {
        const thumb = scan.pages?.[0]?.thumbnailUrl || scan.pages?.[0]?.processedImage;

        return (
          <div
            key={scan._id}
            className="glass-card"
            style={{
              cursor: 'pointer', padding: 0, overflow: 'hidden',
              transition: 'transform 200ms, box-shadow 200ms'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.01)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(99,102,241,0.2), var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
            onClick={() => navigate(`/editor/${scan._id}`)}
          >
            {/* Thumbnail */}
            <div style={{
              height: 130,
              background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))',
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {thumb ? (
                <img
                  src={getFileUrl(thumb)}
                  alt={scan.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <ScanLine size={36} color="var(--text-tertiary)" />
              )}

              {/* Overlay arrow on hover */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                padding: 8
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ArrowRight size={13} color="white" />
                </div>
              </div>

              {/* Page count badge */}
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                borderRadius: 'var(--radius-sm)', padding: '3px 7px',
                fontSize: 10, color: 'white', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 3
              }}>
                <Layers size={9} /> {scan.totalPages || 0}
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 12px 12px' }}>
              <p style={{
                fontSize: 13, fontWeight: 600, marginBottom: 6,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: 'var(--text-primary)'
              }}>
                {scan.title}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <Clock size={10} />
                  {new Date(scan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                {statusBadge(scan.status)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentScans;

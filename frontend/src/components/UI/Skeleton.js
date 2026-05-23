import React from 'react';

const Skeleton = ({ width = '100%', height = 20, borderRadius = 'var(--radius-sm)', style }) => (
  <div
    className="skeleton"
    style={{ width, height, borderRadius, ...style }}
  />
);

export const SkeletonCard = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
    <Skeleton height={160} borderRadius="var(--radius-md)" />
    <Skeleton width="70%" height={18} />
    <Skeleton width="50%" height={14} />
    <div style={{ display: 'flex', gap: 8 }}>
      <Skeleton width={60} height={24} borderRadius="var(--radius-full)" />
      <Skeleton width={80} height={24} borderRadius="var(--radius-full)" />
    </div>
  </div>
);

export const SkeletonLine = ({ width = '100%' }) => (
  <Skeleton width={width} height={14} style={{ marginBottom: 8 }} />
);

export default Skeleton;

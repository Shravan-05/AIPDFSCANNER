import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here', description = '', action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '64px 24px', textAlign: 'center'
  }}>
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: 'var(--bg-tertiary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginBottom: 20
    }}>
      <Icon size={36} style={{ color: 'var(--text-tertiary)' }} />
    </div>
    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
      {title}
    </h3>
    {description && (
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 20 }}>
        {description}
      </p>
    )}
    {action}
  </div>
);

export default EmptyState;

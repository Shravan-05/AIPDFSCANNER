import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanLine, FileText, Settings, Layers, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scanner', icon: ScanLine, label: 'Scanner' },
  { to: '/tools/ai', icon: Sparkles, label: 'AI Editor' },
  { to: '/tools/merge', icon: Layers, label: 'Merge PDF' },
  { to: '/files', icon: FileText, label: 'Files' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
      height: '100vh',
      position: 'sticky', top: 0,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 250ms ease',
      overflow: 'hidden',
      zIndex: 50
    }}>
      <div style={{
        padding: collapsed ? '16px 12px' : '16px 20px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {!collapsed && (
          <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16, color: 'white'
            }}>A</div>
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>AuraScan</span>
          </NavLink>
        )}
        {collapsed && (
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: 'white'
          }}>A</div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed ? '10px' : '10px 14px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
              fontSize: 14, fontWeight: 500,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 150ms ease'
            })}
          >
            <link.icon size={20} />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, flexDirection: collapsed ? 'column' : 'row' }}>
        {!collapsed && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              // Trigger a logout event which will be handled globally or we can use window.location
              window.location.href = '/login';
            }}
            style={{ flex: 1, justifyContent: 'flex-start', color: 'var(--error)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span style={{ marginLeft: 8 }}>Logout</span>
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setCollapsed(!collapsed)}
          style={{ width: collapsed ? '100%' : 'auto', justifyContent: 'center' }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

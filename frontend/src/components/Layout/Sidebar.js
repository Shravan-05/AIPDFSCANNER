import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanLine, FileText, Settings, Layers, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scanner', icon: ScanLine, label: 'Scanner' },
  { to: '/tools/ai', icon: Sparkles, label: 'AI Editor' },
  { to: '/tools/merge', icon: Layers, label: 'Merge PDF' },
  { to: '/files', icon: FileText, label: 'Files' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];

const Sidebar = ({ mobileOpen, onClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const content = (
    <>
      <div style={{
        padding: collapsed && !isMobile ? '16px 12px' : '16px 12px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
        borderBottom: '1px solid var(--border-color)',
        minHeight: 56
      }}>
        {(!collapsed || isMobile) && (
          <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 16, color: 'white', flexShrink: 0
            }}>A</div>
            {(!collapsed || isMobile) && (
              <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>AuraScan</span>
            )}
          </NavLink>
        )}
        {collapsed && !isMobile && (
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: 'white', flexShrink: 0
          }}>A</div>
        )}
        {isMobile && (
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}>
            <X size={20} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => isMobile && onClose?.()}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: collapsed && !isMobile ? '10px' : '10px 14px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
              fontSize: 14, fontWeight: 500,
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              transition: 'all 150ms ease'
            })}
          >
            <link.icon size={20} />
            {(!collapsed || isMobile) && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, flexDirection: collapsed && !isMobile ? 'column' : 'row' }}>
        {!isMobile && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: collapsed ? '100%' : 'auto', justifyContent: 'center' }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          }} onClick={onClose} />
        )}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 201,
          width: 260,
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 250ms ease',
          boxShadow: mobileOpen ? '0 0 40px rgba(0,0,0,0.3)' : 'none'
        }}>
          {content}
        </aside>
      </>
    );
  }

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
      zIndex: 50,
      flexShrink: 0
    }}>
      {content}
    </aside>
  );
};

export default Sidebar;
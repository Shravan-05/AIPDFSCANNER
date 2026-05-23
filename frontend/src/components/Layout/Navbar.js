import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-nav" style={{
      position: 'sticky', top: 0, zIndex: 100,
      height: 'var(--navbar-height)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={toggleTheme} className="btn btn-ghost btn-sm" title="Toggle theme">
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ gap: 8 }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 12, fontWeight: 600
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hide-mobile" style={{ color: 'var(--text-primary)', fontSize: 14 }}>
              {user?.name || 'User'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>

          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
              <div className="glass" style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                minWidth: 200, padding: 8, marginTop: 4
              }}>
                <Link to="/settings" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}
                  onClick={() => setMenuOpen(false)}>
                  <Settings size={16} /> Settings
                </Link>
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--error)' }}
                  onClick={handleLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import React from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ value, onChange, placeholder = 'Search...', style }) => (
  <div style={{
    position: 'relative',
    display: 'flex', alignItems: 'center',
    ...style
  }}>
    <Search size={16} style={{
      position: 'absolute', left: 12,
      color: 'var(--text-tertiary)',
      pointerEvents: 'none'
    }} />
    <input
      type="text"
      className="input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ paddingLeft: 36, paddingRight: value ? 36 : 14 }}
    />
    {value && (
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onChange('')}
        style={{ position: 'absolute', right: 4, padding: 4 }}
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default SearchBar;

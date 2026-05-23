import React from 'react';
import { Sparkles } from 'lucide-react';

const SmartSuggestions = ({ suggestions = [], onSuggestionClick, isLoading = false }) => {
  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '12px', fontSize: '12px', fontWeight: '600',
        color: 'var(--text-secondary)', textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <Sparkles size={14} />
        Smart Suggestions
      </div>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Generating suggestions...
        </div>
      )}

      {!isLoading && suggestions.length > 0 && (
        <div className="suggestions-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px'
        }}>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onSuggestionClick(suggestion)}
              className="suggestion-card"
              style={{
                padding: '12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
                lineHeight: '1.4',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                {suggestion.emoji || '✨'}
              </div>
              <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {suggestion.command}
              </div>
              {suggestion.description && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {suggestion.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {!isLoading && suggestions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
          No suggestions available yet. Try uploading a PDF!
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;
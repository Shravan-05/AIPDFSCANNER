/**
 * SmartSuggestions Component
 * Displays context-aware command suggestions based on document type and state
 */

import React from 'react';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SmartSuggestions = ({ suggestions = [], onSuggestionClick, isLoading = false }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    hover: {
      y: -2,
      boxShadow: '0 12px 24px rgba(99, 102, 241, 0.15)',
      transition: { type: 'spring', stiffness: 400, damping: 40 }
    }
  };

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-color)',
      marginBottom: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        fontSize: '12px',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <Sparkles size={14} />
        Smart Suggestions
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}>
          ✨ Generating suggestions...
        </div>
      )}

      {/* Suggestions grid */}
      <AnimatePresence mode="wait">
        {!isLoading && suggestions.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '8px'
            }}
          >
            {suggestions.map((suggestion, idx) => (
              <motion.button
                key={idx}
                variants={itemVariants}
                whileHover="hover"
                onClick={() => onSuggestionClick(suggestion)}
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
                <div style={{
                  fontSize: '16px',
                  marginBottom: '4px'
                }}>
                  {suggestion.emoji || '✨'}
                </div>
                <div style={{
                  fontWeight: '500',
                  color: 'var(--text-primary)',
                  marginBottom: '2px'
                }}>
                  {suggestion.command}
                </div>
                {suggestion.description && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    {suggestion.description}
                  </div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!isLoading && suggestions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: 'var(--text-secondary)',
          fontSize: '13px'
        }}>
          No suggestions available yet. Try uploading a PDF!
        </div>
      )}
    </div>
  );
};

export default SmartSuggestions;

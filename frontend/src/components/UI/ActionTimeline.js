/**
 * ActionTimeline Component
 * Visualizes PDF action execution progress with real-time updates
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActionTimeline = ({ 
  timeline = [], 
  currentStep = '', 
  progress = 0, 
  status = 'pending',
  isExpanded = true 
}) => {
  const [expanded, setExpanded] = useState(isExpanded);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'processing':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Loader size={16} color="#6366f1" />
        </motion.div>;
      case 'pending':
        return <Clock size={16} color="var(--text-secondary)" />;
      case 'failed':
        return <AlertCircle size={16} color="#ef4444" />;
      default:
        return <Clock size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#6366f1';
      case 'pending':
        return 'var(--border-color)';
      case 'failed':
        return '#ef4444';
      default:
        return '#ccc';
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
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          padding: '0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          {status === 'processing' && (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
              <Loader size={14} color="#6366f1" />
            </motion.div>
          )}
          <span>📋 Action Timeline</span>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Progress bar */}
      <div style={{
        marginTop: '12px',
        height: '4px',
        background: 'var(--bg-tertiary)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: '2px'
          }}
        />
      </div>

      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        textAlign: 'right'
      }}>
        {progress}% complete
      </div>

      {/* Timeline items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '12px' }}
          >
            <div style={{ position: 'relative' }}>
              {timeline.map((item, idx) => {
                const isLast = idx === timeline.length - 1;
                const isActive = item.status !== 'pending';

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      paddingBottom: isLast ? '0' : '16px',
                      position: 'relative'
                    }}
                  >
                    {/* Connector line */}
                    {!isLast && (
                      <div style={{
                        position: 'absolute',
                        left: '7px',
                        top: '24px',
                        width: '2px',
                        height: `calc(100% - 8px)`,
                        background: getStatusColor(item.status),
                        opacity: item.status === 'pending' ? 0.3 : 1
                      }} />
                    )}

                    {/* Status icon */}
                    <div style={{
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {getStatusIcon(item.status)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: item.status === 'failed' ? '#ef4444' : 'var(--text-primary)',
                        marginBottom: '4px'
                      }}>
                        {item.name}
                      </div>

                      {item.timestamp && (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)'
                        }}>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </div>
                      )}

                      {item.description && (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          marginTop: '2px'
                        }}>
                          {item.description}
                        </div>
                      )}

                      {item.status === 'failed' && item.error && (
                        <div style={{
                          fontSize: '11px',
                          color: '#ef4444',
                          marginTop: '4px',
                          padding: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: '4px'
                        }}>
                          ⚠️ {item.error}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current step indicator */}
      {currentStep && expanded && (
        <div style={{
          marginTop: '16px',
          padding: '8px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          borderLeft: '3px solid #6366f1'
        }}>
          ⚡ {currentStep}
        </div>
      )}
    </div>
  );
};

export default ActionTimeline;

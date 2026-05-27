import React, { useState } from 'react';
import {
  FileText, Star, Download, Trash2, Share2,
  Edit3, MoreHorizontal, Scissors, CheckSquare, Square,
  Calendar, Layers
} from 'lucide-react';
import { getFileUrl } from '../../services/api';

const FileCard = ({
  file, onRename, onDelete, onDownload,
  onToggleFavorite, onSplit, isSelecting, isSelected, onToggleSelect,
  onShareFile
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [imgErr, setImgErr] = useState(false);

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) {
      onRename?.(file.id, newName.trim());
    }
    setIsEditing(false);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const thumbnailUrl = file.thumbnailUrl ? getFileUrl(file.thumbnailUrl) : null;

  return (
    <div
      className="glass-card"
      style={{
        position: 'relative', padding: 0, overflow: 'hidden',
        cursor: isSelecting ? 'pointer' : 'default',
        border: isSelected
          ? '2px solid var(--accent-primary)'
          : '1px solid var(--border-color)',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(99,102,241,0.2), var(--shadow-md)'
          : 'var(--shadow-sm)',
        transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
      }}
      onClick={() => isSelecting && onToggleSelect?.(file.id)}
    >
      {/* Selection Checkbox */}
      {isSelecting && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 10,
          color: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.8)',
          filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))'
        }}>
          {isSelected ? <CheckSquare size={20} fill="var(--accent-primary)" /> : <Square size={20} />}
        </div>
      )}

      {/* Favorite Button */}
      <button
        className="btn btn-ghost"
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          padding: 6, borderRadius: 'var(--radius-full)',
          background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)'
        }}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(file.id); }}
        title="Favorite"
      >
        <Star
          size={13}
          fill={file.isFavorite ? '#f59e0b' : 'none'}
          color={file.isFavorite ? '#f59e0b' : 'rgba(255,255,255,0.7)'}
        />
      </button>

      {/* Thumbnail Area */}
      <div className="file-card-thumbnail" style={{
        height: 150,
        position: 'relative', overflow: 'hidden'
      }}>
        {thumbnailUrl && !imgErr ? (
          <img
            src={thumbnailUrl}
            alt={file.name}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              transition: 'transform 300ms ease'
            }}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <FileText size={44} color="var(--text-tertiary)" />
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>PDF</p>
          </div>
        )}
        {/* Page count badge */}
        {file.pages > 1 && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-sm)', padding: '3px 8px',
            fontSize: 11, color: 'white', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <Layers size={11} /> {file.pages}p
          </div>
        )}
      </div>

      {/* Info Area */}
      <div style={{ padding: '12px 14px 14px' }}>
        {isEditing ? (
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false); }}
            autoFocus
            style={{ fontSize: 13, marginBottom: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p style={{
            fontSize: 13, fontWeight: 600, marginBottom: 6,
            color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }} title={file.name}>
            {file.name}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} />
            {formatDate(file.createdAt)}
          </div>
          <span>{formatSize(file.size)}</span>
        </div>

        {/* Actions */}
        {!isSelecting && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '5px 8px', fontSize: 12 }}
              onClick={() => onDownload?.(file.id)}
              title="Download"
            >
              <Download size={13} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '5px 8px', fontSize: 12 }}
              onClick={() => onShareFile?.(file.id)}
              title="Share PDF"
            >
              <Share2 size={13} />
            </button>

            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '5px 8px' }}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
                  <div className="glass" style={{
                    position: 'absolute', right: 0, bottom: '110%',
                    zIndex: 100, minWidth: 160, padding: 6,
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-xl)'
                  }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13 }}
                      onClick={() => { setIsEditing(true); setMenuOpen(false); }}
                    >
                      <Edit3 size={13} /> Rename
                    </button>
                    {file.pages > 1 && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13, color: 'var(--warning)' }}
                        onClick={() => { onSplit?.(file.id); setMenuOpen(false); }}
                      >
                        <Scissors size={13} /> Split Pages
                      </button>
                    )}
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 13, color: 'var(--error)' }}
                      onClick={() => { onDelete?.(file.id); setMenuOpen(false); }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(FileCard);


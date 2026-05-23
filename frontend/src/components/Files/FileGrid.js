import React from 'react';
import FileCard from './FileCard';
import EmptyState from '../UI/EmptyState';
import { FileText, Star, Download, Trash2, Share2, Edit3, Scissors, Calendar, Layers } from 'lucide-react';
import { getFileUrl } from '../../services/api';

const FileGrid = ({
  files = [], loading, view = 'grid',
  isSelecting, selected = new Set(),
  onToggleSelect, onRename, onDelete,
  onDownload, onToggleFavorite, onSplit,
  onShareFile
}) => {
  if (loading) {
    const cols = view === 'list' ? 1 : 'repeat(auto-fill, minmax(210px, 1fr))';
    return (
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="card" style={{ height: view === 'list' ? 72 : 250, overflow: 'hidden' }}>
            {view === 'grid' ? (
              <>
                <div className="skeleton" style={{ width: '100%', height: 150 }} />
                <div style={{ padding: 12 }}>
                  <div className="skeleton" style={{ width: '75%', height: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '50%', height: 11 }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: '100%' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ width: '35%', height: 11 }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!files?.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No files yet"
        description="Your exported PDFs will appear here. Scan documents and export them to see them here."
      />
    );
  }

  const commonProps = {
    isSelecting, selected,
    onToggleSelect, onRename, onDelete,
    onDownload, onToggleFavorite, onSplit,
    onShareFile
  };

  if (view === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {files.map(file => (
          <FileListRow key={file.id} file={file} {...commonProps} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
      {files.map(file => (
        <FileCard
          key={file.id}
          file={file}
          isSelected={selected.has(file.id)}
          {...commonProps}
        />
      ))}
    </div>
  );
};

// List-view row component
const FileListRow = ({
  file, isSelecting, selected, onToggleSelect,
  onRename, onDelete, onDownload, onToggleFavorite, onSplit,
  onShareFile
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [newName, setNewName] = React.useState(file.name);
  const isSelected = selected?.has(file.id);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleRename = () => {
    if (newName.trim() && newName !== file.name) onRename?.(file.id, newName.trim());
    setIsEditing(false);
  };

  const thumbnailUrl = file.thumbnailUrl ? getFileUrl(file.thumbnailUrl) : null;

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
        cursor: isSelecting ? 'pointer' : 'default',
        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
        transition: 'all 180ms', borderRadius: 'var(--radius-md)'
      }}
      onClick={() => isSelecting && onToggleSelect?.(file.id)}
    >
      {/* Thumb */}
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-md)',
        overflow: 'hidden', flexShrink: 0,
        background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={file.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'} />
        ) : (
          <FileText size={20} color="var(--text-tertiary)" />
        )}
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditing(false); }}
            autoFocus
            style={{ fontSize: 13 }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.name}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 12, color: 'var(--text-tertiary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Layers size={10} />{file.pages || 0} pages</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} />{new Date(file.createdAt).toLocaleDateString()}</span>
          <span>{formatSize(file.size)}</span>
        </div>
      </div>

      {/* Actions */}
      {!isSelecting && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => onToggleFavorite?.(file.id)}>
            <Star size={14} fill={file.isFavorite ? '#f59e0b' : 'none'} color={file.isFavorite ? '#f59e0b' : 'var(--text-tertiary)'} />
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => onDownload?.(file.id)}>
            <Download size={14} />
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => onShareFile?.(file.id)}>
            <Share2 size={14} />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => setMenuOpen(!menuOpen)}>
              <span style={{ fontSize: 16, letterSpacing: 1 }}>⋮</span>
            </button>
            {menuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
                <div className="glass" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 100, minWidth: 150, padding: 6, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)' }}>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }} onClick={() => { setIsEditing(true); setMenuOpen(false); }}>
                    <Edit3 size={13} /> Rename
                  </button>
                  {file.pages > 1 && (
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--warning)' }} onClick={() => { onSplit?.(file.id); setMenuOpen(false); }}>
                      <Scissors size={13} /> Split Pages
                    </button>
                  )}
                  <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 8, color: 'var(--error)' }} onClick={() => { onDelete?.(file.id); setMenuOpen(false); }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FileGrid);


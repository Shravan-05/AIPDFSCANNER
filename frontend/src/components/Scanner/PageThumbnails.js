import React, { useState, useRef } from 'react';
import { getFileUrl } from '../../services/api';
import { RotateCw, Trash2, Copy, GripVertical } from 'lucide-react';

/**
 * PageThumbnails — drag-and-drop reorderable page strip.
 * Reorder is fully automatic via drag. No manual buttons needed.
 */
const PageThumbnails = ({ pages = [], selectedPage, onSelect, onRotate, onDelete, onDuplicate, onReorder }) => {
  const [dragging, setDragging] = useState(null);   // index being dragged
  const [dragOver, setDragOver] = useState(null);   // index hovered over
  const dragNode = useRef(null);

  const handleDragStart = (e, index) => {
    setDragging(index);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    // small delay so the ghost image renders before transparency kicks in
    setTimeout(() => {
      if (dragNode.current) dragNode.current.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (index !== dragging) setDragOver(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragging === null || dragging === dropIndex) return;
    const reordered = [...pages];
    const [moved] = reordered.splice(dragging, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorder?.(reordered.map(p => p._id));
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    setDragging(null);
    setDragOver(null);
    dragNode.current = null;
  };

  if (!pages.length) return null;

  return (
    <div style={{
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      padding: '10px 4px',
      scrollbarWidth: 'thin',
    }}>
      {pages.map((page, index) => {
        const isSelected = selectedPage?._id === page._id;
        const isDraggingThis = dragging === index;
        const isDragTarget = dragOver === index;

        return (
          <div
            key={page._id || index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect?.(page)}
            style={{
              flexShrink: 0,
              width: 110,
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${isSelected
                ? 'var(--accent-primary)'
                : isDragTarget
                  ? 'var(--accent-secondary)'
                  : 'transparent'}`,
              boxShadow: isSelected
                ? '0 0 16px rgba(99,102,241,0.45)'
                : isDragTarget
                  ? '0 0 10px rgba(139,92,246,0.35)'
                  : 'var(--shadow-sm)',
              transform: isSelected
                ? 'scale(1.05)'
                : isDraggingThis
                  ? 'scale(0.95)'
                  : 'scale(1)',
              opacity: isDraggingThis ? 0.4 : 1,
              cursor: 'grab',
              background: 'var(--bg-secondary)',
              transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
              overflow: 'hidden',
              userSelect: 'none',
            }}
          >
            {/* Thumbnail image */}
            <div style={{ position: 'relative', height: 95, background: 'var(--bg-tertiary)' }}>
              {(page.processedImage || page.originalImage) ? (
                <img
                  src={getFileUrl(page.processedImage || page.originalImage)}
                  alt={`Page ${page.pageNumber}`}
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 11 }}>
                  No preview
                </div>
              )}

              {/* Page number badge */}
              <div style={{
                position: 'absolute', top: 5, left: 5,
                background: isSelected ? 'var(--accent-primary)' : 'rgba(0,0,0,0.65)',
                color: 'white', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                transition: 'background 200ms',
              }}>
                {index + 1}
              </div>

              {/* Drag grip indicator */}
              <div style={{
                position: 'absolute', top: 5, right: 5,
                color: 'rgba(255,255,255,0.7)',
                opacity: 0.6,
              }}>
                <GripVertical size={12} />
              </div>
            </div>

            {/* Action buttons — compact inline */}
            <div style={{
              display: 'flex', justifyContent: 'space-around',
              padding: '5px 2px', background: 'var(--bg-secondary)',
            }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '3px 5px', minWidth: 0 }}
                title="Rotate 90°"
                onClick={(e) => { e.stopPropagation(); onRotate?.(page._id); }}
              >
                <RotateCw size={11} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '3px 5px', minWidth: 0 }}
                title="Duplicate"
                onClick={(e) => { e.stopPropagation(); onDuplicate?.(page._id); }}
              >
                <Copy size={11} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '3px 5px', minWidth: 0, color: 'var(--error)' }}
                title="Delete"
                onClick={(e) => { e.stopPropagation(); onDelete?.(page._id); }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PageThumbnails;

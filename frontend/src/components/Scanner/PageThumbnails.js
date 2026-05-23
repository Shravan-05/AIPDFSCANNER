import React, { useState, useRef, useEffect } from 'react';
import { getFileUrl } from '../../services/api';
import { RotateCw, Trash2, Copy, GripVertical } from 'lucide-react';

const PageThumbnails = ({ pages = [], selectedPage, onSelect, onRotate, onDelete, onDuplicate, onReorder }) => {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragNode = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleDragStart = (e, index) => {
    setDragging(index);
    dragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
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

  // Touch-based reordering for mobile
  const handleTouchStart = (e, index) => {
    setTouchStart({ index, x: e.touches[0].clientX, y: e.touches[0].clientY });
    setDragging(index);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    e.preventDefault();
    const touch = e.touches[0];
    const container = containerRef.current;
    if (!container) return;
    const thumbnails = container.querySelectorAll('[data-thumb-index]');
    let targetIndex = touchStart.index;
    thumbnails.forEach((thumb, i) => {
      const rect = thumb.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
        targetIndex = i;
      }
    });
    if (targetIndex !== dragOver) setDragOver(targetIndex);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart || dragging === null) {
      setDragging(null);
      setTouchStart(null);
      return;
    }
    if (dragOver !== null && dragOver !== touchStart.index) {
      const reordered = [...pages];
      const [moved] = reordered.splice(touchStart.index, 1);
      reordered.splice(dragOver, 0, moved);
      onReorder?.(reordered.map(p => p._id));
    }
    setDragging(null);
    setDragOver(null);
    setTouchStart(null);
  };

  if (!pages.length) return null;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex', gap: 10, overflowX: 'auto',
        padding: '10px 4px', scrollbarWidth: 'thin',
        WebkitOverflowScrolling: 'touch'
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pages.map((page, index) => {
        const isSelected = selectedPage?._id === page._id;
        const isDraggingThis = dragging === index;
        const isDragTarget = dragOver === index;

        return (
          <div
            key={page._id || index}
            data-thumb-index={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onClick={() => onSelect?.(page)}
            style={{
              flexShrink: 0,
              minWidth: isMobile ? 100 : 110,
              width: isMobile ? 100 : 110,
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
              touchAction: 'none',
            }}
          >
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

              <div style={{
                position: 'absolute', top: 5, left: 5,
                background: isSelected ? 'var(--accent-primary)' : 'rgba(0,0,0,0.65)',
                color: 'white', fontSize: 10, fontWeight: 700,
                padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                transition: 'background 200ms',
              }}>
                {index + 1}
              </div>

              <div style={{
                position: 'absolute', top: 5, right: 5,
                color: 'rgba(255,255,255,0.7)', opacity: 0.6,
              }}>
                <GripVertical size={12} />
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-evenly',
              padding: '6px 2px', background: 'var(--bg-secondary)',
            }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: isMobile ? '6px 8px' : '3px 5px', minWidth: 0, minHeight: 32 }}
                title="Rotate 90°"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRotate?.(page._id); }}
              >
                <RotateCw size={isMobile ? 14 : 11} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: isMobile ? '6px 8px' : '3px 5px', minWidth: 0, minHeight: 32 }}
                title="Duplicate"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate?.(page._id); }}
              >
                <Copy size={isMobile ? 14 : 11} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: isMobile ? '6px 8px' : '3px 5px', minWidth: 0, minHeight: 32, color: 'var(--error)' }}
                title="Delete"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete?.(page._id); }}
              >
                <Trash2 size={isMobile ? 14 : 11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PageThumbnails;

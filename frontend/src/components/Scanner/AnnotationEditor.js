import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image, Line, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { Type, Highlighter, Eraser, Check, X, Undo } from 'lucide-react';
import { showToast } from '../UI/Toast';

const AnnotationEditor = ({ imageUrl, onSave, onCancel }) => {
  const [image] = useImage(imageUrl);
  const stageRef = useRef(null);

  const [tool, setTool] = useState('highlight'); // 'highlight', 'eraser', 'text'
  const [lines, setLines] = useState([]);
  const [texts, setTexts] = useState([]);
  const [selectedTextIndex, setSelectedTextIndex] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Fit stage to screen
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (image) {
      // Scale down image to fit in reasonable window size
      const maxW = window.innerWidth * 0.8;
      const maxH = window.innerHeight * 0.7;
      let s = 1;
      if (image.width > maxW || image.height > maxH) {
        s = Math.min(maxW / image.width, maxH / image.height);
      }
      setScale(s);
      setStageSize({ width: image.width * s, height: image.height * s });
    }
  }, [image]);

  const handleMouseDown = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.id() === 'baseImage';

    if (tool === 'text') {
      if (clickedOnEmpty) {
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        const newTexts = [...texts, { 
          text: 'Type here...', 
          x: pos.x / scale, 
          y: pos.y / scale, 
          fill: '#ef4444', 
          fontSize: 32 
        }];
        setTexts(newTexts);
        setSelectedTextIndex(newTexts.length - 1);
      }
      return;
    }

    setSelectedTextIndex(null);
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x / scale, pos.y / scale] }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || tool === 'text') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    
    // add point
    lastLine.points = lastLine.points.concat([point.x / scale, point.y / scale]);
    
    // replace last
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleSave = async () => {
    if (!stageRef.current) return;
    try {
      // We only want to export the annotations, not the base image.
      // So we temporarily hide the background image.
      const imageNode = stageRef.current.findOne('#baseImage');
      if (imageNode) imageNode.hide();

      // Export at original resolution
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 / scale });
      
      if (imageNode) imageNode.show();

      // Convert data URL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'annotation.png', { type: 'image/png' });

      onSave(file);
    } catch (err) {
      showToast.error('Failed to save annotations');
    }
  };

  const undo = () => {
    if (lines.length > 0 && tool !== 'text') {
      setLines(lines.slice(0, -1));
    } else if (texts.length > 0 && tool === 'text') {
      setTexts(texts.slice(0, -1));
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toolbar */}
      <div style={{ padding: '16px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`btn btn-sm ${tool === 'highlight' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool('highlight')}>
            <Highlighter size={16} /> Highlight
          </button>
          <button className={`btn btn-sm ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool('eraser')}>
            <Eraser size={16} /> Whiteout
          </button>
          <button className={`btn btn-sm ${tool === 'text' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool('text')}>
            <Type size={16} /> Add Text
          </button>
          <div style={{ width: 1, background: 'var(--border-color)', margin: '0 8px' }} />
          <button className="btn btn-sm btn-ghost" onClick={undo} title="Undo last action">
            <Undo size={16} /> Undo
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            <X size={16} /> Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <Check size={16} /> Save Edits
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, background: 'var(--bg-tertiary)' }}>
        <div style={{ boxShadow: 'var(--shadow-xl)', background: 'white' }}>
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            ref={stageRef}
          >
            <Layer>
              {image && (
                <Image id="baseImage" image={image} />
              )}
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.tool === 'eraser' ? '#ffffff' : 'rgba(255, 235, 59, 0.4)'}
                  strokeWidth={line.tool === 'eraser' ? 30 : 20}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === 'eraser' ? 'source-over' : 'source-over'
                  }
                />
              ))}
              {texts.map((t, i) => (
                <KonvaText
                  key={i}
                  x={t.x}
                  y={t.y}
                  text={t.text}
                  fontSize={t.fontSize}
                  fill={t.fill}
                  draggable
                  onClick={() => { setTool('text'); setSelectedTextIndex(i); }}
                  onTap={() => { setTool('text'); setSelectedTextIndex(i); }}
                  onDragStart={() => setSelectedTextIndex(i)}
                  onDragEnd={(e) => {
                    const newTexts = [...texts];
                    newTexts[i] = { ...newTexts[i], x: e.target.x(), y: e.target.y() };
                    setTexts(newTexts);
                  }}
                  stroke={selectedTextIndex === i ? '#6366f1' : null}
                  strokeWidth={selectedTextIndex === i ? 2 : 0}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Floating Text Editor Menu */}
      {selectedTextIndex !== null && texts[selectedTextIndex] && (
        <div style={{
          position: 'absolute',
          top: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)', padding: '12px 16px', 
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          display: 'flex', gap: 16, alignItems: 'center', zIndex: 1001
        }}>
          <input
            autoFocus
            type="text"
            className="input input-sm"
            style={{ minWidth: 200, fontWeight: 600 }}
            value={texts[selectedTextIndex].text}
            onChange={(e) => {
              const newTexts = [...texts];
              newTexts[selectedTextIndex].text = e.target.value;
              setTexts(newTexts);
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Color</label>
            <input 
              type="color" 
              style={{ width: 30, height: 30, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
              value={texts[selectedTextIndex].fill}
              onChange={(e) => {
                const newTexts = [...texts];
                newTexts[selectedTextIndex].fill = e.target.value;
                setTexts(newTexts);
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Size</label>
            <input 
              type="range" min="12" max="150" 
              style={{ width: 100 }}
              value={texts[selectedTextIndex].fontSize}
              onChange={(e) => {
                const newTexts = [...texts];
                newTexts[selectedTextIndex].fontSize = parseInt(e.target.value, 10);
                setTexts(newTexts);
              }}
            />
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
          <button 
            className="btn btn-sm" 
            style={{ color: 'var(--error-color)', background: 'transparent', border: '1px solid var(--error-color)' }}
            onClick={() => {
              const newTexts = texts.filter((_, idx) => idx !== selectedTextIndex);
              setTexts(newTexts);
              setSelectedTextIndex(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnotationEditor;

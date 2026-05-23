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
      const imageNode = stageRef.current.findOne('#baseImage');
      if (imageNode) imageNode.hide();

      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1 / scale });
      
      if (imageNode) imageNode.show();

      const blob = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          c.toBlob(resolve, 'image/png');
        };
        img.src = dataUrl;
      });
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
      <div style={{
        padding: '10px 12px', background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', flexWrap: 'wrap', gap: 8,
        justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${tool === 'highlight' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTool('highlight')}
            style={{ padding: '6px 10px', fontSize: 12 }}>
            <Highlighter size={14} /> <span className="hide-mobile">Highlight</span>
          </button>
          <button className={`btn btn-sm ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTool('eraser')}
            style={{ padding: '6px 10px', fontSize: 12 }}>
            <Eraser size={14} /> <span className="hide-mobile">Whiteout</span>
          </button>
          <button className={`btn btn-sm ${tool === 'text' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTool('text')}
            style={{ padding: '6px 10px', fontSize: 12 }}>
            <Type size={14} /> <span className="hide-mobile">Text</span>
          </button>
          <button className="btn btn-sm btn-ghost" onClick={undo} title="Undo last action"
            style={{ padding: '6px 10px', fontSize: 12 }}>
            <Undo size={14} /> <span className="hide-mobile">Undo</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}
            style={{ padding: '6px 10px', fontSize: 12 }}>
            <X size={14} /> <span className="hide-mobile">Cancel</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}
            style={{ padding: '6px 12px', fontSize: 12 }}>
            <Check size={14} /> Save
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
          top: 80, left: 12, right: 12,
          background: 'var(--bg-secondary)', padding: '10px 14px', 
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          display: 'flex', gap: 10, alignItems: 'center', zIndex: 1001,
          flexWrap: 'wrap'
        }}>
          <input
            autoFocus
            type="text"
            className="input input-sm"
            style={{ flex: '1 1 100%', minWidth: 120, fontWeight: 600 }}
            value={texts[selectedTextIndex].text}
            onChange={(e) => {
              const newTexts = [...texts];
              newTexts[selectedTextIndex].text = e.target.value;
              setTexts(newTexts);
            }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Color</label>
              <input 
                type="color" 
                style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                value={texts[selectedTextIndex].fill}
                onChange={(e) => {
                  const newTexts = [...texts];
                  newTexts[selectedTextIndex].fill = e.target.value;
                  setTexts(newTexts);
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Size</label>
              <input 
                type="range" min="12" max="150" 
                style={{ width: 80 }}
                value={texts[selectedTextIndex].fontSize}
                onChange={(e) => {
                  const newTexts = [...texts];
                  newTexts[selectedTextIndex].fontSize = parseInt(e.target.value, 10);
                  setTexts(newTexts);
                }}
              />
            </div>
            <button 
              className="btn btn-sm" 
              style={{ color: 'var(--error)', background: 'transparent', border: '1px solid var(--error)', fontSize: 12, padding: '4px 10px' }}
              onClick={() => {
                const newTexts = texts.filter((_, idx) => idx !== selectedTextIndex);
                setTexts(newTexts);
                setSelectedTextIndex(null);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationEditor;

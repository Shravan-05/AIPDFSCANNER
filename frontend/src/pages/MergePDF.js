import React, { useState, useRef } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UploadCloud, File, Trash2, GripVertical, FileDown, Loader } from 'lucide-react';
import pdfToolsAPI from '../services/pdfToolsAPI';
import { showToast } from '../components/UI/Toast';

const SortableItem = ({ id, fileObj, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} className={`glass-card ${isDragging ? 'dragging' : ''}`}
      style={{ ...style, display: 'flex', alignItems: 'center', padding: isMobile ? '14px 12px' : '12px 16px', marginBottom: 12, gap: 12 }}>
      <div {...attributes} {...listeners}
        style={{
          cursor: 'grab', color: 'var(--text-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '10px' : '0', touchAction: 'none',
          minHeight: isMobile ? 48 : 40, minWidth: isMobile ? 48 : 40
        }}>
        <GripVertical size={24} />
      </div>
      
      {fileObj.thumbnail ? (
        <img src={fileObj.thumbnail} alt="thumb" style={{ width: 40, height: 50, objectFit: 'cover', borderRadius: 4, background: '#fff', border: '1px solid var(--border-color)', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 40, height: 50, background: 'var(--bg-tertiary)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', flexShrink: 0 }}>
          <File size={20} color="var(--primary-color)" />
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fileObj.file.name}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
          {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB • {fileObj.pages || '?'} pages
        </p>
      </div>

      <button className="btn btn-ghost btn-sm" onClick={() => onRemove(id)}
        style={{ color: 'var(--error)', padding: isMobile ? '10px' : '8px', minHeight: 40, minWidth: 40 }}>
        <Trash2 size={isMobile ? 20 : 18} />
      </button>
    </div>
  );
};

const MergePDF = () => {
  const [files, setFiles] = useState([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const generateThumbnail = async (file) => {
    try {
      const pdfjsLib = await import('pdfjs-dist/build/pdf');
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const scale = 0.5; 
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      const thumbUrl = URL.createObjectURL(blob);
      return { thumbnail: thumbUrl, numPages: pdf.numPages };
    } catch (e) {
      console.error("Thumb error", e);
      return { thumbnail: null, numPages: null };
    }
  };

  const handleFiles = async (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) {
      showToast.error("Please select valid PDF files.");
      return;
    }

    const incoming = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      thumbnail: null,
      pages: null
    }));
    
    setFiles(prev => [...prev, ...incoming]);

    const thumbPromises = incoming.map(async (item) => {
      const meta = await generateThumbnail(item.file);
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, thumbnail: meta.thumbnail, pages: meta.numPages } : f));
    });
    await Promise.all(thumbPromises);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const removeFile = (id) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      showToast.error("Please add at least 2 PDFs to merge.");
      return;
    }
    
    setMerging(true);
    setProgress(0);
    
    const formData = new FormData();
    files.forEach(f => formData.append('files', f.file));

    try {
      const res = await pdfToolsAPI.merge(formData, (e) => {
        setProgress(Math.round((e.loaded / e.total) * 100));
      });
      
      // Handle new JSON response format with download URL
      if (res.data.success && res.data.downloadUrl) {
        const downloadUrl = res.data.downloadUrl;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', res.data.filename || `Merged_${new Date().getTime()}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast.success("PDFs merged successfully!");
      } else {
        showToast.error("Invalid response from server");
      }
      
      setFiles([]);
    } catch (err) {
      console.error(err);
      showToast.error(err.message || "Failed to merge PDFs.");
    } finally {
      setMerging(false);
      setProgress(0);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 800, padding: '32px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Merge PDF Files</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Combine PDFs in the order you want with the easiest PDF merger available.</p>
      </div>

      <div 
        className={`glass-card ${isDraggingOver ? 'drag-over' : ''}`}
        style={{ 
          border: '2px dashed var(--primary-color)', 
          background: isDraggingOver ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)',
          padding: '40px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease',
          marginBottom: 32
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadCloud size={48} color="var(--primary-color)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Select PDF files</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>or drop PDFs here</p>
        <input 
          type="file" 
          multiple 
          accept="application/pdf" 
          style={{ display: 'none' }} 
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontWeight: 700 }}>{files.length} file{files.length !== 1 && 's'} selected</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])} style={{ color: 'var(--error-color)' }}>Clear All</button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {files.map(f => (
                <SortableItem key={f.id} id={f.id} fileObj={f} onRemove={removeFile} />
              ))}
            </SortableContext>
          </DndContext>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleMerge} 
              disabled={files.length < 2 || merging}
              style={{ fontSize: 16, padding: '12px 32px', minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              {merging ? (
                <>
                  <Loader size={20} className="spin" />
                  Merging... {progress}%
                </>
              ) : (
                <>
                  <FileDown size={20} />
                  Merge PDFs
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MergePDF;
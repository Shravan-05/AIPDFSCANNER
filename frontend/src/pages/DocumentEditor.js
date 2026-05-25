import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileDown, Loader, Sun, Contrast,
  Zap, ScanLine, Eye, EyeOff, Sparkles, CheckCircle,
  ChevronLeft, ChevronRight, Copy, PenTool
} from 'lucide-react';
import { scansAPI, getFileUrl } from '../services/api';
import PageThumbnails from '../components/Scanner/PageThumbnails';
import AnnotationEditor from '../components/Scanner/AnnotationEditor';
import { showToast } from '../components/UI/Toast';

// Debounce utility
const useDebounce = (fn, delay) => {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
};

const SCAN_MODES = [
  { value: 'color', label: 'Color', icon: '🎨' },
  { value: 'grayscale', label: 'Grayscale', icon: '🩶' },
  { value: 'blackwhite', label: 'B&W', icon: '⬛' },
];

const DocumentEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [scan, setScan] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [applyingEnhancement, setApplyingEnhancement] = useState(false);
  const [autoArranging, setAutoArranging] = useState(false);
  const [showProcessed, setShowProcessed] = useState(true);
  const [arrangedOnce, setArrangedOnce] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [addingPages, setAddingPages] = useState(false);
  const fileInputRef = useRef(null);

  // Enhancement state (local, applied to backend with debounce)
  const [enhancement, setEnhancement] = useState({ brightness: 1.0, contrast: 1.0, sharpness: 1.0 });
  const [scanMode, setScanMode] = useState('color');

  // ─── Load scan ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadScan = async () => {
    setLoading(true);
    try {
      const res = await scansAPI.getOne(id);
      const data = res.data;
      setScan(data);
      setScanMode(data.scanMode || 'color');
      const active = (data.pages || []).filter(p => !p.isDeleted);
      if (active.length) {
        setSelectedPage(active[0]);
        setEnhancement(active[0].enhancement || { brightness: 1.0, contrast: 1.0, sharpness: 1.0 });
      }

      // Auto-arrange pages on first load if more than 1 page
      if (active.length > 1 && !arrangedOnce) {
        autoArrange(data);
      }
    } catch {
      showToast.error('Failed to load document');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ─── Auto-Arrange (runs once on load) ────────────────────────────────────
  const autoArrange = async (scanData) => {
    setAutoArranging(true);
    try {
      const res = await scansAPI.autoArrange(id);
      setScan(res.data);
      const active = res.data.pages?.filter(p => !p.isDeleted) || [];
      if (active.length) setSelectedPage(active[0]);
      setArrangedOnce(true);
    } catch {
      // Silent fail — auto-arrange is best-effort
    } finally {
      setAutoArranging(false);
    }
  };

  // ─── Select page ──────────────────────────────────────────────────────────
  const handleSelectPage = (page) => {
    setSelectedPage(page);
    setEnhancement(page.enhancement || { brightness: 1.0, contrast: 1.0, sharpness: 1.0 });
  };

  // ─── Apply enhancements (debounced 800ms after slider stops) ─────────────
  const applyEnhancementsNow = useCallback(async (vals, mode) => {
    if (!selectedPage) return;
    setApplyingEnhancement(true);
    try {
      const res = await scansAPI.updatePage(id, selectedPage._id, {
        enhancement: vals,
        scanMode: mode,
      });
      setScan(res.data);
      const updated = res.data.pages?.find(p => p._id === selectedPage._id);
      if (updated) setSelectedPage(updated);
    } catch {
      // silent — user will see old image
    } finally {
      setApplyingEnhancement(false);
    }
  }, [id, selectedPage]);

  const debouncedApply = useDebounce(applyEnhancementsNow, 800);

  const handleEnhancementChange = (key, value) => {
    const updated = { ...enhancement, [key]: value };
    setEnhancement(updated);
    debouncedApply(updated, scanMode);
  };

  const handleScanModeChange = (mode) => {
    setScanMode(mode);
    debouncedApply(enhancement, mode);
  };

  // ─── Drag-to-reorder ──────────────────────────────────────────────────────
  const handleReorder = async (newOrder) => {
    try {
      const res = await scansAPI.reorderPages(id, newOrder);
      setScan(res.data);
    } catch {
      showToast.error('Reorder failed');
    }
  };

  // ─── Rotate ───────────────────────────────────────────────────────────────
  const handleRotate = async (pageId) => {
    try {
      const res = await scansAPI.rotatePage(id, pageId, 90);
      setScan(res.data);
      const updated = res.data.pages?.find(p => p._id === pageId);
      if (updated) setSelectedPage(updated);
    } catch {
      showToast.error('Rotate failed');
    }
  };

  // ─── Delete page ──────────────────────────────────────────────────────────
  const handleDelete = async (pageId) => {
    try {
      const res = await scansAPI.deletePage(id, pageId);
      setScan(res.data);
      const active = res.data.pages?.filter(p => !p.isDeleted) || [];
      setSelectedPage(active[0] || null);
      showToast.success('Page removed');
    } catch {
      showToast.error('Delete failed');
    }
  };

  // ─── Duplicate page ───────────────────────────────────────────────────────
  const handleDuplicate = async (pageId) => {
    try {
      const res = await scansAPI.duplicatePage(id, pageId);
      setScan(res.data);
      showToast.success('Page duplicated');
    } catch {
      showToast.error('Duplicate failed');
    }
  };

  // ─── Auto-save title (debounced 1.5s) ────────────────────────────────────
  const saveTitleNow = useCallback(async (title) => {
    setSaveStatus('saving');
    try {
      await scansAPI.update(id, { title });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, [id]);

  const debouncedSaveTitle = useDebounce(saveTitleNow, 1500);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setScan(prev => ({ ...prev, title: newTitle }));
    debouncedSaveTitle(newTitle);
  };

  // ─── Annotations ──────────────────────────────────────────────────────────
  const handleAnnotationSave = async (annotationFile) => {
    if (!selectedPage) return;
    try {
      showToast.info('Saving annotations...');
      const formData = new FormData();
      formData.append('annotationImage', annotationFile);
      
      const res = await scansAPI.annotate(id, selectedPage._id, formData);
      
      // Update the page in local state
      const updatedPage = res.data.page;
      const updatedPages = scan.pages.map(p => p._id === updatedPage._id ? updatedPage : p);
      setScan({ ...scan, pages: updatedPages });
      setSelectedPage(updatedPage);
      setShowAnnotator(false);
      showToast.success('Annotations saved');
    } catch (err) {
      showToast.error('Failed to save annotations');
    }
  };

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      showToast.info('Generating PDF...');
      // Pass the password to the API if entered
      const res = await scansAPI.exportPdf(id, pdfPassword);
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scan?.title || 'Document'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast.success('PDF downloaded successfully!');
    } catch (err) {
      showToast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  // ─── Add Pages (Merge PDF/Images) ─────────────────────────────────────────
  const handleAddFiles = async (files) => {
    if (!files?.length) return;
    
    setAddingPages(true);
    showToast.info('Preparing files...');

    const processedFiles = [];
    try {
      const pdfUtils = await import('../utils/pdfToImage');
      const convertPdfToImages = pdfUtils.convertPdfToImages;
      
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
          showToast.info(`Extracting pages from ${file.name}...`);
          const images = await convertPdfToImages(file);
          processedFiles.push(...images);
        } else {
          processedFiles.push(file);
        }
      }
    } catch (err) {
      console.error('PDF Parse Error:', err);
      showToast.error('Failed to parse PDF file');
      setAddingPages(false);
      return;
    }

    const formData = new FormData();
    processedFiles.forEach(f => formData.append('images', f));
    
    try {
      showToast.info('Uploading and merging pages...');
      const res = await scansAPI.addPages(id, formData);
      setScan(res.data);
      showToast.success('Pages merged successfully!');
    } catch (err) {
      showToast.error(err.response?.data?.msg || 'Failed to merge pages');
    } finally {
      setAddingPages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 1300 }}>
        <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 260, height: 32, marginBottom: 20 }} />
            <div className="skeleton" style={{ width: '100%', height: 100, marginBottom: 20, borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ width: '100%', height: 'min(480px, 50vh)', borderRadius: 'var(--radius-lg)' }} />
          </div>
          <div style={{ width: 260 }}>
            <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 'var(--radius-lg)' }} />
          </div>
        </div>
      </div>
    );
  }

  const activePages = (scan?.pages || []).filter(p => !p.isDeleted);
  const currentImage = showProcessed
    ? (selectedPage?.processedImage || selectedPage?.originalImage)
    : selectedPage?.originalImage;

  const selectedIndex = activePages.findIndex(p => p._id === selectedPage?._id);
  const handlePrevPage = () => {
    if (selectedIndex > 0) handleSelectPage(activePages[selectedIndex - 1]);
  };
  const handleNextPage = () => {
    if (selectedIndex < activePages.length - 1) handleSelectPage(activePages[selectedIndex + 1]);
  };

  return (
    <div style={{ maxWidth: 1340, margin: '0 auto', padding: '16px 20px' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/dashboard')}
            style={{ flexShrink: 0, padding: 8 }}
          >
            <ArrowLeft size={18} />
          </button>

          {/* Auto-save title input */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            <input
              className="input"
              value={scan?.title || ''}
              onChange={handleTitleChange}
              placeholder="Document title"
              style={{ fontSize: 17, fontWeight: 700, paddingRight: 36 }}
            />
            {saveStatus === 'saving' && (
              <Loader size={14} className="spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            )}
            {saveStatus === 'saved' && (
              <CheckCircle size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
            )}
          </div>

          {/* AI arranging indicator */}
          {autoArranging && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              <Sparkles size={13} />
              AI arranging...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Toggle original vs processed */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowProcessed(p => !p)}
            title={showProcessed ? 'Show original' : 'Show processed'}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '6px 8px' }}
          >
            {showProcessed ? <Eye size={13} /> : <EyeOff size={13} />}
            <span className="hide-mobile">{showProcessed ? 'Processed' : 'Original'}</span>
          </button>

          {/* Annotate */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAnnotator(true)}
            disabled={!selectedPage}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12 }}
          >
            <PenTool size={14} /> <span className="hide-mobile">Annotate</span>
          </button>

          {/* Password Protection - hidden on mobile, shown inline */}
          <div className="hide-mobile">
            <input
              type="password"
              placeholder="PDF Password"
              className="input input-sm"
              style={{ width: 140, fontSize: 12, height: 32 }}
              value={pdfPassword}
              onChange={e => setPdfPassword(e.target.value)}
            />
          </div>

          {/* Export PDF */}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExport}
            disabled={exporting || !activePages.length}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12 }}
          >
            {exporting ? <Loader size={14} className="spin" /> : <FileDown size={14} />}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>

          {/* Add / Merge PDF */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept="image/*,.pdf"
            onChange={(e) => handleAddFiles(e.target.files)}
          />
          <button
            className="btn btn-secondary btn-sm"
            disabled={addingPages}
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', fontSize: 12 }}
          >
            {addingPages ? <Loader size={14} className="spin" /> : <Sparkles size={14} />}
            {addingPages ? 'Merging...' : <span className="hide-mobile">Add Pages</span>}
          </button>
        </div>
      </div>

      {/* ── Page count info ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <ScanLine size={14} color="var(--text-tertiary)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {activePages.length} page{activePages.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>· Drag thumbnails to reorder</span>
      </div>

      {/* ── Page strip (drag-to-reorder) ─────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '10px 14px', marginBottom: 18 }}>
        <PageThumbnails
          pages={activePages}
          selectedPage={selectedPage}
          onSelect={handleSelectPage}
          onRotate={handleRotate}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onReorder={handleReorder}
        />
      </div>

      {/* ── Main content: preview + enhancement panel ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>

        {/* Image preview */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', minHeight: 'min(480px, 50vh)' }}>
          {currentImage ? (
            <>
              {applyingEnhancement && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <Loader size={28} className="spin" color="white" />
                  <p style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Applying enhancements...</p>
                </div>
              )}
              <img
                key={currentImage}
                src={getFileUrl(currentImage)}
                alt={`Page ${selectedPage?.pageNumber}`}
                style={{
                  width: '100%',
                  maxHeight: 680,
                  objectFit: 'contain',
                  display: 'block',
                  background: 'var(--bg-tertiary)',
                  transition: 'opacity 300ms',
                }}
              />
              
              {/* Prev/Next Overlay Buttons */}
              {selectedIndex > 0 && (
                <button
                  onClick={handlePrevPage}
                  style={{
                    position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                    borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 5, backdropFilter: 'blur(4px)'
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {selectedIndex < activePages.length - 1 && (
                <button
                  onClick={handleNextPage}
                  style={{
                    position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                    borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 5, backdropFilter: 'blur(4px)'
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* OCR text panel */}
              {selectedPage?.ocrText && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      OCR Text (stored for search)
                    </p>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => { navigator.clipboard.writeText(selectedPage.ocrText); showToast.success('Copied to clipboard'); }} 
                      style={{ padding: '2px 6px', fontSize: 11, height: 'auto', minHeight: 0 }}
                    >
                      <Copy size={12} style={{ marginRight: 4 }} /> Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxHeight: 72, overflowY: 'auto', lineHeight: 1.5 }}>
                    {selectedPage.ocrText}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 480, gap: 12, color: 'var(--text-tertiary)' }}>
              <ScanLine size={48} />
              <p style={{ fontSize: 14 }}>Select a page to preview</p>
            </div>
          )}
        </div>

        {/* ── Enhancement panel (auto-applies, no button) ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Scan mode */}
          <div className="glass-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Scan Mode
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {SCAN_MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => handleScanModeChange(m.value)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${scanMode === m.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: scanMode === m.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-tertiary)',
                    color: scanMode === m.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    transition: 'all 180ms',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enhancement sliders */}
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Enhancement
              </p>
              {applyingEnhancement && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--accent-primary)' }}>
                  <Loader size={11} className="spin" /> Applying
                </div>
              )}
            </div>

            {[
              { key: 'brightness', label: 'Brightness', icon: Sun, min: 0.5, max: 1.5, step: 0.05 },
              { key: 'contrast', label: 'Contrast', icon: Contrast, min: 0.5, max: 2.0, step: 0.05 },
              { key: 'sharpness', label: 'Sharpness', icon: Zap, min: 0, max: 3.0, step: 0.1 },
            ].map(({ key, label, icon: Icon, min, max, step }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={13} color="var(--text-secondary)" />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                    {enhancement[key]?.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={min} max={max} step={step}
                  value={enhancement[key] ?? 1.0}
                  onChange={(e) => handleEnhancementChange(key, parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            ))}

            {/* Reset button */}
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', fontSize: 12, marginTop: 2 }}
              onClick={() => {
                const reset = { brightness: 1.0, contrast: 1.0, sharpness: 1.0 };
                setEnhancement(reset);
                debouncedApply(reset, scanMode);
              }}
            >
              Reset to defaults
            </button>
          </div>

          {/* Auto-arrange hint card */}
          <div style={{
            padding: '12px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <Sparkles size={13} color="var(--accent-primary)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>AI Automation</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Pages are auto-arranged on load. Drag thumbnails to manually reorder. Enhancements apply automatically after you adjust sliders. Title saves automatically.
            </p>
          </div>
        </div>
      </div>
      
      {/* Annotator Overlay */}
      {showAnnotator && selectedPage && (
        <AnnotationEditor 
          imageUrl={getFileUrl(currentImage)} 
          onSave={handleAnnotationSave} 
          onCancel={() => setShowAnnotator(false)} 
        />
      )}
    </div>
  );
};

export default DocumentEditor;

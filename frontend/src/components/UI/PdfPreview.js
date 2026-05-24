import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { ChevronLeft, ChevronRight, Download, Loader, AlertCircle } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs`;

const PdfPreview = ({ url, file, fileName }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageLoading, setPageLoading] = useState(false);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!url && !file) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        const data = file ? { data: await file.arrayBuffer() } : { url };
        const doc = await pdfjsLib.getDocument(data).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Failed to load PDF preview');
          setLoading(false);
        }
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [url, file]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    setPageLoading(true);

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    pdfDoc.getPage(currentPage).then(page => {
      if (cancelled) return;
      const container = containerRef.current;
      const maxWidth = container?.clientWidth || 800;
      const scale = Math.min(2, maxWidth / 612);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      renderTaskRef.current = renderTask;
      return renderTask.promise;
    }).then(() => {
      if (!cancelled) setPageLoading(false);
    }).catch((err) => {
      if (!cancelled && err?.name !== 'RenderingCancelledException') {
        setPageLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  const goToPrev = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const goToNext = useCallback(() => setCurrentPage(p => Math.min(numPages, p + 1)), [numPages]);

  const download = useCallback(() => {
    const a = document.createElement('a');
    a.href = url || URL.createObjectURL(file);
    a.download = fileName || 'document.pdf';
    a.click();
    if (!url) setTimeout(() => URL.revokeObjectURL(a.href), 100);
  }, [url, file, fileName]);

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 300, gap: 12, padding: 20, textAlign: 'center'
      }}>
        <AlertCircle size={32} color="var(--error)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
        {url && (
          <a href={url} download={fileName} className="btn btn-sm" style={{ fontSize: 12 }}>
            <Download size={14} /> Download to view
          </a>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 300, gap: 10
      }}>
        <Loader size={24} className="spin" color="var(--accent-primary)" />
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Loading PDF...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={containerRef} style={{
        flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center',
        alignItems: 'flex-start', padding: 8, background: 'var(--bg-tertiary)',
        position: 'relative'
      }}>
        {pageLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(0,0,0,0.3)', zIndex: 5
          }}>
            <Loader size={20} className="spin" color="white" />
          </div>
        )}
        <canvas ref={canvasRef} style={{
          maxWidth: '100%', height: 'auto',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)', borderRadius: 4
        }} />
      </div>
      {numPages > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '8px 12px', borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)'
        }}>
          <button onClick={goToPrev} disabled={currentPage <= 1}
            style={{
              border: 'none', background: 'transparent',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              color: currentPage <= 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              padding: 4, display: 'flex'
            }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {currentPage} / {numPages}
          </span>
          <button onClick={goToNext} disabled={currentPage >= numPages}
            style={{
              border: 'none', background: 'transparent',
              cursor: currentPage >= numPages ? 'not-allowed' : 'pointer',
              color: currentPage >= numPages ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              padding: 4, display: 'flex'
            }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={download} title="Download"
            style={{
              marginLeft: 'auto', border: 'none', background: 'transparent',
              cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
              borderRadius: 6
            }}>
            <Download size={14} /> <span className="hide-mobile">Download</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;

import React, { useState, useEffect, useCallback } from 'react';
import { filesAPI, scansAPI } from '../services/api';
import FileGrid from '../components/Files/FileGrid';
import SearchBar from '../components/UI/SearchBar';
import ShareModal from '../components/Share/ShareModal';
import { showToast } from '../components/UI/Toast';
import {
  Grid3x3, List, Merge, Scissors, Trash2,
  X, FileText, Loader
} from 'lucide-react';

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Batch selection state
  const [selected, setSelected] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTitle, setMergeTitle] = useState('');
  const [merging, setMerging] = useState(false);

  // Split confirmation
  const [splitTarget, setSplitTarget] = useState(null);
  const [splitting, setSplitting] = useState(false);

  // Share modal
  const [shareTarget, setShareTarget] = useState(null);

  useEffect(() => {
    setPage(1);
    loadFiles(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort]);

  useEffect(() => {
    loadFiles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const loadFiles = async (p = 1) => {
    setLoading(true);
    try {
      const res = await filesAPI.getAll({ search, sort, limit: 20, page: p });
      setFiles(res.data.files || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      showToast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await filesAPI.delete(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      showToast.success('File deleted');
    } catch (err) {
      showToast.error('Failed to delete file');
    }
  };

  const handleBatchDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} file(s)?`)) return;
    const ids = Array.from(selected);
    const results = await Promise.allSettled(ids.map(id => filesAPI.delete(id)));
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    setFiles(prev => prev.filter(f => !selected.has(f.id)));
    setSelected(new Set());
    showToast.success(`Deleted ${successCount} file(s)`);
  };

  const handleRename = async (id, name) => {
    try {
      await filesAPI.rename(id, name);
      setFiles(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    } catch (err) {
      showToast.error('Failed to rename file');
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await filesAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      const file = files.find(f => f.id === id);
      a.download = `${file?.name || 'document'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast.success('Download started');
    } catch (err) {
      showToast.error('Failed to download file. Export the document first.');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await scansAPI.toggleFavorite(id);
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
      ));
    } catch (err) {
      showToast.error('Failed to update favorite');
    }
  };

  const handleToggleSelect = useCallback((id) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const handleMerge = async () => {
    const title = mergeTitle.trim() || `Merged Document ${new Date().toLocaleDateString()}`;
    setMerging(true);
    try {
      const scanIds = selectedFiles.filter(f => f.type === 'scan').map(f => f.id);
      if (scanIds.length < 2) {
        showToast.error('Select at least 2 scanned documents to merge');
        return;
      }
      await scansAPI.merge(scanIds, title);
      showToast.success('Documents merged successfully!');
      setShowMergeModal(false);
      setMergeTitle('');
      setSelected(new Set());
      setIsSelecting(false);
      await loadFiles();
    } catch (err) {
      const msg = err.response?.data?.msg || 'Merge failed. Check your connection and try again.';
      showToast.error(msg);
    } finally {
      setMerging(false);
    }
  };

  const openShareModal = (id) => {
    const file = files.find(f => f.id === id);
    setShareTarget({ id: file.id, title: file.name, model: 'Scan' });
  };

  const handleSplit = async (id) => {
    setSplitting(true);
    try {
      const res = await scansAPI.split(id);
      showToast.success(`Split into ${res.data.scans?.length || 0} documents`);
      setSplitTarget(null);
      await loadFiles();
    } catch (err) {
      showToast.error(err.response?.data?.msg || 'Split failed');
    } finally {
      setSplitting(false);
    }
  };

  const clearSelection = () => {
    setSelected(new Set());
    setIsSelecting(false);
  };

  const selectedFiles = files.filter(f => selected.has(f.id));

  return (
    <div className="page-container" style={{ maxWidth: 1300, paddingBottom: selected.size > 0 ? 100 : 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 4, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Files
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {files.length} documents{selected.size > 0 ? ` · ${selected.size} selected` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isSelecting ? (
            <button className="btn btn-secondary btn-sm" onClick={clearSelection}>
              <X size={14} /> Cancel
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsSelecting(true)}>
              Select
            </button>
          )}
          <button
            className={`btn btn-sm ${view === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('grid')}
          >
            <Grid3x3 size={16} />
          </button>
          <button
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('list')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search files..." style={{ flex: '1 1 100%' }} />
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value)} style={{
          '@media (min-width: 480px)': { width: 'auto' },
          width: '100%'
        }}>
          <option value="-createdAt">Newest First</option>
          <option value="createdAt">Oldest First</option>
          <option value="title">Name A-Z</option>
          <option value="-title">Name Z-A</option>
          <option value="-fileSize">Size (Large)</option>
          <option value="fileSize">Size (Small)</option>
        </select>
      </div>

      {/* File Grid */}
      <FileGrid
        files={files}
        loading={loading}
        view={view}
        isSelecting={isSelecting}
        selected={selected}
        onToggleSelect={handleToggleSelect}
        onRename={handleRename}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onToggleFavorite={handleToggleFavorite}
        onSplit={(id) => setSplitTarget(id)}
        onShareFile={openShareModal}
      />

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginTop: 24, flexWrap: 'wrap'
        }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ minWidth: 70, justifyContent: 'center' }}
          >
            Previous
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '0 8px' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ minWidth: 70, justifyContent: 'center' }}
          >
            Next
          </button>
        </div>
      )}

      {/* Floating Selection Action Bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 16, left: 12, right: 12,
          zIndex: 200, display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'var(--bg-secondary)',
          WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          animation: 'slideUp 200ms ease-out',
          overflowX: 'auto'
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', paddingRight: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {selected.size}
          </span>
          {selected.size >= 2 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowMergeModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Merge size={15} /> Merge
            </button>
          )}
          <button
            className="btn btn-sm"
            onClick={handleBatchDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', flexShrink: 0,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--error)'
            }}
          >
            <Trash2 size={15} /> Delete
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={clearSelection}
            style={{ flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: 480,
            animation: 'scaleIn 200ms ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Merge size={22} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Merge Documents</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Combining {selected.size} documents into one
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Documents to merge:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {selectedFiles.map(f => (
                  <div key={f.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)', fontSize: 13
                  }}>
                    <FileText size={14} color="var(--accent-primary)" />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{f.pages}p</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                Merged Document Title
              </label>
              <input
                className="input"
                placeholder={`Merged Document ${new Date().toLocaleDateString()}`}
                value={mergeTitle}
                onChange={(e) => setMergeTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !merging && handleMerge()}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowMergeModal(false); setMergeTitle(''); }}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleMerge} disabled={merging}>
                {merging ? <Loader size={16} className="spin" /> : <Merge size={16} />}
                {merging ? 'Merging...' : 'Merge Documents'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          pdfId={shareTarget.id}
          pdfTitle={shareTarget.title}
          model={shareTarget.model}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Split Confirmation */}
      {splitTarget && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Scissors size={22} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Split Document</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Each page becomes a separate document
                </p>
              </div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              This will split all pages into individual documents. The original document will be archived.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSplitTarget(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: 'none' }}
                onClick={() => handleSplit(splitTarget)}
                disabled={splitting}
              >
                {splitting ? <Loader size={16} className="spin" /> : <Scissors size={16} />}
                {splitting ? 'Splitting...' : 'Split Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPage;

import React, { useState, useEffect, useRef } from 'react';
import { scansAPI } from '../services/api';
import StatsCards from '../components/Dashboard/StatsCards';
import RecentScans from '../components/Dashboard/RecentScans';
import QuickActions from '../components/Dashboard/QuickActions';
import { showToast } from '../components/UI/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Upload, RefreshCw, ScanLine, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, scansRes] = await Promise.all([
        scansAPI.getStats(),
        scansAPI.getAll({ limit: 8, sort: '-createdAt' })
      ]);
      setStats(statsRes.data);
      setScans(scansRes.data.scans || []);
    } catch (err) {
      showToast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    
    setUploading(true);
    setUploadProgress(0);
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
      setUploading(false);
      return;
    }

    const formData = new FormData();
    processedFiles.forEach(f => formData.append('images', f));
    
    try {
      showToast.info('Uploading and processing...');
      const res = await scansAPI.create(formData, (e) => {
        const pct = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(pct);
      });
      showToast.success('Scan created successfully!');
      navigate(`/editor/${res.data._id}`);
    } catch (err) {
      showToast.error(err.response?.data?.msg || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-container" style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              AuraScan AI
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6, wordBreak: 'break-word' }}>
            {greeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Here's your document overview for today.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <RefreshCw size={14} />
          <span className="hide-mobile">Refresh</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 28 }}>
        <QuickActions />
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 32 }}>
        <StatsCards stats={stats} loading={loading} />
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? 'rgba(99,102,241,0.06)' : 'var(--bg-secondary)',
          transition: 'all 200ms',
          marginBottom: 36,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative blur */}
        {dragOver && (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--gradient-primary)',
            opacity: 0.04, pointerEvents: 'none'
          }} />
        )}

        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-md)',
          background: dragOver ? 'var(--gradient-primary)' : 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', transition: 'all 200ms'
        }}>
          {uploading ? (
            <ScanLine size={26} color={dragOver ? 'white' : 'var(--accent-primary)'} style={{ animation: 'pulse 1s infinite' }} />
          ) : (
            <Upload size={26} color={dragOver ? 'white' : 'var(--accent-primary)'} />
          )}
        </div>

        {uploading ? (
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Processing your documents...</p>
            <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, maxWidth: 280, margin: '0 auto', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'var(--gradient-primary)',
                width: `${uploadProgress}%`,
                transition: 'width 300ms'
              }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 8 }}>{uploadProgress}% uploaded</p>
          </div>
        ) : (
          <>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
              {dragOver ? 'Drop to scan!' : 'Drag & drop documents here'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
              or click to browse · JPG, PNG, HEIC, WEBP, PDF
            </p>
            <button
              className="btn btn-primary"
              style={{ pointerEvents: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Upload size={16} /> Upload & Scan
            </button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Recent Scans */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Recent Scans</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/scanner')}>
            View all →
          </button>
        </div>
        <RecentScans scans={scans} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;

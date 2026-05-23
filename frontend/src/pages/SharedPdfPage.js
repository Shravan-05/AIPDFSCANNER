import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText, Download, Lock, Unlock, Eye, AlertTriangle,
  Shield, ArrowLeft, Loader
} from 'lucide-react';
import shareAPI from '../services/shareService';
import { showToast } from '../components/UI/Toast';

const SharedPdfPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [pdfData, setPdfData] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadSharedPdf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadSharedPdf = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await shareAPI.access(token);
      const data = res.data;

      if (data.requiresPassword) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      setPdfData(data.pdf);
      setDownloadUrl(data.downloadUrl);
    } catch (err) {
      const data = err.response?.data;
      const errorCode = data?.errorCode;
      const messages = {
        NOT_FOUND: 'This share link was not found.',
        REVOKED: 'This share link has been revoked by the owner.',
        EXPIRED: 'This share link has expired.',
        LIMIT_REACHED: 'View limit reached for this share link.',
        PDF_NOT_FOUND: 'The shared PDF no longer exists.'
      };
      setError(messages[errorCode] || data?.msg || 'Failed to load shared PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      showToast.error('Please enter a password');
      return;
    }
    setVerifying(true);
    try {
      const res = await shareAPI.verifyPassword(token, password);
      const data = res.data;
      if (data.verified) {
        setPdfData(data.pdf);
        setDownloadUrl(data.downloadUrl);
        setRequiresPassword(false);
      }
    } catch (err) {
      const msg = err.response?.data?.msg || 'Incorrect password';
      showToast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.download = `${pdfData?.title || 'document'}.pdf`;
      a.click();
    }
  };

  const handlePreview = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.03) 100%)'
      }}>
        <div className="glass-card" style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={36} color="var(--error)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--error)' }}>
            Link Unavailable
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {error}
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={16} /> Go to AuraScan
          </Link>
        </div>
      </div>
    );
  }

  // Password prompt
  if (requiresPassword) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.03) 100%)'
      }}>
        <div className="glass-card" style={{ maxWidth: 420, width: '100%', padding: '32px 28px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(99,102,241,0.1)', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Lock size={32} color="var(--accent-primary)" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
            Password Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
            This PDF is password protected. Enter the password to view it.
          </p>
          <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              className="input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{ textAlign: 'center', fontSize: 16 }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={verifying || !password.trim()}
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            >
              {verifying ? <Loader size={18} className="spin" /> : <Unlock size={18} />}
              {verifying ? 'Verifying...' : 'View PDF'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.03) 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Loading shared PDF...</p>
        </div>
      </div>
    );
  }

  // PDF viewer
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.03) 100%)'
    }}>
      {/* Top Bar */}
      <div className="glass-nav" style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 'var(--navbar-height)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/" style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: 'white', textDecoration: 'none'
          }}>A</Link>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>AuraScan</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePreview}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={15} /> <span className="hide-mobile">Preview</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> <span className="hide-mobile">Download</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="page-container" style={{ maxWidth: 900, paddingTop: 32 }}>
        {/* File Info */}
        {pdfData && (
          <div className="glass-card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 'var(--radius-md)',
                background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <FileText size={28} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>
                  {pdfData.title || 'Untitled Document'}
                </h1>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FileText size={13} /> {pdfData.totalPages || 0} pages
                  </span>
                  {pdfData.fileSize && (
                    <span>{(pdfData.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={13} /> Shared securely
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-primary btn-sm" onClick={handleDownload}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Preview */}
        {pdfData?.pages && pdfData.pages.length > 0 && (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Eye size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Preview
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Showing first {Math.min(pdfData.pages.length, 5)} of {pdfData.totalPages} pages
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12, padding: 16,
              background: 'var(--bg-tertiary)'
            }}>
              {pdfData.pages.slice(0, 5).map((page, i) => (
                <div key={page._id || i} style={{
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden', boxShadow: 'var(--shadow-md)',
                  background: 'white', aspectRatio: '3/4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {(page.thumbnailUrl || page.processedImage) ? (
                    <img
                      src={page.thumbnailUrl || page.processedImage}
                      alt={`Page ${page.pageNumber || i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <FileText size={32} color="var(--text-tertiary)" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center', padding: '24px 0',
          color: 'var(--text-tertiary)', fontSize: 12
        }}>
          Shared via AuraScan AI &mdash; Secure PDF Sharing
        </div>
      </div>
    </div>
  );
};

export default SharedPdfPage;

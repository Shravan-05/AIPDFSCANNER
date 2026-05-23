import React, { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Share2, Copy, Check, X, Clock, Lock,
  RotateCcw, Trash2, ExternalLink, Smartphone,
  Shield, AlertTriangle
} from 'lucide-react';
import { showToast } from '../UI/Toast';
import shareAPI, { getShareUrl } from '../../services/shareService';

const EXPIRY_OPTIONS = [
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '24 hours', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
  { label: 'No expiry', value: 0 }
];

const ShareModal = ({ pdfId, pdfTitle, model = 'Scan', onClose }) => {
  const [step, setStep] = useState('create');
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(86400);
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareInfo, setShareInfo] = useState(null);
  const [error, setError] = useState('');

  const createLink = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body = {};
      if (expiresIn > 0) body.expiresIn = expiresIn;
      if (password) body.password = password;

      const res = await shareAPI.create(pdfId, { ...body, model });
      const data = res.data;
      setShareUrl(data.shareUrl || getShareUrl(data.token));
      setShareToken(data.token);
      setHasPassword(data.hasPassword);
      setShareInfo(data);
      setStep('created');
      showToast.success('Share link created!');
    } catch (err) {
      const msg = err.response?.data?.msg || 'Failed to create share link';
      setError(msg);
      showToast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [pdfId, expiresIn, password, model]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error('Failed to copy');
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Revoke this share link? It will stop working immediately.')) return;
    setLoading(true);
    try {
      await shareAPI.revoke(shareToken);
      showToast.success('Share link revoked');
      onClose();
    } catch (err) {
      showToast.error('Failed to revoke');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Generate a new link? The current one will stop working.')) return;
    await shareAPI.revoke(shareToken);
    setStep('create');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: pdfTitle || 'Shared PDF',
          text: `View "${pdfTitle}" on AuraScan`,
          url: shareUrl
        });
      } catch {}
    } else {
      copyToClipboard();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 200ms ease'
    }} onClick={onClose}>
      <div className="glass-card" style={{
        width: '100%', maxWidth: 480, padding: 0, overflow: 'hidden',
        animation: 'scaleIn 200ms ease'
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Share2 size={22} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {step === 'create' ? 'Share PDF' : 'Share Link Ready'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, wordBreak: 'break-word' }}>
                {pdfTitle || 'Untitled Document'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6, flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 'var(--radius-md)',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--error)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
              marginBottom: 16
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {step === 'create' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Expiry */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>
                  <Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Link Expiry
                </label>
                <select
                  className="input"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  style={{ fontSize: 13 }}
                >
                  {EXPIRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Password Protection */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: 'var(--text-secondary)' }}>
                  <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Password Protection (Optional)
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="Set a password to protect this share"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ fontSize: 13 }}
                />
                {password && (
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                    Recipients will need this password to view the PDF
                  </p>
                )}
              </div>

              {/* Create Button */}
              <button
                className="btn btn-primary btn-lg"
                onClick={createLink}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', gap: 8, marginTop: 8 }}
              >
                {loading ? (
                  <div className="spin" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                ) : <Share2 size={18} />}
                {loading ? 'Creating...' : 'Create Share Link'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* QR Code */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  padding: 16, background: 'white', borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <QRCodeSVG value={shareUrl} size={160} level="M" includeMargin />
                </div>
              </div>

              {/* Share URL */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, display: 'block' }}>
                  Share Link
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={shareUrl}
                    readOnly
                    onClick={(e) => e.target.select()}
                    style={{ fontSize: 12, flex: 1 }}
                  />
                  <button
                    className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={copyToClipboard}
                    style={{ padding: '8px 14px', flexShrink: 0 }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Info row */}
              <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap',
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)', fontSize: 12
              }}>
                {shareInfo?.expiresAt && (
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> Expires {new Date(shareInfo.expiresAt).toLocaleDateString()}
                  </span>
                )}
                {hasPassword && (
                  <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={12} /> Password protected
                  </span>
                )}
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Shield size={12} /> Secure link
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => window.open(shareUrl, '_blank')}
                  style={{ flex: 1, justifyContent: 'center', gap: 6, fontSize: 13 }}
                >
                  <ExternalLink size={16} /> Open Link
                </button>
                {navigator.share && (
                  <button
                    className="btn btn-secondary"
                    onClick={handleNativeShare}
                    style={{ justifyContent: 'center', gap: 6, fontSize: 13 }}
                    title="Share via device"
                  >
                    <Smartphone size={16} />
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={handleRegenerate}
                  disabled={loading}
                  style={{ justifyContent: 'center', gap: 6, fontSize: 13 }}
                  title="Generate new link"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={handleRevoke}
                  disabled={loading}
                  style={{ justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--error)' }}
                  title="Revoke link"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;

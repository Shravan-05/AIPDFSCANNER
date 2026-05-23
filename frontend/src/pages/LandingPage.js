import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ScanLine, Shield, Zap, FileText, ArrowRight, Upload, ImageIcon } from 'lucide-react';

const features = [
  { icon: ScanLine, title: 'AI Document Detection', description: 'Auto-detect and crop document boundaries with edge detection algorithms.' },
  { icon: Zap, title: 'Smart Enhancement', description: 'Adjust brightness, contrast, and sharpness for perfect readability.' },
  { icon: Shield, title: 'OCR Text Extraction', description: 'Extract text from scanned documents using Tesseract.js.' },
  { icon: FileText, title: 'PDF Export', description: 'Export polished, professional PDFs with a single click.' },
  { icon: ImageIcon, title: 'Multi-Format Support', description: 'Upload PNG, JPG, TIFF, BMP, and WebP images.' },
  { icon: Upload, title: 'Batch Processing', description: 'Upload and process multiple pages at once.' }
];

const steps = [
  { number: '1', title: 'Upload Images', description: 'Drag and drop your document images or browse to select them.' },
  { number: '2', title: 'AI Auto-Processing', description: 'Our engine detects edges, crops, enhances, and corrects perspective.' },
  { number: '3', title: 'Review & Edit', description: 'Reorder pages, adjust settings, and fine-tune each page.' },
  { number: '4', title: 'Export PDF', description: 'Download your polished, professional document as a PDF.' }
];

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <nav className="glass-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 'var(--navbar-height)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: 'white'
          }}>A</div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>AuraScan AI</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {user ? (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Dashboard <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <section style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '80px 24px',
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.05) 100%)'
      }}>
        <div style={{ maxWidth: 800 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px',
            background: 'rgba(99,102,241,0.1)',
            borderRadius: 'var(--radius-full)',
            marginBottom: 24,
            color: 'var(--accent-primary)', fontSize: 14, fontWeight: 500
          }}>
            <Zap size={14} /> AI-Powered Document Scanner
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 20
          }}>
            Turn Images Into{' '}
            <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Polished PDFs
            </span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--text-secondary)',
            maxWidth: 600, margin: '0 auto 32px',
            lineHeight: 1.6
          }}>
            Upload images of documents, and let AI auto-detect, crop, enhance, and organize them into professional PDFs. No account required to try.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                Go to Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px' }}>
        <div className="page-container">
          <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
            Powerful Features
          </h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24
          }}>
            {features.map((feat, i) => (
              <div key={i} className="glass-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--radius-md)',
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <feat.icon size={26} style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{feat.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: 'var(--bg-secondary)' }}>
        <div className="page-container">
          <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 48 }}>
            How It Works
          </h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 32
          }}>
            {steps.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: 'white', fontWeight: 700, fontSize: 18
                }}>
                  {step.number}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{
        textAlign: 'center', padding: '32px 24px',
        color: 'var(--text-tertiary)', fontSize: 13,
        borderTop: '1px solid var(--border-color)'
      }}>
        AuraScan AI &copy; {new Date().getFullYear()}. Built with React, Node.js & Sharp.
      </footer>
    </div>
  );
};

export default LandingPage;

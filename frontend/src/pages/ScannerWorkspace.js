import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Settings, FileDown } from 'lucide-react';
import { scansAPI } from '../services/api';
import FileUpload from '../components/UI/FileUpload';
import ProgressBar from '../components/UI/ProgressBar';
import ScanModeSelector from '../components/Scanner/ScanModeSelector';
import EnhancementControls from '../components/Scanner/EnhancementControls';
import { showToast } from '../components/UI/Toast';

const ScannerWorkspace = () => {
  const [files, setFiles] = useState([]);
  const [scanMode, setScanMode] = useState('color');
  const [enhancement, setEnhancement] = useState({ brightness: 1.0, contrast: 1.0, sharpness: 1.0 });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const navigate = useNavigate();

  const handleDrop = async (acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      name: f.name
    }))]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (!files.length) {
      showToast.error('Please upload at least one image');
      return;
    }
    setProcessing(true);
    const formData = new FormData();
    files.forEach(f => formData.append('images', f.file));
    formData.append('scanMode', scanMode);
    formData.append('ocrEnabled', ocrEnabled);
    formData.append('enhancement', JSON.stringify(enhancement));
    try {
      setProgress(30);
      const res = await scansAPI.create(formData);
      setProgress(100);
      showToast.success('Scan processed successfully!');
      navigate(`/editor/${res.data._id}`);
    } catch (err) {
      showToast.error(err.response?.data?.msg || 'Processing failed');
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Scanner</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Upload images and let AI process them into documents.</p>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        <div className="glass-card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            <Upload size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Upload Images
          </h3>
          <FileUpload onDrop={handleDrop} disabled={processing} />
          {files.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  position: 'relative',
                  width: 100, height: 100,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: 'var(--bg-tertiary)'
                }}>
                  <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ position: 'absolute', top: 4, right: 4, padding: '2px 6px', fontSize: 10 }}
                    onClick={() => removeFile(i)}
                    disabled={processing}
                  >
                    x
                  </button>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    fontSize: 10, padding: '2px 4px', textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {f.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <div className="glass-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              <Settings size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Scan Mode
            </h3>
            <ScanModeSelector value={scanMode} onChange={setScanMode} />
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="ocr" checked={ocrEnabled}
                onChange={(e) => setOcrEnabled(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }} />
              <label htmlFor="ocr" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Enable OCR text extraction
              </label>
            </div>
          </div>

          <div className="glass-card">
            <EnhancementControls values={enhancement} onChange={setEnhancement} />
          </div>
        </div>

        {processing && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Processing...</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{progress}%</span>
            </div>
            <ProgressBar progress={progress} variant="primary" />
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          onClick={handleProcess}
          disabled={processing || !files.length}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <FileDown size={18} />
          {processing ? 'Processing...' : `Process & Review (${files.length} images)`}
        </button>
      </div>
    </div>
  );
};

export default ScannerWorkspace;

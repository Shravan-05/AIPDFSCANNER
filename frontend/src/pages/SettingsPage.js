import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { settingsAPI } from '../services/api';
import { showToast } from '../components/UI/Toast';
import {
  Sun, Moon, Monitor, Save, Cloud, Globe, Zap,
  CheckCircle, XCircle, Loader, ChevronDown, ChevronUp,
  HardDrive, Database, Lock, Eye, EyeOff, Bot
} from 'lucide-react';

const PROVIDERS = [
  { value: 'none', label: 'No Cloud Storage', icon: HardDrive, color: '#6b7280' },
  { value: 'google-drive', label: 'Google Drive', icon: Cloud, color: '#4285f4' },
  { value: 'dropbox', label: 'Dropbox', icon: Database, color: '#0061ff' },
  { value: 's3', label: 'AWS S3', icon: Cloud, color: '#ff9900' }
];

const OCR_LANGUAGES = [
  { value: 'eng', label: '🇺🇸 English' },
  { value: 'spa', label: '🇪🇸 Spanish' },
  { value: 'fra', label: '🇫🇷 French' },
  { value: 'deu', label: '🇩🇪 German' },
  { value: 'chi_sim', label: '🇨🇳 Chinese (Simplified)' },
  { value: 'jpn', label: '🇯🇵 Japanese' },
  { value: 'ara', label: '🇸🇦 Arabic' },
  { value: 'por', label: '🇧🇷 Portuguese' },
  { value: 'hin', label: '🇮🇳 Hindi' },
  { value: 'kor', label: '🇰🇷 Korean' }
];

const SettingsPage = () => {
  const { setThemeMode } = useTheme();
  const { user } = useAuth();

  const [preferences, setPreferences] = useState({
    ocrEnabled: true,
    ocrLanguage: 'eng',
    exportQuality: 'standard',
    defaultScanMode: 'color',
    autoArrange: true,
    autoDuplicate: true,
    theme: 'system',
    cloudStorage: {
      provider: 'none',
      googleDrive: { apiKey: '', folderId: '' },
      dropbox: { accessToken: '' },
      s3: { bucketName: '', awsRegion: 'us-east-1', awsAccessKeyId: '', awsSecretAccessKey: '' }
    }
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    appearance: true, scan: true, ocr: true, cloud: true, ollama: true, account: true
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsAPI.get();
      if (res.data.preferences) {
        setPreferences(prev => ({
          ...prev,
          ...res.data.preferences,
          cloudStorage: {
            provider: 'none',
            googleDrive: { apiKey: '', folderId: '' },
            dropbox: { accessToken: '' },
            s3: { bucketName: '', awsRegion: 'us-east-1', awsAccessKeyId: '', awsSecretAccessKey: '' },
            ...(res.data.preferences.cloudStorage || {})
          }
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(preferences);
      setThemeMode(preferences.theme);
      showToast.success('Settings saved successfully!');
    } catch (err) {
      showToast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestCloud = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await settingsAPI.testCloud(preferences.cloudStorage);
      setTestResult(res.data);
      if (res.data.success) {
        showToast.success(res.data.message);
      } else {
        showToast.error(res.data.message);
      }
    } catch (err) {
      const msg = err.response?.data?.msg || 'Connection test failed';
      setTestResult({ success: false, message: msg });
      showToast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const updateCloud = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      cloudStorage: { ...prev.cloudStorage, [field]: value }
    }));
  };

  const updateCloudProvider = (provider, field, value) => {
    setPreferences(prev => ({
      ...prev,
      cloudStorage: {
        ...prev.cloudStorage,
        [provider]: { ...prev.cloudStorage[provider], [field]: value }
      }
    }));
  };

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ];

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const SectionHeader = ({ title, icon: Icon, sectionKey, description }) => (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', userSelect: 'none', marginBottom: expandedSections[sectionKey] ? 20 : 0
      }}
      onClick={() => toggleSection(sectionKey)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'var(--gradient-primary)', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={18} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: 15 }}>{title}</p>
          {description && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{description}</p>}
        </div>
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
    </div>
  );

  const Toggle = ({ checked, onChange, label, description }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</p>}
      </div>
      <div
        onClick={onChange}
        style={{
          width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
          background: checked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
          position: 'relative', transition: 'background 200ms', flexShrink: 0
        }}
      >
        <div style={{
          position: 'absolute', top: 3,
          left: checked ? 25 : 3, width: 20, height: 20,
          borderRadius: '50%', background: 'white',
          transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );

  const SecretInput = ({ value, onChange, placeholder, secretKey }) => (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        type={showSecrets[secretKey] ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: 44 }}
      />
      <button
        onClick={() => toggleSecret(secretKey)}
        style={{
          position: 'absolute', right: 12, top: '50%',
          transform: 'translateY(-50%)', background: 'none',
          border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)',
          display: 'flex', alignItems: 'center'
        }}
      >
        {showSecrets[secretKey] ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Customize your AuraScan AI workspace</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Appearance */}
        <div className="glass-card">
          <SectionHeader title="Appearance" icon={Monitor} sectionKey="appearance" description="Customize the look and feel" />
          {expandedSections.appearance && (
            <div style={{ display: 'flex', gap: 12 }}>
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPreferences(prev => ({ ...prev, theme: opt.value }))}
                  style={{
                    flex: 1, padding: '16px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${preferences.theme === opt.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: preferences.theme === opt.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-tertiary)',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8, transition: 'all 200ms',
                    color: preferences.theme === opt.value ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <opt.icon size={22} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scan Preferences */}
        <div className="glass-card">
          <SectionHeader title="Scan Preferences" icon={Zap} sectionKey="scan" description="Configure default scanning behavior" />
          {expandedSections.scan && (
            <div>
              <Toggle
                label="Auto-Arrange Pages"
                description="Automatically sort uploaded pages using AI"
                checked={preferences.autoArrange}
                onChange={() => setPreferences(prev => ({ ...prev, autoArrange: !prev.autoArrange }))}
              />
              <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
              <Toggle
                label="Duplicate Detection"
                description="Detect and flag duplicate pages automatically"
                checked={preferences.autoDuplicate}
                onChange={() => setPreferences(prev => ({ ...prev, autoDuplicate: !prev.autoDuplicate }))}
              />
              <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                    Export Quality
                  </label>
                  <select className="input" value={preferences.exportQuality}
                    onChange={(e) => setPreferences(prev => ({ ...prev, exportQuality: e.target.value }))}>
                    <option value="draft">Draft (Smaller file)</option>
                    <option value="standard">Standard</option>
                    <option value="high">High Quality (Larger file)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                    Default Scan Mode
                  </label>
                  <select className="input" value={preferences.defaultScanMode}
                    onChange={(e) => setPreferences(prev => ({ ...prev, defaultScanMode: e.target.value }))}>
                    <option value="color">Color</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="blackwhite">Black &amp; White</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OCR Language */}
        <div className="glass-card">
          <SectionHeader title="OCR & Text Recognition" icon={Globe} sectionKey="ocr" description="Configure text extraction settings" />
          {expandedSections.ocr && (
            <div>
              <Toggle
                label="Enable OCR"
                description="Extract searchable text from scanned documents"
                checked={preferences.ocrEnabled}
                onChange={() => setPreferences(prev => ({ ...prev, ocrEnabled: !prev.ocrEnabled }))}
              />
              <div style={{ height: 1, background: 'var(--border-color)', margin: '12px 0' }} />
              <div>
                <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>
                  OCR Language
                </label>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Select the primary language of your scanned documents for best accuracy.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {OCR_LANGUAGES.map(lang => (
                    <button
                      key={lang.value}
                      onClick={() => setPreferences(prev => ({ ...prev, ocrLanguage: lang.value }))}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${preferences.ocrLanguage === lang.value ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: preferences.ocrLanguage === lang.value ? 'rgba(99,102,241,0.1)' : 'var(--bg-tertiary)',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        color: preferences.ocrLanguage === lang.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                        transition: 'all 180ms', textAlign: 'left'
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cloud Storage */}
        <div className="glass-card">
          <SectionHeader title="Cloud Storage" icon={Cloud} sectionKey="cloud" description="Auto-sync exported PDFs to cloud" />
          {expandedSections.cloud && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 10 }}>
                  Cloud Provider
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {PROVIDERS.map(p => {
                    const isSelected = preferences.cloudStorage?.provider === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => updateCloud('provider', p.value)}
                        style={{
                          padding: '10px 18px', borderRadius: 'var(--radius-md)',
                          border: `2px solid ${isSelected ? p.color : 'var(--border-color)'}`,
                          background: isSelected ? `${p.color}18` : 'var(--bg-tertiary)',
                          color: isSelected ? p.color : 'var(--text-secondary)',
                          cursor: 'pointer', fontWeight: 500, fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 8,
                          transition: 'all 180ms'
                        }}
                      >
                        <p.icon size={16} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Google Drive Fields */}
              {preferences.cloudStorage?.provider === 'google-drive' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(66,133,244,0.06)', border: '1px solid rgba(66,133,244,0.2)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#4285f4', marginBottom: 4 }}>🔷 Google Drive Configuration</h4>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>API Key</label>
                    <SecretInput
                      value={preferences.cloudStorage.googleDrive?.apiKey || ''}
                      onChange={(e) => updateCloudProvider('googleDrive', 'apiKey', e.target.value)}
                      placeholder="AIzaSy..."
                      secretKey="gdriveKey"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Folder ID</label>
                    <input className="input" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                      value={preferences.cloudStorage.googleDrive?.folderId || ''}
                      onChange={(e) => updateCloudProvider('googleDrive', 'folderId', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Dropbox Fields */}
              {preferences.cloudStorage?.provider === 'dropbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(0,97,255,0.06)', border: '1px solid rgba(0,97,255,0.2)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0061ff', marginBottom: 4 }}>📦 Dropbox Configuration</h4>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Access Token</label>
                    <SecretInput
                      value={preferences.cloudStorage.dropbox?.accessToken || ''}
                      onChange={(e) => updateCloudProvider('dropbox', 'accessToken', e.target.value)}
                      placeholder="sl.XXXXXXXXXX..."
                      secretKey="dropboxToken"
                    />
                  </div>
                </div>
              )}

              {/* AWS S3 Fields */}
              {preferences.cloudStorage?.provider === 's3' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(255,153,0,0.06)', border: '1px solid rgba(255,153,0,0.2)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#ff9900', marginBottom: 4 }}>☁️ AWS S3 Configuration</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Bucket Name</label>
                      <input className="input" placeholder="my-aurascan-bucket"
                        value={preferences.cloudStorage.s3?.bucketName || ''}
                        onChange={(e) => updateCloudProvider('s3', 'bucketName', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>AWS Region</label>
                      <input className="input" placeholder="us-east-1"
                        value={preferences.cloudStorage.s3?.awsRegion || 'us-east-1'}
                        onChange={(e) => updateCloudProvider('s3', 'awsRegion', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Access Key ID</label>
                      <input className="input" placeholder="AKIA..."
                        value={preferences.cloudStorage.s3?.awsAccessKeyId || ''}
                        onChange={(e) => updateCloudProvider('s3', 'awsAccessKeyId', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Secret Access Key</label>
                      <SecretInput
                        value={preferences.cloudStorage.s3?.awsSecretAccessKey || ''}
                        onChange={(e) => updateCloudProvider('s3', 'awsSecretAccessKey', e.target.value)}
                        placeholder="wJalrXUtnFEMI/K7MDENG..."
                        secretKey="s3Secret"
                      />
                    </div>
                  </div>
                </div>
              )}

              {preferences.cloudStorage?.provider !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handleTestCloud}
                    disabled={testing}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    {testing ? <Loader size={16} className="spin" /> : <Zap size={16} />}
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {testResult && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                      color: testResult.success ? 'var(--success)' : 'var(--error)'
                    }}>
                      {testResult.success
                        ? <CheckCircle size={16} />
                        : <XCircle size={16} />}
                      {testResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ollama AI */}
        <div className="glass-card">
          <SectionHeader title="Ollama AI Agent" icon={Bot} sectionKey="ollama" description="Natural language PDF command engine" />
          {expandedSections.ollama && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Ollama powers the AI Document Agent in the AI Editor. It parses natural language commands into PDF actions.
                Install from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> and run <code>ollama pull llama2</code>.
              </p>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    const api = (await import('../services/api')).default;
                    const res = await api.get('/pdf/ollama/test');
                    if (res.data.success) {
                      showToast.success(res.data.message);
                    } else {
                      showToast.error(res.data.message || 'Ollama unavailable');
                    }
                  } catch {
                    showToast.error('Ollama connection failed. Ensure Ollama is running.');
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Zap size={16} /> Test Ollama Connection
              </button>
            </div>
          )}
        </div>

        {/* Account */}
        <div className="glass-card">
          <SectionHeader title="Account" icon={Lock} sectionKey="account" description="Your profile information" />
          {expandedSections.account && (
            <div style={{ display: 'grid', gap: 0 }}>
              {[
                { label: 'Name', value: user?.name || '-' },
                { label: 'Email', value: user?.email || '-' },
                { label: 'Storage Used', value: formatSize(user?.storageUsed) },
                { label: 'Account Created', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-' }
              ].map((item, i, arr) => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', justifyContent: 'center', gap: 10 }}
        >
          {saving ? <Loader size={18} className="spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;

import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';

const FileUpload = ({ onDrop, accept = { 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp', '.gif', '.svg', '.heic', '.heif', '.avif'] }, maxFiles = 50, disabled = false }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message || 'File not accepted';
      console.error('Upload error:', msg);
    }
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '48px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 250ms ease',
        background: isDragActive ? 'rgba(99,102,241,0.05)' : 'transparent'
      }}
    >
      <input {...getInputProps()} />
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px'
      }}>
        {isDragActive ? <Upload size={28} style={{ color: 'var(--accent-primary)' }} /> : <ImageIcon size={28} style={{ color: 'var(--text-secondary)' }} />}
      </div>
      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
        {isDragActive ? 'Drop your images here' : 'Drag & drop images here'}
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
        PNG, JPG, TIFF, BMP, WebP, GIF, SVG, HEIC &mdash; up to 10MB each
      </p>
    </div>
  );
};

export default FileUpload;

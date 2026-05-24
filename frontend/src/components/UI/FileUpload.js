import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { showToast } from './Toast';

const IMAGE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.jpe', '.jfif', '.pjpeg', '.pjp',
  '.gif', '.webp', '.bmp', '.dib', '.tif', '.tiff', '.svg', '.svgz',
  '.heic', '.heif', '.avif', '.ico', '.cur', '.apng',
  '.jp2', '.j2k', '.jpf', '.jpx', '.jpm', '.mj2',
  '.psd', '.psb', '.tga', '.icb', '.vda', '.vst',
  '.pbm', '.pgm', '.ppm', '.pnm', '.pfm',
  '.ras', '.xpm', '.xbm', '.pct', '.pict', '.pic',
  '.sgi', '.rgb', '.rgba', '.bw', '.exr', '.hdr'
];

const FileUpload = ({ onDrop, accept = { 'image/*': IMAGE_EXTENSIONS, 'application/octet-stream': IMAGE_EXTENSIONS }, maxFiles = 50, disabled = false }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message || 'File not accepted';
      console.error('Upload error:', msg);
      showToast.error(msg);
    }
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'max(24px, 3.5vw)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 250ms ease',
        background: isDragActive ? 'rgba(99,102,241,0.05)' : 'transparent',
        minHeight: '120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <input {...getInputProps()} />
      <div style={{
        width: 'clamp(48px, 8vw, 64px)', 
        height: 'clamp(48px, 8vw, 64px)', 
        borderRadius: '50%',
        background: 'var(--bg-tertiary)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto clamp(12px, 2vw, 16px)',
        flexShrink: 0
      }}>
        {isDragActive ? <Upload size={28} style={{ color: 'var(--accent-primary)' }} /> : <ImageIcon size={28} style={{ color: 'var(--text-secondary)' }} />}
      </div>
      <p style={{ 
        fontSize: 'clamp(14px, 2vw, 16px)', 
        fontWeight: 500, 
        color: 'var(--text-primary)', 
        marginBottom: 4,
        wordBreak: 'break-word',
        padding: '0 8px'
      }}>
        {isDragActive ? 'Drop your images here' : 'Drag & drop images here'}
      </p>
      <p style={{ 
        fontSize: 'clamp(12px, 1.5vw, 13px)', 
        color: 'var(--text-tertiary)',
        wordBreak: 'break-word',
        padding: '0 8px',
        maxWidth: '100%'
      }}>
        All image formats supported — up to 10MB each
      </p>
    </div>
  );
};

export default FileUpload;

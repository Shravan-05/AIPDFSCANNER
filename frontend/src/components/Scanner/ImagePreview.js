import React, { useState } from 'react';
import { getFileUrl } from '../../services/api';

const ImagePreview = ({ original, processed, alt = 'Preview' }) => {
  const [showProcessed, setShowProcessed] = useState(false);

  const imageUrl = showProcessed && processed ? processed : original;

  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {imageUrl ? (
        <img
          src={getFileUrl(imageUrl)}
          alt={alt}
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--radius-md)' }}
        />
      ) : (
        <div style={{
          width: '100%', height: 240,
          background: 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-tertiary)', fontSize: 14
        }}>
          No preview available
        </div>
      )}
      {original && processed && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${showProcessed ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowProcessed(false)}
          >
            Original
          </button>
          <button
            className={`btn btn-sm ${showProcessed ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowProcessed(true)}
          >
            Processed
          </button>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;

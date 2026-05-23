import React from 'react';

const sliders = [
  { key: 'brightness', label: 'Brightness', min: 0.5, max: 1.5, step: 0.05 },
  { key: 'contrast', label: 'Contrast', min: 0.5, max: 2.0, step: 0.05 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 3.0, step: 0.1 }
];

const EnhancementControls = ({ values = {}, onChange }) => {
  const getVal = (key) => values[key] ?? 1.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Enhancement</h4>
      {sliders.map(({ key, label, min, max, step }) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</label>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{getVal(key).toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={getVal(key)}
            onChange={(e) => onChange({ ...values, [key]: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
          />
        </div>
      ))}
    </div>
  );
};

export default EnhancementControls;

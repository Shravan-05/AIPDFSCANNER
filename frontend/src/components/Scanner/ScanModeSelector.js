import React from 'react';
import { Image, Contrast, ScanLine } from 'lucide-react';

const modes = [
  { value: 'color', label: 'Color', icon: Image },
  { value: 'grayscale', label: 'Grayscale', icon: Contrast },
  { value: 'blackwhite', label: 'B&W', icon: ScanLine }
];

const ScanModeSelector = ({ value = 'color', onChange }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {modes.map(mode => (
      <button
        key={mode.value}
        className={`btn btn-sm ${value === mode.value ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => onChange(mode.value)}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <mode.icon size={16} />
        {mode.label}
      </button>
    ))}
  </div>
);

export default ScanModeSelector;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Upload, FileText } from 'lucide-react';

const actions = [
  { label: 'New Scan', icon: ScanLine, path: '/scanner', variant: 'primary' },
  { label: 'Upload Files', icon: Upload, path: '/scanner', variant: 'secondary' },
  { label: 'Browse Files', icon: FileText, path: '/files', variant: 'secondary' }
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {actions.map(action => (
        <button
          key={action.label}
          className={`btn btn-${action.variant}`}
          onClick={() => navigate(action.path)}
        >
          <action.icon size={18} />
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;

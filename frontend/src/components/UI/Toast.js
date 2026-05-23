import toast from 'react-hot-toast';

export const showToast = {
  success: (msg) => toast.success(msg, {
    style: {
      background: 'var(--bg-glass)',
      color: 'var(--text-primary)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)'
    },
    iconTheme: { primary: 'var(--success)', secondary: 'white' }
  }),
  error: (msg) => toast.error(msg, {
    style: {
      background: 'var(--bg-glass)',
      color: 'var(--text-primary)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)'
    },
    iconTheme: { primary: 'var(--error)', secondary: 'white' }
  }),
  info: (msg) => toast(msg, {
    icon: 'ℹ️',
    style: {
      background: 'var(--bg-glass)',
      color: 'var(--text-primary)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)'
    }
  })
};

const Toast = () => null;
export default Toast;

import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '16px 24px',
      color: 'var(--text-tertiary)',
      fontSize: 13,
      borderTop: '1px solid var(--border-color)'
    }}>
      AuraScan AI &copy; {new Date().getFullYear()}. Built with care.
    </footer>
  );
};

export default Footer;

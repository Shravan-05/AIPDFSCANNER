import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon: Icon,
  style, ...props
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger'
  };
  const sizes = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    xl: 'btn-xl'
  };

  return (
    <button
      className={`btn ${variants[variant]} ${sizes[size]}`}
      disabled={disabled || loading}
      style={style}
      {...props}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export default Button;

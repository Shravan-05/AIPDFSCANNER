import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { showToast } from '../../components/UI/Toast';
import { ArrowLeft, CheckCircle, Mail } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      showToast.success('Reset link sent (check server console)');
    } catch (err) {
      showToast.error(err.response?.data?.msg || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.05) 100%)'
      }}>
        <div className="glass" style={{ width: '100%', maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} style={{ color: 'var(--success)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Check your email</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            If an account exists with <strong>{email}</strong>, we've sent a password reset link (check the server console).
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.05) 100%)'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          <ArrowLeft size={16} /> Back to sign in
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Mail size={22} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Forgot password?</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Enter your email and we'll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn btn-primary btn-lg"
            disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

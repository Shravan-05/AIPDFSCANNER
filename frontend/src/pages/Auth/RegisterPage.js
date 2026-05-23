import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/UI/Toast';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { label: 'Weak', color: 'var(--error)', width: '20%' };
    if (score <= 3) return { label: 'Medium', color: 'var(--warning)', width: '50%' };
    return { label: 'Strong', color: 'var(--success)', width: '100%' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      showToast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      showToast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      showToast.error(err.response?.data?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, rgba(99,102,241,0.05) 100%)'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 24
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 18, color: 'white'
            }}>A</div>
            <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-primary)' }}>AuraScan</span>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Create account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Start scanning documents for free</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Full Name
            </label>
            <input className="input" type="text" placeholder="John Doe"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Email
            </label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 40 }} required />
              <button type="button" className="btn btn-ghost btn-sm"
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 6 }}
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ width: strength.width, height: '100%', background: strength.color, borderRadius: 'var(--radius-full)', transition: 'all 200ms' }} />
                </div>
                <span style={{ fontSize: 11, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Confirm Password
            </label>
            <input className="input" type="password" placeholder="Repeat your password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary btn-lg"
            disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creating account...' : 'Create Account'} {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

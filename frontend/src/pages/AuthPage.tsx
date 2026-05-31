import React, { useState, useRef, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';

interface AuthPageProps {
  onAuthSuccess: (user: { id: string; email: string }) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic Validation
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // Sign Up
        await api.register(email, password);
        setSuccess('Account created successfully! Switching to Login...');
        timeoutRef.current = setTimeout(() => {
          setIsRegister(false);
          setPassword('');
          setSuccess(null);
        }, 1500);
      } else {
        // Login
        const data = await api.login(email, password);
        setAuthToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onAuthSuccess({ id: data.user.id, email: data.user.email });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel auth-card">
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
        {isRegister ? 'Join Store' : 'Sign In'}
      </h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            className="form-control"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', marginTop: '10px' }}
        >
          {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'rgba(0,0,0,0.6)' }}>
        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          className="btn-link"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
            setSuccess(null);
          }}
        >
          {isRegister ? 'Login Here' : 'Register Now'}
        </button>
      </div>

      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-solid)',
          fontSize: '11px',
          color: 'rgba(0,0,0,0.4)',
          textAlign: 'center'
        }}
      >
        Quick Testing Credentials:<br />
        Email: <strong>test@example.com</strong> / Pass: <strong>Password123</strong>
      </div>
    </div>
  );
};

export default AuthPage;

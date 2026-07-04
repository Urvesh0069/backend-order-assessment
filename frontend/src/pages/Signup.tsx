import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { signup, toErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AlertIcon } from '../components/Icons';

export default function Signup() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await signup(email.trim(), password);
      signIn(data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2>Create your account</h2>
      <p className="sub">Get started with OrderOps in seconds.</p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 18 }}>
          <AlertIcon width={18} height={18} /> <span>{error}</span>
        </div>
      )}

      <form className="stack stack-16" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email" type="email" className="input" placeholder="you@company.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" className="input" placeholder="At least 6 characters"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" required
          />
          <span className="pw-hint">Use 6 or more characters.</span>
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm" type="password" className="input" placeholder="Re-enter password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password" required
          />
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <><span className="spinner" /> Creating account…</> : 'Create account'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}

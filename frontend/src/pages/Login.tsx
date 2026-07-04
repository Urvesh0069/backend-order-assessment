import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { login, toErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AlertIcon } from '../components/Icons';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      signIn(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h2>Welcome back</h2>
      <p className="sub">Sign in to your OrderOps workspace.</p>

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
            id="password" type="password" className="input" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required
          />
        </div>
        <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
        </button>
      </form>

      <p className="auth-switch">
        Don&apos;t have an account? <Link to="/signup">Create one</Link>
      </p>
    </AuthShell>
  );
}

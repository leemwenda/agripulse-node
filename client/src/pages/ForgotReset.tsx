import { useEffect } from 'react';
import { useState, FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Leaf, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import { Alert } from '../components/ui';

// ── Forgot Password Page ─────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  useEffect(() => { document.title = 'Reset Password — AgriPulse'; return () => { document.title = 'AgriPulse'; }; }, []);
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSuccess(data.message || 'If this email is registered, a reset link has been sent.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-farm-green to-farm-teal flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-farm-green mb-4">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send a reset link</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <Alert type="success" message={success} />
            <Link to="/login" className="btn-primary w-full justify-center flex items-center gap-2 py-3 mt-2">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="mb-4"><Alert type="error" message={error} /></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  className="input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </button>
            </form>
            <p className="text-center text-sm text-gray-500 mt-6">
              <Link to="/login" className="text-farm-green font-semibold hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reset Password Page ──────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const [params]              = useSearchParams();
  const navigate              = useNavigate();
  const token                 = params.get('token') || '';
  const [password, setPass]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setSuccess(data.message || 'Password updated. You can now log in.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-farm-green to-farm-teal flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <Alert type="error" message="Invalid reset link. Please request a new one." />
          <Link to="/forgot-password" className="btn-primary mt-6 w-full justify-center flex items-center gap-2 py-3">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-farm-green to-farm-teal flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-farm-green mb-4">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter a new password for your account</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <Alert type="success" message={success} />
            <p className="text-sm text-gray-500">Redirecting to sign in...</p>
          </div>
        ) : (
          <>
            {error && <div className="mb-4"><Alert type="error" message={error} /></div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <input
                    className="input pr-10" type={show ? 'text' : 'password'}
                    value={password} onChange={e => setPass(e.target.value)}
                    placeholder="Min. 8 characters" required minLength={8}
                  />
                  <button type="button" onClick={() => setShow(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  className="input" type="password"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password" required
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

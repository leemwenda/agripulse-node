import { useEffect, useState, FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import api from '../lib/api';

const COW_IMAGES = ['/cow1.jpg', '/cow2.jpg', '/cow3.jpg', '/cow4.jpg'];

function SlideshowBg() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % COW_IMAGES.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      {COW_IMAGES.map((src, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === current ? 1 : 0,
          transition: 'opacity 1.8s ease-in-out',
        }} />
      ))}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg,rgba(5,10,18,.6) 0%,rgba(5,10,18,.75) 50%,rgba(5,10,18,.92) 100%)',
      }} />
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 14px 0 14px',
  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
  borderRadius: 9, fontSize: '16px', color: '#fff', outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600,
  color: 'rgba(130,160,140,.75)', marginBottom: 6,
  letterSpacing: '0.3px', textTransform: 'uppercase',
};

function StrengthBar({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters',    ok: password.length >= 8 },
    { label: 'One uppercase letter',      ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',      ok: /[a-z]/.test(password) },
    { label: 'One number',               ok: /[0-9]/.test(password) },
    { label: 'One special character',    ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? colors[score] : 'rgba(255,255,255,.1)',
            transition: 'background .3s',
          }} />
        ))}
      </div>
      {score > 0 && (
        <div style={{ fontSize: '0.7rem', color: colors[score], fontWeight: 600, marginBottom: 8 }}>
          {labels[score]}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {checks.map(({ label, ok }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {ok
              ? <CheckCircle2 style={{ width: 12, height: 12, color: '#10b981', flexShrink: 0 }} />
              : <XCircle     style={{ width: 12, height: 12, color: 'rgba(255,255,255,.2)', flexShrink: 0 }} />
            }
            <span style={{ fontSize: '0.72rem', color: ok ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.25)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlassCard({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{
      position: 'relative', zIndex: 2,
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(8,14,26,.7)', backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,.1)', borderRadius: 24,
        padding: 'clamp(28px,5vw,44px) clamp(20px,5vw,40px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset, 0 32px 80px rgba(0,0,0,.7)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(16,185,129,.5) 30%,rgba(59,130,246,.4) 70%,transparent)',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg,rgba(16,185,129,.2),rgba(16,185,129,.05))',
            border: '1px solid rgba(16,185,129,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ width: 22, height: 22 }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>{title}</h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.38)' }}>{subtitle}</p>
        </div>

        {children}

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,.25)', marginTop: 24 }}>
          <Link to="/login" style={{ color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft style={{ width: 12, height: 12 }} /> Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Forgot Password Page ─────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  useEffect(() => {
    document.title = 'Forgot Password — AgriPulse';
    return () => { document.title = 'AgriPulse'; };
  }, []);

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
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
    <div style={{ minHeight: '100vh', background: '#070c12' }}>
      <SlideshowBg />
      {success ? (
        <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            width: '100%', maxWidth: 420, textAlign: 'center',
            background: 'rgba(8,14,26,.7)', backdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,.1)', borderRadius: 24,
            padding: '44px 40px',
            boxShadow: '0 32px 80px rgba(0,0,0,.7)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(16,185,129,.15)', border: '2px solid #10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: 28, height: 28 }}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>Check your inbox</h2>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 28 }}>
              {success}
            </p>
            <Link to="/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px', borderRadius: 9,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
            }}>
              <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <GlassCard title="Forgot password?" subtitle="Enter your email and we'll send a reset link">
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 8, color: '#f87171', fontSize: '0.82rem',
            }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                style={fieldStyle} type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                onFocus={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,.5)'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'}
              />
            </div>
            <button
              onClick={handleSubmit as any}
              disabled={loading || !email}
              style={{
                width: '100%', height: 46,
                background: loading || !email ? 'rgba(16,185,129,.4)' : 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: '0.875rem', fontWeight: 600, cursor: loading || !email ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(16,185,129,.25)', transition: 'opacity .2s',
              }}
            >
              {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </GlassCard>
      )}
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
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    document.title = 'Reset Password — AgriPulse';
    return () => { document.title = 'AgriPulse'; };
  }, []);

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const isStrong = checks.every(Boolean);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!isStrong)            { setError('Password does not meet all requirements.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setSuccess(data.message || 'Password reset successfully.');
      setTimeout(() => navigate('/login?reset=success'), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#070c12' }}>
        <SlideshowBg />
        <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            width: '100%', maxWidth: 420, textAlign: 'center',
            background: 'rgba(8,14,26,.7)', backdropFilter: 'blur(32px)',
            border: '1px solid rgba(239,68,68,.2)', borderRadius: 24, padding: '44px 40px',
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(239,68,68,.1)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle style={{ width: 26, height: 26, color: '#ef4444' }} />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>Invalid Reset Link</h2>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.82rem', marginBottom: 24 }}>
              This link is missing or malformed. Please request a new one.
            </p>
            <Link to="/forgot-password" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px', borderRadius: 9, background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem',
            }}>
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070c12' }}>
      <SlideshowBg />
      {success ? (
        <div style={{ position: 'relative', zIndex: 2, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{
            width: '100%', maxWidth: 420, textAlign: 'center',
            background: 'rgba(8,14,26,.7)', backdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: '44px 40px',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(16,185,129,.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: 28, height: 28 }}><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginBottom: 10 }}>Password Reset!</h2>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 8 }}>{success}</p>
            <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '0.75rem' }}>Redirecting to sign in...</p>
          </div>
        </div>
      ) : (
        <GlassCard title="Reset your password" subtitle="Create a strong new password for your account">
          {error && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 8, color: '#f87171', fontSize: '0.82rem',
            }}>{error}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...fieldStyle, paddingRight: 42 }}
                  type={showPass ? 'text' : 'password'}
                  value={password} onChange={e => setPass(e.target.value)}
                  placeholder="Min. 8 characters" required
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{
                  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, background: 'none', border: 'none',
                  color: 'rgba(255,255,255,.3)', cursor: 'pointer', borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {showPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
              <StrengthBar password={password} />
            </div>

            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{
                    ...fieldStyle, paddingRight: 42,
                    borderColor: confirm && password !== confirm ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.09)',
                  }}
                  type={showConf ? 'text' : 'password'}
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password" required
                  onFocus={e => e.currentTarget.style.borderColor = confirm && password !== confirm ? 'rgba(239,68,68,.5)' : 'rgba(16,185,129,.5)'}
                  onBlur={e => e.currentTarget.style.borderColor = confirm && password !== confirm ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.09)'}
                />
                <button type="button" onClick={() => setShowConf(p => !p)} style={{
                  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, background: 'none', border: 'none',
                  color: 'rgba(255,255,255,.3)', cursor: 'pointer', borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {showConf ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
              {confirm && password !== confirm && (
                <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            <button
              onClick={handleSubmit as any}
              disabled={loading || !isStrong || password !== confirm}
              style={{
                width: '100%', height: 46, marginTop: 4,
                background: loading || !isStrong || password !== confirm
                  ? 'rgba(16,185,129,.35)'
                  : 'linear-gradient(135deg,#10b981,#059669)',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: '0.875rem', fontWeight: 600,
                cursor: loading || !isStrong || password !== confirm ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(16,185,129,.25)', transition: 'all .2s',
              }}
            >
              {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

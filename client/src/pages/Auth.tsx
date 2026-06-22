import { useState, useEffect, useRef, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Alert } from '../components/ui';

const COW_IMAGES = ['/cow1.jpg', '/cow2.jpg', '/cow3.jpg', '/cow4.jpg'];

const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function SlideshowBg() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goSlide = (n: number) => {
    setCurrent(n);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % COW_IMAGES.length), 5000);
  };
  useEffect(() => {
    timerRef.current = setInterval(() => setCurrent(p => (p + 1) % COW_IMAGES.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
  return (
    <>
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
          background: 'linear-gradient(90deg,rgba(5,10,18,.25) 0%,rgba(5,10,18,.5) 40%,rgba(5,10,18,.88) 60%,rgba(5,10,18,.97) 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7, zIndex: 2 }}>
          {COW_IMAGES.map((_, i) => (
            <button key={i} onClick={() => goSlide(i)} style={{
              width: i === current ? 20 : 7, height: 7, borderRadius: 99,
              background: i === current ? '#10b981' : 'rgba(255,255,255,.3)',
              border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 60% at 0% 100%,rgba(16,185,129,.08) 0%,transparent 60%),radial-gradient(ellipse 40% 40% at 100% 0%,rgba(59,130,246,.07) 0%,transparent 55%)',
      }} />
    </>
  );
}

function LeftPanel() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: 'clamp(40px,6vw,80px) clamp(32px,6vw,72px)',
    }} className="hidden lg:flex">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 56 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
          background: '#fff', padding: 4, flexShrink: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,.3)',
        }}>
          <img src="/logo.png" alt="AgriPulse" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '.5px' }}>AgriPulse</span>
      </div>
      <h1 style={{
        fontSize: 'clamp(3.5rem,6vw,6rem)',
        fontWeight: 800, lineHeight: 1.0, color: '#fff', marginBottom: 0,
        letterSpacing: '-3px', textShadow: '0 2px 30px rgba(0,0,0,.5)',
      }}>
        Welcome!
      </h1>
      <div style={{ width: 40, height: 3, background: '#10b981', borderRadius: 99, margin: '20px 0 20px' }} />
      <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,.55)', lineHeight: 1.8, maxWidth: 320, marginBottom: 40 }}>
        A complete dairy farm management platform — built for farmers who want control over every aspect of their operation.
      </p>

    </div>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 40px) clamp(12px, 4vw, 40px)', background: 'rgba(20,10,40,.45)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderLeft: '1px solid rgba(255,255,255,.08)', width: '100%', maxWidth: '500px', flex: '1 1 auto' }}>
      <div style={{ width: '100%', maxWidth: 440, background: 'rgba(15,8,35,.65)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 24, padding: 'clamp(28px, 5vw, 44px) clamp(20px, 5vw, 40px)', boxShadow: '0 0 0 1px rgba(255,255,255,.04) inset, 0 32px 80px rgba(0,0,0,.7)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent 0%,rgba(16,185,129,.5) 30%,rgba(59,130,246,.4) 70%,transparent 100%)' }} />
        {children}
      </div>
    </div>
  );
}

const fieldStyle = { width: '100%', height: 44, padding: '0 14px 0 42px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 9, fontFamily: 'Inter, sans-serif', fontSize: '16px', color: '#fff', outline: 'none', boxSizing: 'border-box' as const };
const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(130,160,140,.75)', marginBottom: 6, letterSpacing: '0.3px', textTransform: 'uppercase' as const };
const iconWrap = { position: 'absolute' as const, left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', pointerEvents: 'none' as const };

function EmailIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }

function Divider({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.3)' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }} />
    </div>
  );
}

function GoogleBtn({ label }: { label: string }) {
  return (
    <a href="/api/auth/google" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', padding: '11px 16px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, fontSize: '0.875rem', fontWeight: 600, color: '#fff', textDecoration: 'none', transition: 'background 0.18s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
    >{GOOGLE_SVG}{label}</a>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading} style={{ width: '100%', height: 46, background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(16,185,129,.3)', opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
      {loading && <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

function Tabs({ active }: { active: 'login' | 'register' }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 3, marginBottom: 28, gap: 2 }}>
      {[{ label: 'Sign In', to: '/login', key: 'login' }, { label: 'Register Farm', to: '/register', key: 'register' }].map(t => (
        <Link key={t.key} to={t.to} style={{ flex: 1, textAlign: 'center', padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none', color: active === t.key ? '#34d399' : 'rgba(255,255,255,.35)', background: active === t.key ? 'rgba(16,185,129,.15)' : 'transparent', boxShadow: active === t.key ? '0 0 0 1px rgba(16,185,129,.2) inset' : 'none', transition: 'all 0.18s' }}>{t.label}</Link>
      ))}
    </div>
  );
}


function ForgotModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSuccess(data.message || 'Reset link sent! Check your inbox.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'rgba(8,14,26,.97)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 400, position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,.8)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, marginBottom: 6 }}>Reset Password</h3>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.82rem' }}>Enter your email and we will send you a reset link</p>
        </div>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,.15)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" style={{ width: 24, height: 24 }}><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style={{ color: '#34d399', fontWeight: 600, marginBottom: 8 }}>Email Sent!</p>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.82rem', marginBottom: 20 }}>{success}</p>
            <button onClick={onClose} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Back to Sign In</button>
          </div>
        ) : (
          <>
            {error && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, color: '#f87171', fontSize: '0.82rem' }}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconWrap}><EmailIcon /></span>
                  <input style={fieldStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', height: 44, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading && <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />}
                Send Reset Link
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const errorMap: Record<string, string> = { google_cancelled: 'Google sign-in was cancelled.', google_failed: 'Google sign-in failed. Please try again.', account_inactive: 'Your account is inactive. Contact support.' };
  const urlError = params.get('error');
  const resetSuccess = params.get('reset') === 'success';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password, remember); navigate('/dashboard'); }
    catch (err: unknown) { const e = err as { response?: { data?: { error?: string } } }; setError(e?.response?.data?.error || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070c12', display: 'flex', flexDirection: 'row', overflowX: 'hidden' }}>
      <style>{`* { box-sizing: border-box; } body { overflow-x: hidden; }`}</style>
      <SlideshowBg />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', minHeight: '100vh', alignItems: 'stretch', width: '100%' }} className="flex flex-col lg:flex-row">
        <LeftPanel />
        <GlassCard>
          <Tabs active="login" />
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Inter,sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: 5 }}>Sign in</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.38)' }}>Enter your credentials to access the dashboard</p>
          </div>
          {resetSuccess && <div style={{ marginBottom: 16 }}><Alert type="success" message="Your password has been reset successfully. Please sign in." /></div>}
          {urlError && <div style={{ marginBottom: 16 }}><Alert type="error" message={errorMap[urlError] || 'An error occurred.'} /></div>}
          {error && <div style={{ marginBottom: 16 }}><Alert type="error" message={error} /></div>}
          <GoogleBtn label="Sign in with Google" />
          <Divider text="or sign in with email" />
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email address</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><EmailIcon /></span>
                <input style={fieldStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><LockIcon /></span>
                <input style={{ ...fieldStyle, paddingRight: 42 }} type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                <button type="button" onClick={() => setShow(p => !p)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {show ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.78rem', color: 'rgba(255,255,255,.38)', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#10b981' }} />
                Keep me signed in
              </label>
              <button type="button" onClick={() => setShowForgot(true)} style={{ fontSize: '0.75rem', color: '#10b981', textDecoration: 'none', opacity: 0.85, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Forgot password?</button>
            </div>
            <SubmitBtn loading={loading}>Sign In to Dashboard</SubmitBtn>
          </form>
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,.35)', marginTop: 24 }}>
            Don't have an account?{' '}<Link to="/register" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>Register Farm</Link>
          </p>
        </GlassCard>
      </div>
      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      if (data.user) { navigate('/dashboard'); }
      else { setSuccess(data.message || 'Account submitted for review.'); }
    } catch (err: unknown) { const e = err as { response?: { data?: { error?: string } } }; setError(e?.response?.data?.error || 'Registration failed.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070c12', display: 'flex', flexDirection: 'row', overflowX: 'hidden' }}>
      <style>{`* { box-sizing: border-box; } body { overflow-x: hidden; }`}</style>
      <SlideshowBg />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', minHeight: '100vh', alignItems: 'stretch', width: '100%' }} className="flex flex-col lg:flex-row">
        <LeftPanel />
        <GlassCard>
          <Tabs active="register" />
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Inter,sans-serif', fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: 5 }}>Create account</h2>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.38)' }}>Join your farm team — fill in your details below</p>
          </div>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <Alert type="success" message={success} />
              <Link to="/login" style={{ display: 'block', marginTop: 24, padding: '12px 24px', background: '#10b981', color: '#fff', borderRadius: 9, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Go to Sign In</Link>
            </div>
          ) : (
            <>
              {error && <div style={{ marginBottom: 16 }}><Alert type="error" message={error} /></div>}
              <GoogleBtn label="Sign up with Google" />
              <Divider text="or register with email" />
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Full name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><UserIcon /></span>
                    <input style={fieldStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. John Kamau" required minLength={2} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><EmailIcon /></span>
                    <input style={fieldStyle} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={iconWrap}><LockIcon /></span>
                    <input style={{ ...fieldStyle, paddingRight: 42 }} type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" required minLength={8} />
                    <button type="button" onClick={() => setShow(p => !p)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {show ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                    </button>
                  </div>
                </div>
                <SubmitBtn loading={loading}>Create Account</SubmitBtn>
              </form>
            </>
          )}
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,.35)', marginTop: 24 }}>
            Already have an account?{' '}<Link to="/login" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

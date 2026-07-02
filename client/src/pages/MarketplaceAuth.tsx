import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, FileText } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#0ea5e9';
const BLUE_DARK = '#0284c7';
const SLIDES = [
  { img: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=900&q=80', caption: 'Buy verified livestock with full health history.' },
  { img: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=900&q=80', caption: 'Connect directly with trusted farmers across Kenya.' },
];
const COUNTIES = ['Nairobi','Kiambu','Nakuru','Meru','Nyandarua','Laikipia','Trans Nzoia','Uasin Gishu','Kericho','Bomet','Nyeri','Muranga','Kirinyaga','Embu','Machakos','Kajiado','Other'];

export default function MarketplaceAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const isLogin = !location.pathname.endsWith('/register') && !location.pathname.endsWith('/signup');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', county: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slide, setSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const t = setInterval(() => setSlide(p => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      navigate('/marketplace');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.');
    } finally { setLoading(false); }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault(); setError('');
    if (regForm.password !== regForm.confirm) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms of Service.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/register', { name: regForm.name, email: regForm.email, phone: regForm.phone, county: regForm.county, password: regForm.password, role: 'buyer' });
      navigate('/marketplace/login');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  }

  const inp: any = { width: '100%', height: 48, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.15)', borderRadius: 10, fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', color: '#fff', caretColor: '#fff', boxSizing: 'border-box' };
  const lbl: any = { fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 };

  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ background: '#fff', borderRadius: 9, padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
        <img src="/agripulse-logo.png" alt="AgriPulse" style={{ height: 28, width: 'auto', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>AgriPulse</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>| Marketplace</span>
    </div>
  );

  const FormContent = () => isLogin ? (
    <>
      <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Welcome back!</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginBottom: 24 }}>Login to buy and sell livestock on the marketplace.</p>
      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={lbl}>Email</label><input style={inp} type="email" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} required /></div>
        <div>
          <label style={lbl}>Password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...inp, paddingRight: 44 }} type={showPw ? 'text' : 'password'} value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} style={{ height: 48, background: loading ? 'rgba(14,165,233,.4)' : `linear-gradient(135deg,${BLUE},${BLUE_DARK})`, color: '#fff', border: 'none', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Signing in...' : 'Login →'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 22 }}>
        Don't have an account? <Link to="/marketplace/register" style={{ color: BLUE, fontWeight: 700, textDecoration: 'none' }}>Sign up here</Link>
      </p>
    </>
  ) : (
    <>
      <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Create your account</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginBottom: 18 }}>Join AgriPulse Marketplace to buy and sell livestock.</p>
      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div><label style={lbl}>Full Name</label><input style={inp} value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} required /></div>
        <div><label style={lbl}>Email</label><input style={inp} type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} required /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>Phone</label><input style={inp} placeholder="07XX XXX XXX" value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} /></div>
          <div><label style={lbl}>County</label>
            <select style={{ ...inp, color: regForm.county ? '#fff' : 'rgba(255,255,255,.4)' }} value={regForm.county} onChange={e => setRegForm(p => ({ ...p, county: e.target.value }))}>
              <option value="">Select</option>
              {COUNTIES.map(c => <option key={c} value={c} style={{ background: '#0a2540' }}>{c}</option>)}
            </select>
          </div>
        </div>
        <div><label style={lbl}>Password</label><input style={inp} type={showPw ? 'text' : 'password'} value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} required /></div>
        <div><label style={lbl}>Confirm Password</label><input style={inp} type="password" value={regForm.confirm} onChange={e => setRegForm(p => ({ ...p, confirm: e.target.value }))} required /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,.5)', cursor: 'pointer' }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} /> I agree to the Terms of Service
        </label>
        <button type="submit" disabled={loading} style={{ height: 48, background: loading ? 'rgba(14,165,233,.4)' : `linear-gradient(135deg,${BLUE},${BLUE_DARK})`, color: '#fff', border: 'none', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Creating account...' : 'Create Account →'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 16 }}>
        Already have an account? <Link to="/marketplace/login" style={{ color: BLUE, fontWeight: 700, textDecoration: 'none' }}>Login here</Link>
      </p>
    </>
  );

  const BgSlideshow = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      {SLIDES.map((s, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out', willChange: 'opacity' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,10,30,.72)' }} />
    </div>
  );

  const TabBar = () => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,.07)', borderRadius: 11, padding: 3, marginBottom: 22, border: '1px solid rgba(255,255,255,.08)' }}>
      {(['login', 'register'] as const).map(m => (
        <Link key={m} to={`/marketplace/${m}`} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none', background: (m === 'login') === isLogin ? `linear-gradient(135deg,${BLUE},${BLUE_DARK})` : 'transparent', color: (m === 'login') === isLogin ? '#fff' : 'rgba(255,255,255,.45)' }}>
          {m === 'login' ? 'Sign In' : 'Register'}
        </Link>
      ))}
    </div>
  );

  if (isMobile) return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BgSlideshow />
      <div style={{ position: 'relative', zIndex: 2, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {Logo()}
        <Link to="/" style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', textDecoration: 'none', padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)' }}>← Home</Link>
      </div>
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'rgba(5,15,35,.6)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,.13)', borderRadius: 22, padding: '32px 24px', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ background: '#fff', borderRadius: 10, padding: '5px 8px' }}>
              <img src="/agripulse-logo.png" alt="AgriPulse" style={{ height: 30, width: 'auto', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
          <TabBar />
          {FormContent()}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BgSlideshow />
      <div style={{ position: 'relative', zIndex: 2, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {Logo()}
        <Link to="/" style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', textDecoration: 'none', padding: '7px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)' }}>← Back to Home</Link>
      </div>
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ display: 'flex', maxWidth: 960, width: '100%', minHeight: 580, borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 580 }}>
            {SLIDES.map((s, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out', willChange: 'opacity' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,10,40,.9) 0%, rgba(0,10,40,.2) 100%)' }} />
            <div style={{ position: 'absolute', bottom: 32, left: 20, right: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 18, padding: '22px 24px' }}>
              <ShieldCheck size={22} color={BLUE} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 12 }}>{SLIDES[slide].caption}</div>
              {[{ icon: <ShieldCheck size={12} />, text: 'Verified Sellers' }, { icon: <FileText size={12} />, text: 'Digital Animal Passport' }, { icon: <Lock size={12} />, text: 'Secure Transactions' }].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.7)', marginBottom: 5 }}>{icon} {text}</div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, background: 'rgba(5,15,35,.65)', backdropFilter: 'blur(32px)', borderLeft: '1px solid rgba(255,255,255,.1)', padding: '44px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '5px 8px' }}>
                <img src="/agripulse-logo.png" alt="AgriPulse" style={{ height: 32, width: 'auto', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>
            <TabBar />
            {FormContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

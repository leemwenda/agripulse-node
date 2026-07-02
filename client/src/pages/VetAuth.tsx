import { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, FileText } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const BLUE = '#0d9488';
const BLUE_DARK = '#0f766e';
const SLIDES = [
  { img: '/vet1.jpg', caption: 'Manage cases and health records for client farms.' },
  { img: '/vet2.jpg', caption: 'Coordinate treatments with farmers you serve.' },
];
const COUNTIES = ['Nairobi','Kiambu','Nakuru','Meru','Nyandarua','Laikipia','Trans Nzoia','Uasin Gishu','Kericho','Bomet','Nyeri','Muranga','Kirinyaga','Embu','Machakos','Kajiado','Other'];

export default function VetAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const isLogin = !location.pathname.endsWith('/register');
  const justRegistered = (location.state as any)?.registered;

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', county: '', password: '', confirm: '', kvbNumber: '', specialization: '', experience: '', practiceName: '', operatingCounties: [] as string[] });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [slide, setSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Auto-slide removed — caused re-render on every interval tick which interrupted typing
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const u: any = await login(loginForm.email, loginForm.password);
      if (u?.role !== 'vet' && u?.role !== 'superadmin') {
        setError('This portal is for veterinarians only. Please use the correct login.');
        await api.post('/auth/logout');
        return;
      }
      navigate('/vet-dashboard');
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
      await api.post('/auth/register', { name: regForm.name, email: regForm.email, phone: regForm.phone, county: regForm.county, password: regForm.password, role: 'vet', kvbNumber: regForm.kvbNumber, specialization: regForm.specialization, experience: regForm.experience, practiceName: regForm.practiceName, operatingCounties: regForm.operatingCounties.join(',') });
      navigate('/vet/login', { state: { registered: true } });
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
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>| Veterinary</span>
    </div>
  );

  const FormContent = () => isLogin ? (
    <>
      <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Welcome back!</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginBottom: 24 }}>Sign in to manage your veterinary caseload.</p>
      {justRegistered && !error && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 10, color: '#6ee7b7', fontSize: 13, marginBottom: 16 }}>Registration successful — your account is pending admin approval. You'll be able to log in once approved.</div>}
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
        Don't have an account? <Link to="/vet/register" style={{ color: BLUE, fontWeight: 700, textDecoration: 'none' }}>Sign up here</Link>
      </p>
    </>
  ) : (
    <>
      <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Create your account</h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginBottom: 18 }}>Join AgriPulse as a registered veterinarian.</p>
      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {/* Row 1: Name + Practice Name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>Full Name *</label><input style={inp} placeholder="Dr. Jane Mwangi" value={regForm.name} onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} required /></div>
          <div><label style={lbl}>Practice / Clinic Name</label><input style={inp} placeholder="e.g. Savanna Vet Clinic" value={regForm.practiceName} onChange={e => setRegForm(p => ({ ...p, practiceName: e.target.value }))} /></div>
        </div>
        {/* Row 2: Email + Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>Email *</label><input style={inp} type="email" placeholder="doctor@email.com" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} required /></div>
          <div><label style={lbl}>Phone Number</label><input style={inp} placeholder="07XX XXX XXX" value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} /></div>
        </div>
        {/* Row 3: KVB Number + Years Experience */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={lbl}>KVB License Number</label><input style={inp} placeholder="e.g. KVB/2021/1234" value={regForm.kvbNumber} onChange={e => setRegForm(p => ({ ...p, kvbNumber: e.target.value }))} /></div>
          <div><label style={lbl}>Years of Experience</label>
            <select style={{ ...inp, color: regForm.experience ? '#fff' : 'rgba(255,255,255,.4)' }} value={regForm.experience} onChange={e => setRegForm(p => ({ ...p, experience: e.target.value }))}>
              <option value="">Select</option>
              {['Less than 1 year','1-3 years','3-5 years','5-10 years','10+ years'].map(y => <option key={y} value={y} style={{ background:'#0a2540' }}>{y}</option>)}
            </select>
          </div>
        </div>
        {/* Row 4: Specialization */}
        <div><label style={lbl}>Specialization</label>
          <select style={{ ...inp, color: regForm.specialization ? '#fff' : 'rgba(255,255,255,.4)' }} value={regForm.specialization} onChange={e => setRegForm(p => ({ ...p, specialization: e.target.value }))}>
            <option value="">Select specialization</option>
            {['Large Animals (Cattle, Horses)','Small Animals (Dogs, Cats)','Poultry','Mixed Practice','Wildlife','Aquatic Animals'].map(s => <option key={s} value={s} style={{ background:'#0a2540' }}>{s}</option>)}
          </select>
        </div>
        {/* Row 5: Counties of operation */}
        <div>
          <label style={lbl}>Counties of Operation <span style={{ color:'rgba(255,255,255,.3)', fontSize:10, textTransform:'none' }}>(select all that apply)</span></label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'10px 12px', background:'rgba(255,255,255,0.06)', borderRadius:10, border:'1.5px solid rgba(255,255,255,.15)', maxHeight:110, overflowY:'auto' }}>
            {COUNTIES.map(county => {
              const checked = regForm.operatingCounties.includes(county);
              return (
                <label key={county} onClick={() => setRegForm(p => ({ ...p, operatingCounties: checked ? p.operatingCounties.filter(c => c !== county) : [...p.operatingCounties, county] }))}
                  style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color: checked ? '#fff' : 'rgba(255,255,255,.5)', cursor:'pointer', padding:'3px 10px', borderRadius:20, background: checked ? BLUE : 'rgba(255,255,255,.07)', border:`1px solid ${checked ? BLUE : 'rgba(255,255,255,.1)'}`, transition:'all .15s', userSelect:'none' }}>
                  {county}
                </label>
              );
            })}
          </div>
        </div>
        {/* Row 6: Base County */}
        <div><label style={lbl}>Primary Base County *</label>
          <select style={{ ...inp, color: regForm.county ? '#fff' : 'rgba(255,255,255,.4)' }} value={regForm.county} onChange={e => setRegForm(p => ({ ...p, county: e.target.value }))} required>
            <option value="">Select your main county</option>
            {COUNTIES.map(c => <option key={c} value={c} style={{ background:'#0a2540' }}>{c}</option>)}
          </select>
        </div>
        {/* Row 7: Password */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={lbl}>Password *</label>
            <div style={{ position:'relative' }}>
              <input style={{ ...inp, paddingRight:44 }} type={showPw ? 'text' : 'password'} placeholder="Create a password" value={regForm.password} onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.5)' }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <div><label style={lbl}>Confirm Password *</label><input style={inp} type="password" placeholder="Repeat password" value={regForm.confirm} onChange={e => setRegForm(p => ({ ...p, confirm: e.target.value }))} required /></div>
        </div>
        {/* Terms */}
        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(255,255,255,.5)', cursor:'pointer' }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: BLUE }} />
          I agree to the <span style={{ color: BLUE, fontWeight:600 }}>Terms of Service</span> and confirm I am a licensed veterinarian
        </label>
        {/* Info note */}
        <div style={{ padding:'10px 14px', background:'rgba(13,148,136,.1)', border:'1px solid rgba(13,148,136,.25)', borderRadius:10, fontSize:12, color:'rgba(255,255,255,.6)', lineHeight:1.5 }}>
          📋 Your account will be reviewed by an admin before activation. You'll receive an email once approved.
        </div>
        <button type="submit" disabled={loading || !agreed} style={{ height:50, background: loading||!agreed ? 'rgba(13,148,136,.3)' : `linear-gradient(135deg,${BLUE},${BLUE_DARK})`, color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:15, cursor: loading||!agreed ? 'not-allowed':'pointer', boxShadow:'0 4px 20px rgba(13,148,136,.3)' }}>
          {loading ? 'Submitting application...' : 'Submit Vet Application →'}
        </button>
      </form>
      <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 16 }}>
        Already have an account? <Link to="/vet/login" style={{ color: BLUE, fontWeight: 700, textDecoration: 'none' }}>Login here</Link>
      </p>
    </>
  );

  const BgSlideshow = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      {SLIDES.map((s, i) => (
        <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out' }} />
      ))}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,10,30,.72)' }} />
    </div>
  );

  const TabBar = () => (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,.07)', borderRadius: 11, padding: 3, marginBottom: 22, border: '1px solid rgba(255,255,255,.08)' }}>
      {(['login', 'register'] as const).map(m => (
        <Link key={m} to={`/vet/${m}`} style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none', background: (m === 'login') === isLogin ? `linear-gradient(135deg,${BLUE},${BLUE_DARK})` : 'transparent', color: (m === 'login') === isLogin ? '#fff' : 'rgba(255,255,255,.45)' }}>
          {m === 'login' ? 'Sign In' : 'Register'}
        </Link>
      ))}
    </div>
  );

  if (isMobile) return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BgSlideshow />
      <div style={{ position: 'relative', zIndex: 2, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo />
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
          <FormContent />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BgSlideshow />
      <div style={{ position: 'relative', zIndex: 2, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Logo />
        <Link to="/" style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', textDecoration: 'none', padding: '7px 16px', borderRadius: 20, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.07)' }}>← Back to Home</Link>
      </div>
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ display: 'flex', maxWidth: 960, width: '100%', minHeight: 580, borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 580 }}>
            {SLIDES.map((s, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url(${s.img})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: i === slide ? 1 : 0, transition: 'opacity 1.5s ease-in-out' }} />
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
            <FormContent />
          </div>
        </div>
      </div>
    </div>
  );
}

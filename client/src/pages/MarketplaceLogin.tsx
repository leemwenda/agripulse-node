import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, FileText, Leaf } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&q=80',
  'https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80',
];

export default function MarketplaceLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bgImg = BG_IMAGES[0];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      navigate('/marketplace');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid email or password.');
    } finally { setLoading(false); }
  }

  const inp = { width:'100%', height:48, padding:'0 14px', border:'1px solid #d1d5db', borderRadius:10, fontSize:14, color:'#111827', outline:'none', boxSizing:'border-box' as const, background:'#fff' };

  return (
    <div style={{ minHeight:'100vh', background:'#f0fdf4', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderBottom:'1px solid #e5e7eb' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#15803d,#16a34a)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Leaf size={18} color="#fff"/>
          </div>
          <span style={{ fontWeight:800, fontSize:18, color:'#15803d' }}>AgriPulse</span>
          <span style={{ color:'#9ca3af', fontSize:14 }}>| Marketplace</span>
        </div>
        <Link to="/" style={{ fontSize:14, color:'#374151', textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>← Back to Home</Link>
      </div>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 16px' }}>
        <div style={{ display:'flex', gap:0, background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.12)', maxWidth:860, width:'100%' }}>
          {/* Form */}
          <div style={{ flex:1, padding:'48px 40px', minWidth:0 }}>
            <h1 style={{ fontSize:28, fontWeight:800, color:'#111827', marginBottom:6 }}>Welcome back!</h1>
            <p style={{ color:'#6b7280', fontSize:14, marginBottom:32 }}>Login to your Marketplace account to connect with sellers and buy livestock.</p>

            {error && <div style={{ padding:'12px 14px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, color:'#dc2626', fontSize:13, marginBottom:16 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Email or Phone Number</label>
                <input style={inp} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="Enter email or phone number" required/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input style={{ ...inp, paddingRight:44 }} type={showPw?'text':'password'} value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} placeholder="Enter your password" required/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ca3af' }}>
                    {showPw?<EyeOff size={18}/>:<Eye size={18}/>}
                  </button>
                </div>
                <div style={{ textAlign:'right', marginTop:6 }}>
                  <Link to="/forgot-password" style={{ fontSize:13, color:'#15803d', textDecoration:'none' }}>Forgot password?</Link>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ height:48, background:'linear-gradient(135deg,#15803d,#16a34a)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading?'Logging in...':'Login'} {!loading && <span>→</span>}
              </button>
            </form>

            <div style={{ textAlign:'center', margin:'20px 0', color:'#9ca3af', fontSize:13 }}>OR</div>

            <p style={{ textAlign:'center', fontSize:13, color:'#6b7280' }}>
              Don't have an account? <Link to="/marketplace/signup" style={{ color:'#15803d', fontWeight:600, textDecoration:'none' }}>Sign up here</Link>
            </p>
          </div>

          {/* Image panel */}
          <div style={{ width:340, flexShrink:0, position:'relative', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            <img src={bgImg} alt="livestock" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}/>
            <div style={{ position:'relative', padding:'32px 28px', background:'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%)' }}>
              <p style={{ color:'#fff', fontWeight:800, fontSize:22, lineHeight:1.3, marginBottom:16 }}>Safe. Transparent.<br/>Trusted Livestock<br/>Marketplace.</p>
              <p style={{ color:'rgba(255,255,255,.8)', fontSize:13, marginBottom:20 }}>Buy or sell healthy, verified animals with confidence.</p>
              {[['ShieldCheck','Verified Sellers'],['Tag','Digital Animal Passport'],['FileText','Secure Transactions']].map(([,label]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ShieldCheck size={13} color="#4ade80"/>
                  </div>
                  <span style={{ color:'#fff', fontSize:13 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer trust badges */}
      <div style={{ padding:'20px 24px', borderTop:'1px solid #e5e7eb', background:'#fff', display:'flex', justifyContent:'center', gap:48 }}>
        {([{Icon:Lock,title:'Trusted',sub:'Verified sellers and animals'},{Icon:ShieldCheck,title:'Secure',sub:'Safe messaging and payments'},{Icon:FileText,title:'Transparent',sub:'Complete animal history and records'}]).map(({Icon,title,sub})=>(
          <div key={title} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Icon size={20} color="#15803d"/>
            <div><div style={{ fontWeight:700, fontSize:13, color:'#111827' }}>{title}</div><div style={{ fontSize:12, color:'#6b7280' }}>{sub}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

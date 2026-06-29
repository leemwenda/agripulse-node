import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, CheckCircle2, Beef, LayoutDashboard } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { PageLoader } from '../components/ui';

const API_ORIGIN = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

function resolvePhoto(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url}`;
}

export default function CreateListing() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ animalId: '', title: '', askingPrice: '', negotiable: true, description: '', location: '' });

  const counties = ['Nairobi','Kiambu','Nakuru','Meru','Nyandarua','Laikipia','Trans Nzoia','Uasin Gishu','Kericho','Bomet','Nyeri','Muranga','Kirinyaga','Embu','Machakos','Kajiado','Other'];

  const D = isDark
    ? { bg:'#0d1117', card:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.08)', text:'#e2ede6', text2:'#8aab94', text3:'rgba(255,255,255,.3)' }
    : { bg:'#f9fafb', card:'#fff', border:'#e5e7eb', text:'#111827', text2:'#374151', text3:'#9ca3af' };

  useEffect(() => {
    document.title = 'List Animal — AgriPulse';
    api.get('/animals?limit=100').then(r => {
      const active = (r.data.animals || []).filter((a: any) => a.status === 'active');
      setAnimals(active);
    }).finally(() => setLoading(false));
  }, []);

  const selectedAnimal = animals.find(a => a.id === parseInt(form.animalId));

  function pickAnimal(a: any) {
    setForm(p => ({ ...p, animalId: String(a.id), title: p.title || `${a.breed} ${a.category === 'cow' ? 'Cow' : a.category} — ${a.name}` }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/market', {
        animalId: parseInt(form.animalId),
        title: form.title,
        askingPrice: parseFloat(form.askingPrice),
        negotiable: form.negotiable,
        description: form.description,
        county: form.location,
      });
      setSuccess('Your animal is now listed on the marketplace!');
    } catch (err: any) { setError(err?.response?.data?.error || 'Failed to create listing.'); }
    finally { setSaving(false); }
  }

  const inp: any = { width:'100%', height:44, padding:'0 13px', background:isDark?'rgba(255,255,255,.05)':'#f8fafc', border:`1px solid ${D.border}`, borderRadius:10, fontSize:14, color:D.text, outline:'none', boxSizing:'border-box' };
  const lbl: any = { display:'block', fontSize:'0.7rem', fontWeight:700, color:D.text2, marginBottom:5, textTransform:'uppercase', letterSpacing:'.5px' };

  if (loading) return <PageLoader />;

  return (
    <div style={{ minHeight:'100vh', background:D.bg }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'12px 16px', borderBottom:`1px solid ${D.border}`, background:D.card, position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>navigate('/marketplace')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:9, border:`1px solid ${D.border}`, background:'transparent', color:D.text2, cursor:'pointer', fontSize:14 }}>
            <ArrowLeft size={14}/> Back
          </button>
          <div>
            <div style={{ fontWeight:700, color:D.text }}>List Animal for Sale</div>
            <div style={{ fontSize:12, color:D.text3 }}>Your animal will be visible to buyers on the marketplace</div>
          </div>
        </div>
        <button onClick={()=>navigate('/dashboard')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:9, border:`1px solid ${D.border}`, background:'transparent', color:D.text2, cursor:'pointer', fontSize:13, fontWeight:600 }}>
          <LayoutDashboard size={14}/> Dashboard
        </button>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px 48px' }}>
        {success ? (
          <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'40px 32px', textAlign:'center' }}>
            <CheckCircle2 size={56} color="#15803d" style={{ margin:'0 auto 16px' }}/>
            <h2 style={{ color:D.text, marginBottom:8 }}>Listed Successfully!</h2>
            <p style={{ color:D.text2, lineHeight:1.7, marginBottom:24 }}>{success}</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={()=>navigate('/marketplace')} style={{ padding:'11px 24px', background:'#15803d', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>View Marketplace</button>
              <button onClick={()=>navigate('/dashboard')} style={{ padding:'11px 24px', background:'transparent', border:`1px solid ${D.border}`, color:D.text2, borderRadius:10, fontWeight:700, cursor:'pointer' }}>Back to Dashboard</button>
              <button onClick={()=>{ setSuccess(''); setForm({ animalId:'', title:'', askingPrice:'', negotiable:true, description:'', location:'' }); }} style={{ padding:'11px 24px', background:'transparent', border:`1px solid ${D.border}`, color:D.text2, borderRadius:10, fontWeight:700, cursor:'pointer' }}>List Another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {error && <div style={{ padding:'12px 14px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, color:'#ef4444', fontSize:13 }}>{error}</div>}

            <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'20px' }}>
              <div style={{ fontSize:14, fontWeight:700, color:D.text, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}><Tag size={15}/> Select Animal</div>
              {animals.length === 0 ? (
                <div style={{ padding:'20px', textAlign:'center', color:D.text3, fontSize:14 }}>No active animals available to list. Add animals first from the Animals page.</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }}>
                  {animals.map(a => {
                    const photo = resolvePhoto(a.photoUrl);
                    const isSelected = form.animalId === String(a.id);
                    return (
                      <label key={a.id} style={{
                        display:'flex', flexDirection:'column', borderRadius:14, overflow:'hidden', cursor:'pointer',
                        border:`2px solid ${isSelected ? '#15803d' : D.border}`,
                        background: isSelected ? (isDark ? 'rgba(21,128,61,.1)' : 'rgba(21,128,61,.05)') : D.card,
                        transition:'all .15s', position:'relative',
                      }}>
                        <input type="radio" name="animal" value={a.id} checked={isSelected} onChange={()=>pickAnimal(a)} style={{ display:'none' }}/>
                        <div style={{ width:'100%', height:110, background:isDark?'#1c2128':'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                          {photo
                            ? <img src={photo} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                            : <span style={{ fontSize:36 }}>🐄</span>}
                        </div>
                        <div style={{ padding:'10px 12px', position:'relative' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:D.text }}>{a.name}</div>
                          <div style={{ fontSize:11.5, color:D.text3 }}>{a.breed} · {a.category} · {a.tagNumber}</div>
                          {isSelected && <CheckCircle2 size={18} color="#15803d" style={{ position:'absolute', top:10, right:12 }}/>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedAnimal && (
              <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ fontSize:14, fontWeight:700, color:D.text }}>Listing Details</div>
                <div>
                  <label style={lbl}>Listing Title *</label>
                  <input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Healthy Jersey Cow — Zara" required/>
                </div>
                <div>
                  <label style={lbl}>Asking Price (KSh) *</label>
                  <input style={inp} type="number" value={form.askingPrice} onChange={e=>setForm(p=>({...p,askingPrice:e.target.value}))} placeholder="e.g. 150000" required min={1}/>
                </div>
                <div>
                  <label style={lbl}>Location (County) *</label>
                  <select style={{ ...inp, color: form.location?D.text:'#9ca3af' }} value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} required>
                    <option value="">Select county</option>
                    {counties.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Description</label>
                  <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={4} placeholder="Describe the animal — health status, feeding, temperament, reason for selling..." style={{ width:'100%', padding:'10px 13px', borderRadius:10, border:`1px solid ${D.border}`, background:isDark?'rgba(255,255,255,.05)':'#f8fafc', color:D.text, fontSize:13, outline:'none', resize:'vertical', boxSizing:'border-box' as const }}/>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:D.text2, cursor:'pointer' }}>
                  <input type="checkbox" checked={form.negotiable} onChange={e=>setForm(p=>({...p,negotiable:e.target.checked}))} />
                  Open to Negotiation — buyers can make offers below your asking price
                </label>
                <div style={{ padding:'12px 14px', background:isDark?'rgba(21,128,61,.08)':'rgba(21,128,61,.05)', borderRadius:10, fontSize:13, color:'#15803d' }}>
                  The animal's passport, health records, and verified history will automatically be shown to buyers.
                </div>
                <button type="submit" disabled={saving || !form.animalId || !form.title || !form.askingPrice || !form.location} style={{ height:46, background:saving||!form.animalId?'#86efac':'linear-gradient(135deg,#15803d,#16a34a)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', boxShadow:'0 4px 16px rgba(21,128,61,.25)' }}>
                  {saving?'Listing...':'List Animal on Marketplace'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

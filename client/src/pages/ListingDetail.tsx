import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Eye, Heart, MessageSquare, TrendingDown, Share2, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui';

function formatKes(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : '—'; }
function formatAge(dob: string) {
  const m = Math.floor((Date.now() - new Date(dob).getTime()) / (86400000 * 30.44));
  return m >= 12 ? `${Math.floor(m/12)}y ${m%12}m` : `${m} months`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [offerMode, setOfferMode] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquiryMode, setInquiryMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [imgIdx, setImgIdx] = useState(0);

  const D = isDark
    ? { bg:'#0d1117', card:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.08)', text:'#e2ede6', text2:'#8aab94', text3:'rgba(255,255,255,.3)' }
    : { bg:'#f9fafb', card:'#fff', border:'#e5e7eb', text:'#111827', text2:'#374151', text3:'#9ca3af' };

  useEffect(() => {
    api.get(`/marketplace/listings/${id}`)
      .then(r => setListing(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    try {
      if (saved) { await api.delete(`/saved/${id}`); setSaved(false); }
      else { await api.post('/saved', { listingId: parseInt(id as string) }); setSaved(true); }
    } catch {}
  }

  async function submitOffer(e: any) {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      await api.post('/offers', { listingId: parseInt(id as string), offerPrice: parseFloat(offerAmount), message: offerMsg });
      setSuccess('Offer sent! The seller will be notified.'); setOfferMode(false); setOfferAmount(''); setOfferMsg('');
    } catch (err: any) { setError(err?.response?.data?.error || 'Failed to send offer.'); }
    finally { setSubmitting(false); }
  }

  async function submitInquiry(e: any) {
    e.preventDefault(); setError(''); setSubmitting(true);
    try {
      await api.post(`/marketplace/listings/${id}/inquiries`, { message: inquiryMsg });
      setSuccess('Message sent to seller!'); setInquiryMode(false); setInquiryMsg('');
    } catch (err: any) { setError(err?.response?.data?.error || 'Failed to send message.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <PageLoader />;
  if (!listing) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ fontSize:40, marginBottom:16 }}>Not found</div>
      <button onClick={()=>navigate('/marketplace')} style={{ padding:'10px 24px', background:'#0e7490', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700 }}>Back to Marketplace</button>
    </div>
  );

  const animal = listing.animal;
  const photos = animal?.photos || [];
  const isMine = listing.sellerId === user?.id;
  const statusColor: Record<string,string> = { active:'#10b981', reserved:'#f59e0b', sold:'#6b7280', cancelled:'#ef4444' };

  return (
    <div style={{ minHeight:'100vh', background:D.bg }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:`1px solid ${D.border}`, background:D.card, position:'sticky', top:0, zIndex:10 }}>
        <button onClick={()=>navigate('/marketplace')} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:9, border:`1px solid ${D.border}`, background:'transparent', color:D.text2, cursor:'pointer', fontSize:14 }}>
          <ArrowLeft size={14}/> Back
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, color:D.text }}>{animal?.name}</div>
          <div style={{ fontSize:12, color:D.text3 }}>{animal?.breed} · {animal?.category}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {user && !isMine && (
            <button onClick={handleSave} style={{ width:36, height:36, borderRadius:9, border:`1px solid ${D.border}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Heart size={15} color={saved?'#ef4444':D.text3} fill={saved?'#ef4444':'none'}/>
            </button>
          )}
          <button onClick={()=>navigator.clipboard.writeText(window.location.href).then(()=>alert('Link copied!'))} style={{ width:36, height:36, borderRadius:9, border:`1px solid ${D.border}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Share2 size={15} color={D.text3}/>
          </button>
        </div>
      </div>

      <div style={{ maxWidth:760, margin:'0 auto', padding:'20px 16px 48px' }}>
        {success && <div style={{ padding:'13px 16px', background:isDark?'rgba(16,185,129,.1)':'#f0fdf4', border:'1px solid rgba(16,185,129,.3)', borderRadius:11, color:'#10b981', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}><CheckCircle2 size={15}/> {success}</div>}
        {error && <div style={{ padding:'13px 16px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:11, color:'#ef4444', marginBottom:14 }}>{error}</div>}

        {/* Photo */}
        <div style={{ borderRadius:16, overflow:'hidden', marginBottom:16, background:D.card, border:`1px solid ${D.border}` }}>
          <div style={{ height:260, background:isDark?'#1c2128':'#f1f5f9', position:'relative' }}>
            {photos.length > 0
              ? <img src={photos[imgIdx]?.url} alt={animal?.name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:64 }}>🐄</div>
            }
            <span style={{ position:'absolute', top:10, right:10, padding:'3px 10px', borderRadius:20, background:statusColor[listing.status]+'22', border:`1px solid ${statusColor[listing.status]}44`, color:statusColor[listing.status], fontSize:11, fontWeight:700, backdropFilter:'blur(8px)' }}>
              {listing.status?.toUpperCase()}
            </span>
          </div>
          {photos.length > 1 && (
            <div style={{ display:'flex', gap:8, padding:10 }}>
              {photos.map((p: any, i: number) => (
                <div key={i} onClick={()=>setImgIdx(i)} style={{ width:52, height:52, borderRadius:9, overflow:'hidden', border:`2px solid ${i===imgIdx?'#0e7490':'transparent'}`, cursor:'pointer', flexShrink:0 }}>
                  <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price + actions */}
        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'20px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:26, fontWeight:900, color:isDark?'#22d3ee':'#0e7490' }}>{formatKes(listing.askingPrice)}</div>
              <div style={{ fontSize:13, color:D.text3, display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                <MapPin size={12}/> {listing.location || 'Location not specified'}
                <span>·</span><Eye size={12}/> {listing.views || 0} views
              </div>
            </div>
            {animal?.agripulseId && (
              <button onClick={()=>navigate(`/animal/${animal.agripulseId}`)} style={{ padding:'7px 13px', border:`1px solid ${D.border}`, borderRadius:9, background:'transparent', color:D.text2, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                View Passport
              </button>
            )}
          </div>

          {user && !isMine && listing.status === 'active' && (
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={()=>{ setOfferMode(!offerMode); setInquiryMode(false); }} style={{ flex:1, minWidth:130, height:42, background:'linear-gradient(135deg,#0e7490,#0891b2)', color:'#fff', border:'none', borderRadius:11, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <TrendingDown size={15}/> Make Offer
              </button>
              <button onClick={()=>{ setInquiryMode(!inquiryMode); setOfferMode(false); }} style={{ flex:1, minWidth:130, height:42, background:isDark?'rgba(255,255,255,.06)':'#f8fafc', border:`1px solid ${D.border}`, borderRadius:11, fontSize:14, fontWeight:600, cursor:'pointer', color:D.text2, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <MessageSquare size={15}/> Ask Seller
              </button>
            </div>
          )}
          {isMine && <div style={{ fontSize:13, color:D.text3, textAlign:'center', paddingTop:8 }}>This is your listing</div>}
          {listing.status === 'sold' && <div style={{ padding:'10px 14px', background:'rgba(107,114,128,.1)', border:'1px solid rgba(107,114,128,.3)', borderRadius:9, color:'#6b7280', fontSize:13, textAlign:'center', marginTop:8 }}>This animal has been sold</div>}

          {offerMode && (
            <form onSubmit={submitOffer} style={{ marginTop:14, padding:'14px', background:isDark?'rgba(14,116,144,.08)':'rgba(14,116,144,.05)', borderRadius:11, border:'1px solid rgba(14,116,144,.2)' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0e7490', marginBottom:10 }}>Make an Offer</div>
              <input type="number" value={offerAmount} onChange={e=>setOfferAmount(e.target.value)} placeholder="Your offer in KSh" required min={1} style={{ width:'100%', height:40, padding:'0 12px', borderRadius:9, border:`1px solid ${D.border}`, background:D.card, color:D.text, fontSize:14, outline:'none', marginBottom:8, boxSizing:'border-box' as const }}/>
              <textarea value={offerMsg} onChange={e=>setOfferMsg(e.target.value)} placeholder="Optional message to seller..." rows={2} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${D.border}`, background:D.card, color:D.text, fontSize:13, outline:'none', resize:'none', marginBottom:10, boxSizing:'border-box' as const }}/>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" disabled={submitting} style={{ flex:1, height:38, background:'#0e7490', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>{submitting?'Sending...':'Send Offer'}</button>
                <button type="button" onClick={()=>setOfferMode(false)} style={{ height:38, padding:'0 14px', background:'transparent', border:`1px solid ${D.border}`, borderRadius:9, color:D.text2, cursor:'pointer' }}>Cancel</button>
              </div>
            </form>
          )}
          {inquiryMode && (
            <form onSubmit={submitInquiry} style={{ marginTop:14, padding:'14px', background:isDark?'rgba(255,255,255,.04)':'#f8fafc', borderRadius:11, border:`1px solid ${D.border}` }}>
              <div style={{ fontSize:14, fontWeight:700, color:D.text, marginBottom:10 }}>Ask the Seller</div>
              <textarea value={inquiryMsg} onChange={e=>setInquiryMsg(e.target.value)} placeholder="Ask about health records, transport, viewing..." rows={3} required style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${D.border}`, background:D.card, color:D.text, fontSize:13, outline:'none', resize:'none', marginBottom:10, boxSizing:'border-box' as const }}/>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" disabled={submitting} style={{ flex:1, height:38, background:isDark?'rgba(255,255,255,.1)':'#111827', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>{submitting?'Sending...':'Send Message'}</button>
                <button type="button" onClick={()=>setInquiryMode(false)} style={{ height:38, padding:'0 14px', background:'transparent', border:`1px solid ${D.border}`, borderRadius:9, color:D.text2, cursor:'pointer' }}>Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* Animal details */}
        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'20px', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:700, color:D.text, marginBottom:14 }}>Animal Details</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
            {[['Name',animal?.name],['Breed',animal?.breed],['Gender',animal?.gender],['Category',animal?.category],['Age',animal?.dateOfBirth?formatAge(animal.dateOfBirth):'—'],['Color',animal?.color||'—'],['Tag No.',animal?.tagNumber]].map(([label,value])=>(
              <div key={label} style={{ background:isDark?'rgba(255,255,255,.03)':'#f8fafc', borderRadius:9, padding:'10px 12px', border:`1px solid ${D.border}` }}>
                <div style={{ fontSize:10, fontWeight:700, color:D.text3, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:D.text, textTransform:'capitalize' }}>{value||'—'}</div>
              </div>
            ))}
          </div>
          {listing.description && (
            <div style={{ marginTop:14, padding:'12px 14px', background:isDark?'rgba(255,255,255,.03)':'#f8fafc', borderRadius:9, border:`1px solid ${D.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:D.text3, textTransform:'uppercase', marginBottom:5 }}>Description</div>
              <p style={{ fontSize:13, color:D.text2, lineHeight:1.7, margin:0 }}>{listing.description}</p>
            </div>
          )}
        </div>

        {/* Seller */}
        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'20px' }}>
          <div style={{ fontSize:14, fontWeight:700, color:D.text, marginBottom:12 }}>Seller</div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:11, background:'linear-gradient(135deg,#15803d,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:16 }}>
              {listing.seller?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:D.text }}>{listing.seller?.name}</div>
              <div style={{ fontSize:12, color:D.text3, display:'flex', alignItems:'center', gap:5 }}><CheckCircle2 size={12} color="#10b981"/> Verified Farmer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

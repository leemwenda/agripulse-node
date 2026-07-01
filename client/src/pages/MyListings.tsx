import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Beef, MapPin, Tag, TrendingDown, CheckCircle2, XCircle, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

function fmt(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : '—'; }
const STATUS_COLOR: Record<string, string> = { active: '#10b981', reserved: '#f59e0b', sold: '#6b7280', cancelled: '#ef4444' };

export default function MyListings() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);

  const bg     = isDark ? '#0d1117' : '#f9fafb';
  const card   = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#374151';
  const text3  = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';

  function load() {
    setLoading(true);
    api.get('/market/my-listings')
      .then(r => setListings(r.data.listings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleOffer(offerId: number, action: 'accept' | 'reject') {
    try {
      await api.patch(`/market-offers/${offerId}`, { action });
      setMsg(action === 'accept' ? 'Offer accepted! Agreement created.' : 'Offer rejected.');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed.'); }
  }

  async function deleteListing(id: number) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/market/${id}`);
      setMsg('Listing deleted.');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed to delete.'); }
    finally { setDeleting(null); }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0, flex: 1 }}>My Listings</h1>
          <button onClick={() => navigate('/marketplace/create')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            <Plus size={15} /> New Listing
          </button>
        </div>

        {msg && (
          <div style={{ padding: '12px 16px', background: isDark ? 'rgba(16,185,129,.1)' : '#f0fdf4', border: '1px solid rgba(16,185,129,.3)', borderRadius: 10, color: '#10b981', marginBottom: 16, fontSize: 14 }}>
            {msg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: text3 }}>Loading…</div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, border: `1px solid ${border}`, borderRadius: 16 }}>
            <Beef size={40} color={text3} style={{ margin: '0 auto 14px' }} />
            <p style={{ color: text, fontWeight: 700, marginBottom: 6 }}>No listings yet</p>
            <button onClick={() => navigate('/marketplace/create')}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
              Create First Listing
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {listings.map((l: any) => {
              const photo = l.animal?.photos?.[0]?.url;
              const pending = l.offers || [];
              return (
                <div key={l.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 120, minHeight: 100, background: isDark ? '#1c2128' : '#f1f5f9', flexShrink: 0 }}>
                      {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Beef size={28} color={text3} style={{ margin: 'auto', display: 'block', marginTop: 36 }} />}
                    </div>
                    <div style={{ flex: 1, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: text }}>{l.animal?.name}</div>
                          <div style={{ fontSize: 12, color: text2 }}>{l.animal?.breed} · {l.animal?.category}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ padding: '2px 10px', borderRadius: 20, background: (STATUS_COLOR[l.status] || '#6b7280') + '22', color: STATUS_COLOR[l.status] || '#6b7280', fontSize: 11, fontWeight: 700, border: `1px solid ${(STATUS_COLOR[l.status] || '#6b7280')}44` }}>
                            {l.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 17, fontWeight: 900, color: isDark ? '#22d3ee' : '#0e7490' }}>{fmt(l.askingPrice)}</span>
                        {l.county && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: text3 }}><MapPin size={12} />{l.county}</span>}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: text3 }}><Tag size={12} />{l.viewCount || 0} views</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/marketplace/listing/${l.id}`)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer' }}>
                          View
                        </button>
                        <button onClick={() => navigate('/marketplace/messages')}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer' }}>
                          Messages
                        </button>
                        <button onClick={() => navigate(`/marketplace/edit/${l.id}`)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => deleteListing(l.id)} disabled={deleting === l.id}
                          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: isDark ? 'rgba(239,68,68,.15)' : '#fee2e2', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: deleting === l.id ? .5 : 1 }}>
                          <Trash2 size={12} /> {deleting === l.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {pending.length > 0 && (
                    <div style={{ borderTop: `1px solid ${border}`, padding: '12px 16px', background: isDark ? 'rgba(255,255,255,.02)' : '#fafafa' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: text3, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                        {pending.length} Pending Offer{pending.length !== 1 ? 's' : ''}
                      </div>
                      {pending.map((offer: any) => (
                        <div key={offer.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${border}`, flexWrap: 'wrap' }}>
                          <TrendingDown size={14} color="#0e7490" />
                          <span style={{ fontWeight: 700, color: isDark ? '#22d3ee' : '#0e7490', fontSize: 15 }}>{fmt(offer.amount)}</span>
                          <span style={{ fontSize: 13, color: text2 }}>from {offer.buyer?.name}</span>
                          {offer.note && <span style={{ fontSize: 12, color: text3, fontStyle: 'italic' }}>"{offer.note}"</span>}
                          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                            <button onClick={() => handleOffer(offer.id, 'accept')}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              <CheckCircle2 size={12} /> Accept
                            </button>
                            <button onClick={() => handleOffer(offer.id, 'reject')}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7, border: 'none', background: isDark ? 'rgba(239,68,68,.2)' : '#fee2e2', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

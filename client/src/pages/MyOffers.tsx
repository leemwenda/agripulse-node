import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingDown, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

function fmt(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : '—'; }

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b' },
  accepted:  { label: 'Accepted',  color: '#10b981' },
  rejected:  { label: 'Rejected',  color: '#ef4444' },
  withdrawn: { label: 'Withdrawn', color: '#6b7280' },
  countered: { label: 'Countered', color: '#8b5cf6' },
};

export default function MyOffers() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [counterOpen, setCounterOpen] = useState<number | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bg     = isDark ? '#0d1117' : '#f9fafb';
  const card   = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#374151';
  const text3  = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';

  function load() {
    setLoading(true);
    api.get('/market-offers/my')
      .then(r => setOffers(r.data.offers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function withdraw(id: number) {
    try { await api.delete(`/market-offers/${id}`); setMsg('Offer withdrawn.'); load(); }
    catch (err: any) { setMsg(err?.response?.data?.error || 'Failed.'); }
  }

  async function submitCounter(offerId: number) {
    if (!counterAmount) return;
    setSubmitting(true);
    try {
      await api.patch(`/market-offers/${offerId}`, { action: 'counter', counterAmount: parseFloat(counterAmount), note: counterNote });
      setMsg('Counter offer sent.'); setCounterOpen(null); setCounterAmount(''); setCounterNote(''); load();
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0 }}>My Offers & Orders</h1>
        </div>

        {msg && <div style={{ padding: '12px 16px', background: isDark ? 'rgba(16,185,129,.1)' : '#f0fdf4', border: '1px solid rgba(16,185,129,.3)', borderRadius: 10, color: '#10b981', marginBottom: 16, fontSize: 14 }}>{msg}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: text3 }}>Loading…</div>
        ) : offers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, border: `1px solid ${border}`, borderRadius: 16 }}>
            <TrendingDown size={40} color={text3} style={{ margin: '0 auto 14px' }} />
            <p style={{ color: text, fontWeight: 700, marginBottom: 6 }}>No offers yet</p>
            <button onClick={() => navigate('/marketplace')}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#0e7490', color: '#fff', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {offers.map((offer: any) => {
              const s = STATUS[offer.status] || { label: offer.status, color: '#6b7280' };
              const counter = offer.counters?.[0];
              const photo = offer.listing?.photos?.[0]?.url || offer.listing?.animal?.photos?.[0]?.url;
              const isOpen = counterOpen === offer.id;

              return (
                <div key={offer.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 100, background: isDark ? '#1c2128' : '#f1f5f9', flexShrink: 0, minHeight: 90 }}>
                      {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <TrendingDown size={24} color={text3} style={{ margin: 'auto', display: 'block', marginTop: 30 }} />}
                    </div>
                    <div style={{ flex: 1, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: text }}>{offer.listing?.animal?.name}</div>
                          <div style={{ fontSize: 12, color: text2 }}>{offer.listing?.animal?.breed} · Seller: {offer.listing?.seller?.name}</div>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: 20, background: s.color + '22', color: s.color, fontSize: 11, fontWeight: 700, border: `1px solid ${s.color}44`, flexShrink: 0 }}>
                          {s.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: text3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Your Offer</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? '#22d3ee' : '#0e7490' }}>{fmt(offer.amount)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: text3, textTransform: 'uppercase', letterSpacing: '.5px' }}>Asking Price</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: text2 }}>{fmt(offer.listing?.askingPrice)}</div>
                        </div>
                      </div>

                      {counter && (
                        <div style={{ padding: '10px 12px', background: isDark ? 'rgba(139,92,246,.1)' : '#f5f3ff', borderRadius: 9, border: '1px solid rgba(139,92,246,.3)', marginBottom: 10 }}>
                          <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Counter Offer from Seller</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#8b5cf6' }}>{fmt(counter.amount)}</div>
                          {counter.note && <div style={{ fontSize: 12, color: text2, marginTop: 4 }}>{counter.note}</div>}
                        </div>
                      )}

                      {offer.note && <div style={{ fontSize: 12, color: text3, fontStyle: 'italic', marginBottom: 10 }}>"{offer.note}"</div>}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/marketplace/listing/${offer.listing?.id}`)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer' }}>
                          View Listing
                        </button>
                        <button onClick={() => navigate('/marketplace/messages')}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, fontSize: 12, cursor: 'pointer' }}>
                          Messages
                        </button>
                        {offer.status === 'accepted' && (
                          <button onClick={() => navigate(`/marketplace/agreement/${offer.listing?.id}`)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} /> Sign Agreement
                          </button>
                        )}
                        {offer.status === 'countered' && counter && (
                          <button onClick={() => setCounterOpen(isOpen ? null : offer.id)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <RefreshCw size={12} /> Respond to Counter
                          </button>
                        )}
                        {offer.status === 'pending' && (
                          <button onClick={() => withdraw(offer.id)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: isDark ? 'rgba(239,68,68,.15)' : '#fee2e2', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={12} /> Withdraw
                          </button>
                        )}
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 12, padding: 14, background: isDark ? 'rgba(139,92,246,.08)' : '#f5f3ff', borderRadius: 10, border: '1px solid rgba(139,92,246,.25)' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', marginBottom: 10 }}>Your Counter Offer</div>
                          <input type="number" value={counterAmount} onChange={e => setCounterAmount(e.target.value)}
                            placeholder="Your counter amount in KSh"
                            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,.04)' : '#fff', color: text, fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }}
                          />
                          <input value={counterNote} onChange={e => setCounterNote(e.target.value)}
                            placeholder="Optional note to seller"
                            style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 8, border: `1px solid ${border}`, background: isDark ? 'rgba(255,255,255,.04)' : '#fff', color: text, fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' as const }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => submitCounter(offer.id)} disabled={submitting || !counterAmount}
                              style={{ flex: 1, height: 36, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: submitting ? .6 : 1 }}>
                              {submitting ? 'Sending…' : 'Send Counter'}
                            </button>
                            <button onClick={() => setCounterOpen(null)}
                              style={{ height: 36, padding: '0 14px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 8, color: text2, cursor: 'pointer' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

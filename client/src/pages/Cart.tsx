import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ShoppingCart, Beef, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

function fmt(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : '—'; }

export default function Cart() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { items, removeFromCart, refreshCart } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const bg     = isDark ? '#0d1117' : '#f9fafb';
  const card   = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#374151';
  const text3  = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';

  const total = items.reduce((sum, i) => sum + Number(i.listing?.askingPrice || 0), 0);

  async function handleCheckout() {
    setCheckingOut(true); setError('');
    try {
      const res = await api.post('/cart/checkout');
      setResult(res.data);
      refreshCart();
    } catch (err: any) { setError(err?.response?.data?.error || 'Checkout failed.'); }
    finally { setCheckingOut(false); }
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'center', background: card, border: `1px solid ${border}`, borderRadius: 20, padding: '48px 32px' }}>
          <CheckCircle2 size={52} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, marginBottom: 8 }}>Orders Placed!</h1>
          <p style={{ color: text2, fontSize: 14, marginBottom: 8 }}>{result.message}</p>
          {result.skipped?.length > 0 && <p style={{ color: '#f59e0b', fontSize: 13, marginBottom: 16 }}>{result.skipped.length} item(s) skipped — no longer available.</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => navigate('/marketplace/my-offers')}
              style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Track My Orders
            </button>
            <button onClick={() => navigate('/marketplace')}
              style={{ padding: '10px 22px', borderRadius: 10, border: `1px solid ${border}`, background: 'transparent', color: text2, fontWeight: 600, cursor: 'pointer' }}>
              Continue Browsing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0 }}>My Cart</h1>
          {items.length > 0 && <span style={{ padding: '3px 10px', borderRadius: 20, background: isDark ? 'rgba(255,255,255,.06)' : '#f3f4f6', color: text3, fontSize: 12 }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>}
        </div>

        {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, border: `1px solid ${border}`, borderRadius: 16 }}>
            <ShoppingCart size={40} color={text3} style={{ margin: '0 auto 14px' }} />
            <p style={{ color: text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Your cart is empty</p>
            <p style={{ color: text2, fontSize: 13, marginBottom: 20 }}>Browse the marketplace and add animals you want to buy.</p>
            <button onClick={() => navigate('/marketplace')}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0e7490', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item: any) => {
                const listing = item.listing;
                const photo = listing?.animal?.photos?.[0]?.url;
                return (
                  <div key={item.id} style={{ display: 'flex', background: card, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                    <div style={{ width: 110, height: 110, background: isDark ? '#1c2128' : '#f1f5f9', flexShrink: 0 }}>
                      {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Beef size={28} color={text3} style={{ margin: 'auto', display: 'block', marginTop: 40 }} />}
                    </div>
                    <div style={{ flex: 1, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: text, fontSize: 15 }}>{listing?.animal?.name}</div>
                        <div style={{ fontSize: 12, color: text2, marginTop: 2 }}>{listing?.animal?.breed} · Seller: {listing?.seller?.name}</div>
                        <div style={{ fontSize: 17, fontWeight: 800, color: isDark ? '#22d3ee' : '#0e7490', marginTop: 6 }}>{fmt(listing?.askingPrice)}</div>
                      </div>
                      <button onClick={() => removeFromCart(item.listingId)}
                        style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Trash2 size={15} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '20px', position: 'sticky', top: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 16 }}>Order Summary</h3>
              {items.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: text2 }}>{item.listing?.animal?.name}</span>
                  <span style={{ color: text, fontWeight: 600 }}>{fmt(item.listing?.askingPrice)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: border, margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: text2, fontSize: 14 }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: text }}>{fmt(total)}</span>
              </div>
              <p style={{ fontSize: 11, color: text3, marginBottom: 14, lineHeight: 1.6 }}>
                Checkout sends purchase orders to sellers at asking price. Each seller must confirm before ownership transfers.
              </p>
              <button onClick={handleCheckout} disabled={checkingOut}
                style={{ width: '100%', height: 46, background: 'linear-gradient(135deg,#15803d,#16a34a)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: checkingOut ? .6 : 1 }}>
                {checkingOut ? 'Processing…' : `Checkout (${items.length} item${items.length !== 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

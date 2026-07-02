import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Beef, MapPin } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

function fmt(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : '—'; }

export default function Favorites() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bg     = isDark ? '#0d1117' : '#f9fafb';
  const card   = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#374151';
  const text3  = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';

  function load() {
    setLoading(true);
    api.get('/market-misc/favorites')
      .then(r => setFavorites(r.data.favorites || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function removeFav(id: number) {
    await api.delete(`/market-misc/favorites/${id}`);
    load();
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0 }}>Saved Animals</h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: text3 }}>Loading…</div>
        ) : favorites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, border: `1px solid ${border}`, borderRadius: 16 }}>
            <Heart size={40} color={text3} style={{ margin: '0 auto 14px' }} />
            <p style={{ color: text, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No saved animals</p>
            <p style={{ color: text2, fontSize: 13, marginBottom: 20 }}>Tap the heart icon on any listing to save it here.</p>
            <button onClick={() => navigate('/marketplace')}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {favorites.map((fav: any) => {
              const listing = fav.listing;
              const photo = listing?.animal?.photos?.[0]?.url;
              return (
                <div key={fav.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ height: 160, background: isDark ? '#1c2128' : '#f1f5f9', position: 'relative', cursor: 'pointer' }}
                    onClick={() => navigate(`/marketplace/listing/${listing?.id}`)}>
                    {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Beef size={32} color={text3} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                    <button onClick={e => { e.stopPropagation(); removeFav(listing?.id); }}
                      style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                      <Heart size={15} color="#ef4444" fill="#ef4444" />
                    </button>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, color: text, fontSize: 15, marginBottom: 2 }}>{listing?.animal?.name}</div>
                    <div style={{ fontSize: 12, color: text2, marginBottom: 6 }}>{listing?.animal?.breed} · {listing?.animal?.gender}</div>
                    {listing?.county && <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: text3, marginBottom: 8 }}><MapPin size={11} />{listing.county}</div>}
                    <div style={{ fontWeight: 800, fontSize: 17, color: isDark ? '#22d3ee' : '#0e7490', marginBottom: 10 }}>{fmt(listing?.askingPrice)}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => navigate(`/marketplace/listing/${listing?.id}`)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${border}`, background: 'transparent', color: text2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        View
                      </button>
                      <button onClick={() => addToCart(listing?.id)}
                        disabled={isInCart(listing?.id)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: isInCart(listing?.id) ? '#10b981' : '#0e7490', color: '#fff', fontSize: 12, fontWeight: 700, cursor: isInCart(listing?.id) ? 'default' : 'pointer' }}>
                        {isInCart(listing?.id) ? ' In Cart' : '+ Cart'}
                      </button>
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

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Search, MapPin, Beef, Loader2, Plus, LogIn } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Listing {
  id: number;
  askingPrice: string;
  county: string | null;
  location: string | null;
  description: string | null;
  views: number;
  createdAt: string;
  photos: { url: string; isPrimary: boolean }[];
  animal: {
    id: number;
    name: string;
    breed: string;
    gender: string;
    category: string | null;
    photos: { url: string }[];
  };
  seller: { id: number; name: string };
}

const CATEGORIES = ['calf','heifer','cow','bull_calf','young_bull','bull'];

function formatPrice(p: string) {
  return `KSh ${Number(p).toLocaleString()}`;
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');

  const load = useCallback((p = 1) => {
    setLoading(true);
    const query: Record<string, string> = { page: String(p), limit: '12' };
    if (search) query.search = search;
    if (category) query.category = category;
    if (location) query.county = location;
    if (minPrice) query.minPrice = minPrice;
    if (maxPrice) query.maxPrice = maxPrice;
    api.get('/market', { params: query })
      .then(r => {
        setListings(r.data.listings || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.totalPages || 1);
        setPage(r.data.page || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category, location, minPrice, maxPrice]);

  useEffect(() => { load(1); }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>

      {/* Marketplace Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#15803d,#16a34a)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>🌿</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#15803d' }}>AgriPulse</span>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>Marketplace</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user ? (
            <>
              <button onClick={() => navigate('/marketplace/create')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#15803d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={14} /> Sell Animal
              </button>
              <button onClick={() => navigate('/dashboard')}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                Farm Dashboard
              </button>
            </>
          ) : (
            <>
              <Link to="/marketplace/login"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none' }}>
                <LogIn size={14} /> Login
              </Link>
              <Link to="/marketplace/signup"
                style={{ padding: '8px 14px', background: '#15803d', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px', width: '100%' }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111827', margin: 0 }}>Browse Livestock</h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>{total} animal{total !== 1 ? 's' : ''} listed for sale</p>
        </div>

        {/* Filters */}
        <form onSubmit={e => { e.preventDefault(); load(1); }} style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16,
        }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#9ca3af' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or breed..."
              style={{ width: '100%', padding: '9px 9px 9px 32px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#111827' }} />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151', background: '#fff', outline: 'none' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <div style={{ position: 'relative', flex: '0 1 150px' }}>
            <MapPin style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#9ca3af' }} />
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="County"
              style={{ width: '100%', padding: '9px 9px 9px 28px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#111827' }} />
          </div>
          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} type="number" placeholder="Min KSh"
            style={{ width: 100, padding: '9px 10px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#111827' }} />
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} type="number" placeholder="Max KSh"
            style={{ width: 100, padding: '9px 10px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', color: '#111827' }} />
          <button type="submit" style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#15803d', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Search</button>
        </form>

        {/* Results */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader2 style={{ width: 28, height: 28, color: '#9ca3af', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14 }}>
            <Beef style={{ width: 40, height: 40, color: '#d1d5db', margin: '0 auto 12px' }} />
            <p style={{ color: '#111827', fontWeight: 600, fontSize: 16 }}>No listings found</p>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 18 }}>
            {listings.map(l => {
              const photo = l.photos?.[0]?.url || l.animal?.photos?.[0]?.url;
              return (
                <div key={l.id} onClick={() => navigate(`/marketplace/listing/${l.id}`)}
                  style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ width: '100%', height: 160, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {photo ? <img src={photo} alt={l.animal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Beef style={{ width: 36, height: 36, color: '#d1d5db' }} />}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{l.animal.name}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{l.animal.category?.replace('_', ' ')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{l.animal.breed} · {l.animal.gender}</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#15803d', marginBottom: 6 }}>{formatPrice(l.askingPrice)}</div>
                    {l.county && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#9ca3af' }}>
                        <MapPin style={{ width: 12, height: 12 }} /> {l.county}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => load(p)}
                style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #e5e7eb', background: p === page ? '#15803d' : '#fff', color: p === page ? '#fff' : '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

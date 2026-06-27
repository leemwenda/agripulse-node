import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Beef, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

interface Listing {
  id: number;
  askingPrice: string;
  description: string | null;
  location: string | null;
  views: number;
  createdAt: string;
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

const CATEGORIES = ['', 'calf', 'heifer', 'cow', 'bull_calf', 'young_bull', 'bull'];

function formatPrice(p: string) {
  const n = Number(p);
  return `KSh ${n.toLocaleString()}`;
}

export function MarketplacePage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

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
    if (location) query.location = location;
    if (minPrice) query.minPrice = minPrice;
    if (maxPrice) query.maxPrice = maxPrice;

    api.get('/marketplace/listings', { params: query })
      .then(r => {
        setListings(r.data.listings || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.totalPages || 1);
        setPage(r.data.page || 1);
      })
      .finally(() => setLoading(false));
  }, [search, category, location, minPrice, maxPrice]);

  useEffect(() => { load(1); }, [load]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(1);
  }

  const bg = isDark ? '#0d1117' : '#f9fafb';
  const cardBg = isDark ? '#161b22' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text = isDark ? '#e2ede6' : '#111827';
  const text2 = isDark ? '#8aab94' : '#6b7280';
  const text3 = isDark ? '#4d6b57' : '#9ca3af';
  const inputBg = isDark ? 'rgba(255,255,255,.04)' : '#fff';

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: text, margin: 0 }}>Marketplace</h1>
          <p style={{ color: text2, fontSize: 14, marginTop: 4 }}>{total} animal{total !== 1 ? 's' : ''} for sale</p>
        </div>

        {/* Filters */}
        <form onSubmit={handleFilterSubmit} style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24,
          background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16,
        }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: text3 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or breed..."
              style={{ width: '100%', padding: '10px 10px 10px 34px', borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: 'none' }}>
            <option value="">All Categories</option>
            {CATEGORIES.filter(Boolean).map(c => (
              <option key={c} value={c}>{c.replace('_', ' ')}</option>
            ))}
          </select>

          <div style={{ position: 'relative', flex: '0 1 160px' }}>
            <MapPin style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: text3 }} />
            <input
              value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Location"
              style={{ width: '100%', padding: '10px 10px 10px 30px', borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: 'none' }}
            />
          </div>

          <input
            value={minPrice} onChange={e => setMinPrice(e.target.value)}
            type="number" placeholder="Min KSh"
            style={{ width: 110, padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: 'none' }}
          />
          <input
            value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
            type="number" placeholder="Max KSh"
            style={{ width: 110, padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: 'none' }}
          />

          <button type="submit" style={{
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: '#15803d', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            Search
          </button>
        </form>

        {/* Results */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader2 style={{ width: 28, height: 28, color: text2, animation: 'spin 1s linear infinite' }} />
          </div>
        ) : listings.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '64px 24px', background: cardBg,
            border: `1px solid ${border}`, borderRadius: 14,
          }}>
            <Beef style={{ width: 40, height: 40, color: text3, margin: '0 auto 12px' }} />
            <p style={{ color: text, fontWeight: 600, fontSize: 16 }}>No listings found</p>
            <p style={{ color: text2, fontSize: 13, marginTop: 4 }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {listings.map(l => {
              const photo = l.animal.photos?.[0]?.url;
              return (
                <div key={l.id} onClick={() => navigate(`/marketplace/${l.id}`)}
                  style={{
                    background: cardBg, border: `1px solid ${border}`, borderRadius: 14,
                    overflow: 'hidden', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: '100%', height: 160, background: isDark ? '#0d1117' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {photo ? (
                      <img src={photo} alt={l.animal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Beef style={{ width: 36, height: 36, color: text3 }} />
                    )}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: text }}>{l.animal.name}</span>
                      <span style={{ fontSize: 11, color: text3, textTransform: 'capitalize' }}>{l.animal.category?.replace('_', ' ')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: text2, marginBottom: 8 }}>{l.animal.breed} · {l.animal.gender}</div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#15803d', marginBottom: 6 }}>{formatPrice(l.askingPrice)}</div>
                    {l.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: text3 }}>
                        <MapPin style={{ width: 12, height: 12 }} /> {l.location}
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
                style={{
                  width: 36, height: 36, borderRadius: 8, border: `1px solid ${border}`,
                  background: p === page ? '#15803d' : cardBg,
                  color: p === page ? '#fff' : text2,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

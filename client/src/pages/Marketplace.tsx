import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Beef, Loader2, ShoppingCart, Heart, MessageCircle, Bell,
  ChevronLeft, ChevronRight, ShieldCheck, FileText, Users, Plus, LogIn
} from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface Listing {
  id: number;
  askingPrice: string;
  description: string | null;
  county: string | null;
  town?: string | null;
  negotiable?: boolean;
  featured?: boolean;
  views: number;
  createdAt: string;
  photos: { url: string }[];
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

const CATEGORIES = ['calf', 'heifer', 'cow', 'bull_calf', 'young_bull', 'bull'];
const CATEGORY_LABELS: Record<string, string> = {
  calf: 'Calves', heifer: 'Heifers', cow: 'Cows',
  bull_calf: 'Bull Calves', young_bull: 'Young Bulls', bull: 'Bulls',
};
const RECENTLY_VIEWED_KEY = 'agripulse_recently_viewed';

function formatPrice(p: string) {
  return `KSh ${Number(p).toLocaleString()}`;
}

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

function pushRecentlyViewed(l: Listing) {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const entry = {
      id: l.id, name: l.animal.name, price: l.askingPrice,
      photo: l.photos?.[0]?.url || l.animal?.photos?.[0]?.url || null,
    };
    const filtered = list.filter((x: any) => x.id !== l.id);
    filtered.unshift(entry);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(filtered.slice(0, 5)));
  } catch {}
}

export function MarketplacePage() {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const { count: cartCount, addToCart, isInCart } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const bg     = isDark ? '#0d1117' : '#f7faf8';
  const cardBg = isDark ? 'rgba(255,255,255,.04)' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#4b5563';
  const text3  = isDark ? '#5c7a67' : '#9ca3af';
  const GREEN = '#15803d';
  const GREEN_LIGHT = '#16a34a';
  const GREEN_BG = isDark ? 'rgba(21,128,61,.12)' : '#f0fdf4';

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [favIds, setFavIds] = useState<Set<number>>(new Set());
  const [favBusyId, setFavBusyId] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || '');
  const [location, setLocation] = useState(params.get('location') || '');
  const [breed, setBreed] = useState(params.get('breed') || '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');

  const isFarmer = user && ['admin', 'worker', 'superadmin'].includes(user.role);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const query: any = { page: p, limit: 16 };
      if (search) query.search = search;
      if (category) query.category = category;
      if (location) query.county = location;
      if (breed) query.breed = breed;
      if (minPrice) query.minPrice = minPrice;
      if (maxPrice) query.maxPrice = maxPrice;
      const { data } = await api.get('/market', { params: query });
      setListings(data.listings || []);
      setTotal(data.total ?? (data.listings || []).length);
      setTotalPages(data.pages || 1);
      setPage(p);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, location, breed, minPrice, maxPrice]);

  useEffect(() => { load(1); }, [load]);

  useEffect(() => {
    if (!user) return;
    api.get('/market-misc/favorites').then(({ data }) => {
      const ids = new Set<number>((data.favorites || []).map((f: any) => f.listingId ?? f.listing?.id));
      setFavIds(ids);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      setRecentlyViewed(raw ? JSON.parse(raw) : []);
    } catch { setRecentlyViewed([]); }
  }, [listings]);

  function goToListing(l: Listing) {
    pushRecentlyViewed(l);
    navigate(`/marketplace/listing/${l.id}`);
  }

  async function handleAddToCart(e: React.MouseEvent, listingId: number) {
    e.stopPropagation();
    if (!user) { navigate('/marketplace/login'); return; }
    setAddingId(listingId);
    try { await addToCart(listingId); } catch {} finally { setAddingId(null); }
  }

  async function toggleFavorite(e: React.MouseEvent, l: Listing) {
    e.stopPropagation();
    if (!user) { navigate('/marketplace/login'); return; }
    setFavBusyId(l.id);
    try {
      if (favIds.has(l.id)) {
        await api.delete(`/market-misc/favorites/${l.id}`);
        setFavIds(prev => { const n = new Set(prev); n.delete(l.id); return n; });
      } else {
        await api.post('/market-misc/favorites', { listingId: l.id });
        setFavIds(prev => new Set(prev).add(l.id));
      }
    } catch {} finally { setFavBusyId(null); }
  }

  const featured = listings.filter(l => l.featured);
  const recent = listings.filter(l => !l.featured);
  const uniqueCounties = new Set(listings.map(l => l.county).filter(Boolean)).size;
  const uniqueSellers = new Set(listings.map(l => l.seller.id)).size;
  const newThisWeek = listings.filter(l => isNew(l.createdAt)).length;

  const sellerCounts: Record<string, { name: string; count: number }> = {};
  listings.forEach(l => {
    const key = String(l.seller.id);
    if (!sellerCounts[key]) sellerCounts[key] = { name: l.seller.name, count: 0 };
    sellerCounts[key].count++;
  });
  const topSellers = Object.values(sellerCounts).sort((a, b) => b.count - a.count).slice(0, 3);

  const inp: any = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: `1px solid ${border}`, background: cardBg, color: text,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const lbl: any = { fontSize: 11, fontWeight: 700, color: text3, letterSpacing: '.3px', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  function CategoryButton({ value, label }: { value: string; label: string }) {
    const active = category === value;
    return (
      <button
        onClick={() => setCategory(active ? '' : value)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          width: '100%', padding: '9px 12px', borderRadius: 9, marginBottom: 4,
          border: 'none', background: active ? GREEN_BG : 'transparent',
          color: active ? GREEN : text2, fontWeight: active ? 700 : 500,
          fontSize: 13, cursor: 'pointer', textAlign: 'left',
        }}>
        {label}
      </button>
    );
  }

  function ListingCard({ l }: { l: Listing }) {
    const photo = l.photos?.[0]?.url || l.animal?.photos?.[0]?.url;
    const fav = favIds.has(l.id);
    return (
      <div onClick={() => goToListing(l)}
        style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'transform .15s' }}>
        <div style={{ height: 160, background: isDark ? '#0d1117' : '#f3f4f6', position: 'relative' }}>
          {photo ? (
            <img src={photo} alt={l.animal.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Beef style={{ width: 36, height: 36, color: text3 }} />
            </div>
          )}
          <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
            {l.featured && (
              <span style={{ background: GREEN, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '.3px' }}>FEATURED</span>
            )}
            {isNew(l.createdAt) && !l.featured && (
              <span style={{ background: '#0e7490', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '.3px' }}>NEW</span>
            )}
          </div>
          <button onClick={e => toggleFavorite(e, l)} disabled={favBusyId === l.id}
            style={{
              position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%',
              border: 'none', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: favBusyId === l.id ? .5 : 1,
            }}>
            <Heart size={15} fill={fav ? '#ef4444' : 'none'} color={fav ? '#ef4444' : '#6b7280'} />
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: text }}>{l.animal.name}</div>
          <div style={{ fontSize: 13, color: text2, marginBottom: 6 }}>{l.animal.breed} · {l.animal.gender}</div>
          {l.county && (
            <div style={{ fontSize: 12, color: text3, marginBottom: 6 }}> {l.county}{l.town ? `, ${l.town}` : ''}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: GREEN }}>{formatPrice(l.askingPrice)}</div>
            {l.negotiable && <span style={{ fontSize: 11, color: text3, fontWeight: 600 }}>Negotiable</span>}
          </div>
          <div style={{ fontSize: 11, color: text3, marginBottom: 8 }}>Seller: {l.seller.name}</div>
          <button
            onClick={e => handleAddToCart(e, l.id)}
            disabled={addingId === l.id || isInCart(l.id)}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
              background: isInCart(l.id) ? '#10b981' : GREEN,
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: isInCart(l.id) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              opacity: addingId === l.id ? .6 : 1,
            }}>
            <ShoppingCart size={13} /> {isInCart(l.id) ? 'In Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Top navbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: cardBg,
        borderBottom: `1px solid ${border}`, padding: isMobile ? '10px 14px' : '12px 24px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/marketplace')}>
          <img src="/agripulse-logo.png" alt="AgriPulse" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'contain', background: '#fff', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: text, lineHeight: 1.1 }}>AgriPulse</div>
            <div style={{ fontSize: 10, color: text3, fontWeight: 600 }}>Marketplace</div>
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); load(1); }} style={{ flex: '1 1 280px', position: 'relative', maxWidth: 480 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: text3 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by breed, animal name, or location..."
            style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 20, border: `1px solid ${border}`, background: bg, color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
          <button onClick={() => navigate('/marketplace')} style={{ display: isMobile ? 'none' : 'inline-block', background: 'none', border: 'none', color: text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Browse</button>
          <button onClick={() => user ? navigate('/marketplace/favorites') : navigate('/marketplace/login')} style={{ display: isMobile ? 'none' : 'inline-block', background: 'none', border: 'none', color: text2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Saved</button>
          <button onClick={() => user ? navigate('/marketplace/messages') : navigate('/marketplace/login')} style={{ background: 'none', border: 'none', color: text2, cursor: 'pointer', position: 'relative' }} title="Messages">
            <MessageCircle size={19} />
          </button>
          <button onClick={() => user ? navigate('/marketplace/notifications') : navigate('/marketplace/login')} style={{ background: 'none', border: 'none', color: text2, cursor: 'pointer' }} title="Notifications">
            <Bell size={19} />
          </button>
          <button onClick={() => navigate('/marketplace/cart')} style={{ background: 'none', border: 'none', color: text2, cursor: 'pointer', position: 'relative' }} title="Cart">
            <ShoppingCart size={19} />
            {cartCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -8, width: 16, height: 16, borderRadius: '50%', background: GREEN, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
            )}
          </button>

          {isFarmer && (
            <button onClick={() => navigate('/marketplace/create')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: GREEN, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Plus size={14} /> Sell Animal
            </button>
          )}

          {user ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: GREEN_BG, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{user.name?.split(' ')[0]}</span>
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: 40, background: cardBg, border: `1px solid ${border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.15)', minWidth: 180, zIndex: 30 }}>
                  <button onClick={() => { setShowMenu(false); navigate('/marketplace/my-listings'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: text, fontSize: 13, cursor: 'pointer' }}>My Listings</button>
                  <button onClick={() => { setShowMenu(false); navigate('/marketplace/my-offers'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: text, fontSize: 13, cursor: 'pointer' }}>My Offers</button>
                  <button onClick={() => { setShowMenu(false); navigate('/profile'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: text, fontSize: 13, cursor: 'pointer' }}>Profile</button>
                  <button onClick={() => { setShowMenu(false); logout(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer', borderTop: `1px solid ${border}` }}>Logout</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/marketplace/login')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: `1px solid ${border}`, background: 'none', color: text, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <LogIn size={14} /> Sign In
            </button>
          )}
        </div>
      </div>

      {/* Body: sidebar / content / right rail */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 20, padding: isMobile ? '14px 12px' : '20px 24px', maxWidth: 1500, margin: '0 auto', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
        {/* Left sidebar */}
        <div style={{ width: isMobile ? '100%' : 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            {user ? (
              <>
                <div style={{ fontSize: 12, color: text3 }}>Welcome back,</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: text }}>{user.name}</div>
                <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, textTransform: 'capitalize' }}>{user.role === 'buyer' ? 'Buyer' : 'Farmer'}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: text2, marginBottom: 8 }}>Sign in to save animals and message sellers.</div>
                <button onClick={() => navigate('/marketplace/login')} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: GREEN, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Sign In</button>
              </>
            )}
          </div>

          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: text, marginBottom: 10 }}>Categories</div>
            <CategoryButton value="" label="All Animals" />
            {CATEGORIES.map(c => <CategoryButton key={c} value={c} label={CATEGORY_LABELS[c]} />)}
          </div>

          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: text }}>Filters</div>
              <button onClick={() => { setLocation(''); setBreed(''); setMinPrice(''); setMaxPrice(''); load(1); }} style={{ background: 'none', border: 'none', color: text3, fontSize: 11, cursor: 'pointer' }}>Reset</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Location</label>
              <input style={inp} placeholder="e.g. Nakuru" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Breed</label>
              <input style={inp} placeholder="e.g. Friesian" value={breed} onChange={e => setBreed(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>Price Range (KES)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={inp} placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                <input style={inp} placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>
            </div>
            <button onClick={() => load(1)} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: 'none', background: GREEN, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Apply Filters</button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Hero */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 24, background: `linear-gradient(120deg, ${GREEN_BG}, ${cardBg})`,
            border: `1px solid ${border}`, borderRadius: 20, padding: isMobile ? 18 : 28, flexWrap: 'wrap',
          }}>
            <div style={{ flex: '1 1 320px' }}>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: text, marginBottom: 6 }}>Buy and Sell Quality Livestock</h1>
              <p style={{ fontSize: 14, color: text2, marginBottom: 18 }}>Verified farmers. Healthy animals. Secure transfers.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Animals for sale', value: total },
                  { label: 'Sellers on this page', value: uniqueSellers },
                  { label: 'Counties covered', value: uniqueCounties },
                  { label: 'New this week', value: newThisWeek },
                ].map(s => (
                  <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '10px 16px', minWidth: 110 }}>
                    <div style={{ fontWeight: 800, fontSize: 20, color: text }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: text3 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <img src="/cow1.jpg" alt="" style={{ width: 220, height: 160, objectFit: 'cover', borderRadius: 16, flexShrink: 0, display: isMobile ? 'none' : 'block' }} />
          </div>

          {/* Featured */}
          {featured.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: text }}>Featured Listings</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {featured.map(l => <ListingCard key={l.id} l={l} />)}
              </div>
            </div>
          )}

          {/* Recent / all */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: text }}>{featured.length > 0 ? 'Recent Listings' : 'All Listings'}</h2>
              <div style={{ fontSize: 12, color: text3 }}>{total} total</div>
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                <Loader2 style={{ width: 26, height: 26, color: text2, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : recent.length === 0 && featured.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: cardBg, border: `1px solid ${border}`, borderRadius: 14 }}>
                <Beef style={{ width: 36, height: 36, color: text3, margin: '0 auto 10px' }} />
                <p style={{ color: text, fontWeight: 600 }}>No listings found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {recent.map(l => <ListingCard key={l.id} l={l} />)}
              </div>
            )}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                <button onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1}
                  style={{ padding: 8, borderRadius: 8, border: `1px solid ${border}`, background: cardBg, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? .4 : 1 }}>
                  <ChevronLeft size={16} color={text} />
                </button>
                <span style={{ fontSize: 13, color: text2 }}>Page {page} of {totalPages}</span>
                <button onClick={() => load(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  style={{ padding: 8, borderRadius: 8, border: `1px solid ${border}`, background: cardBg, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? .4 : 1 }}>
                  <ChevronRight size={16} color={text} />
                </button>
              </div>
            )}
          </div>


        </div>

        {/* Right rail */}
        <div style={{ width: isMobile ? '100%' : 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {topSellers.length > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: text, marginBottom: 10 }}>Top Sellers (this page)</div>
              {topSellers.map(s => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: GREEN_BG, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: text3 }}>{s.count} animal{s.count !== 1 ? 's' : ''} listed</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: text, marginBottom: 10 }}>Why Buy on AgriPulse?</div>
            {[
              ['Farm-linked listings', 'Animals come straight from registered farm records'],
              ['Digital Animal Passport', 'Full health & ownership history per animal'],
              ['Secure Transfers', 'Two-party signed digital agreements'],
              ['Direct Messaging', 'Talk to sellers before you commit'],
            ].map(([t, s]) => (
              <div key={t} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: text }}>{t}</div>
                <div style={{ fontSize: 11, color: text3 }}>{s}</div>
              </div>
            ))}
          </div>

          {recentlyViewed.length > 0 && (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: text, marginBottom: 10 }}>Recently Viewed</div>
              {recentlyViewed.map(r => (
                <div key={r.id} onClick={() => navigate(`/marketplace/listing/${r.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: isDark ? '#0d1117' : '#f3f4f6', overflow: 'hidden', flexShrink: 0 }}>
                    {r.photo ? <img src={r.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: text }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: text3 }}>{formatPrice(r.price)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

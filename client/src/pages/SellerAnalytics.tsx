import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Eye, Tag, CheckCircle2, BarChart2, Wallet } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

function fmt(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : 'KSh 0'; }

export default function SellerAnalytics() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const bg     = isDark ? '#0d1117' : '#f9fafb';
  const card   = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#374151';
  const text3  = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';

  useEffect(() => {
    api.get('/market-analytics/seller')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data ? [
    { icon: <Tag size={20} color="#15803d" />, label: 'Total Listings', value: data.totalListings, bg: isDark ? 'rgba(21,128,61,.15)' : '#f0fdf4' },
    { icon: <Eye size={20} color="#0e7490" />, label: 'Total Views', value: data.totalViews, bg: isDark ? 'rgba(14,116,144,.15)' : '#ecfeff' },
    { icon: <TrendingUp size={20} color="#8b5cf6" />, label: 'Offers Received', value: data.totalOffers, bg: isDark ? 'rgba(139,92,246,.15)' : '#f5f3ff' },
    { icon: <CheckCircle2 size={20} color="#10b981" />, label: 'Sales Completed', value: data.completedSales, bg: isDark ? 'rgba(16,185,129,.15)' : '#f0fdf4' },
    { icon: <Wallet size={20} color="#f59e0b" />, label: 'Total Revenue', value: fmt(data.totalRevenue), bg: isDark ? 'rgba(245,158,11,.15)' : '#fffbeb' },
    { icon: <BarChart2 size={20} color="#ef4444" />, label: 'Conversion Rate', value: data.totalOffers > 0 ? `${Math.round((data.acceptedOffers / data.totalOffers) * 100)}%` : '0%', bg: isDark ? 'rgba(239,68,68,.15)' : '#fef2f2' },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0 }}>Seller Analytics</h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: text3 }}>Loading analytics…</div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: 60, color: text3 }}>No data available</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${border}`, borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: text, marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: text2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 16 }}>Listing Status Breakdown</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Active', value: data.byStatus.active, color: '#10b981' },
                  { label: 'Reserved', value: data.byStatus.reserved, color: '#f59e0b' },
                  { label: 'Sold', value: data.byStatus.sold, color: '#6b7280' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '16px 12px', background: isDark ? 'rgba(255,255,255,.03)' : '#f8fafc', borderRadius: 10, border: `1px solid ${border}` }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: text2, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 16 }}>Listing Performance</h3>
              {data.listingPerformance.length === 0 ? (
                <p style={{ color: text3, fontSize: 13 }}>No listings yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.listingPerformance.map((l: any) => {
                    const maxViews = Math.max(...data.listingPerformance.map((x: any) => x.views), 1);
                    return (
                      <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 140, fontSize: 13, color: text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{l.title}</div>
                        <div style={{ flex: 1, height: 8, background: isDark ? 'rgba(255,255,255,.06)' : '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(l.views / maxViews) * 100}%`, background: '#0e7490', borderRadius: 4, transition: 'width .5s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, color: text3, width: 60, textAlign: 'right', flexShrink: 0 }}>{l.views} views</span>
                        <span style={{ fontSize: 12, color: text3, width: 60, textAlign: 'right', flexShrink: 0 }}>{l.offers} offers</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

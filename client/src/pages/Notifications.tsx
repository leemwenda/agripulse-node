import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, BellOff, CheckCheck } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const TYPE_ICON: Record<string, string> = {
  offer: '💰', message: '💬', agreement: '📜', transfer: '🔄',
  listing: '🐄', favorite: '❤️', system: '🔔',
};

export default function Notifications() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const bg     = isDark ? '#0d1117' : '#f9fafb';
  const card   = isDark ? 'rgba(255,255,255,.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb';
  const text   = isDark ? '#e2ede6' : '#111827';
  const text2  = isDark ? '#8aab94' : '#374151';
  const text3  = isDark ? 'rgba(255,255,255,.3)' : '#9ca3af';

  function load() {
    setLoading(true);
    api.get('/market-notifications')
      .then(r => setNotifs(r.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await api.patch('/market-notifications/read-all');
    load();
  }

  async function markRead(id: number) {
    await api.patch(`/market-notifications/${id}/read`);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: 24 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/marketplace')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0, flex: 1 }}>Notifications</h1>
          {unread > 0 && (
            <button onClick={markAllRead}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${border}`, background: 'transparent', color: text2, cursor: 'pointer', fontSize: 13 }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: text3 }}>Loading…</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: card, border: `1px solid ${border}`, borderRadius: 16 }}>
            <BellOff size={40} color={text3} style={{ margin: '0 auto 14px' }} />
            <p style={{ color: text, fontWeight: 700, marginBottom: 6 }}>No notifications yet</p>
            <p style={{ color: text2, fontSize: 13 }}>Activity on your listings and offers will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map((n: any) => (
              <div key={n.id} onClick={() => { if (!n.read) markRead(n.id); if (n.link) navigate(n.link); }}
                style={{ display: 'flex', gap: 12, padding: '14px 16px', background: n.read ? card : (isDark ? 'rgba(255,255,255,.07)' : '#f0fdf4'), border: `1px solid ${n.read ? border : 'rgba(16,185,129,.25)'}`, borderRadius: 12, cursor: n.link ? 'pointer' : 'default', transition: 'background .15s' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,.06)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {TYPE_ICON[n.type] || '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 400 : 700, color: text, fontSize: 14, marginBottom: 2 }}>{n.title}</div>
                  {n.body && <div style={{ fontSize: 13, color: text2, lineHeight: 1.5 }}>{n.body}</div>}
                  <div style={{ fontSize: 11, color: text3, marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, marginTop: 6 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

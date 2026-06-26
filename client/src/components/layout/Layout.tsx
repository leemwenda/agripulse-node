import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Beef, Milk, Heart, Baby, Wallet,
  Users, Bot, LogOut, Menu, X, Bell, ChevronDown,
  BarChart2, User, AlertTriangle, Sun, Moon, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/api';

const allNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard', roles: ['admin','superadmin','worker'] },
  { icon: Beef,            label: 'Animals',   to: '/animals',   roles: ['admin','superadmin'] },
  { icon: Milk,            label: 'Milk',      to: '/milk',      roles: ['admin','superadmin','worker'] },
  { icon: Heart,           label: 'Health',    to: '/health',    roles: ['admin','superadmin','worker'] },
  { icon: Baby,            label: 'Breeding',  to: '/breeding',  roles: ['admin','superadmin'] },
  { icon: Wallet,          label: 'Finances',  to: '/financial', roles: ['admin','superadmin'] },
  { icon: Users,           label: 'Workers',   to: '/workers',   roles: ['admin','superadmin'] },
  { icon: Bot,             label: 'AI Advisor',to: '/ai',        roles: ['admin','superadmin'] },
  { icon: BarChart2,       label: 'Reports',   to: '/reports',   roles: ['admin','superadmin'] },
];

const TYPE_COLORS_DARK: Record<string, string> = {
  danger:  'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  info:    'border-blue-500/40 bg-blue-500/10 text-blue-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  update:  'border-purple-500/40 bg-purple-500/10 text-purple-300',
};
const TYPE_COLORS_LIGHT: Record<string, string> = {
  danger:  'border-red-200 bg-red-50 text-red-800',
  warning: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  info:    'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  update:  'border-purple-200 bg-purple-50 text-purple-800',
};

export function Layout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const initials = (n: string) =>
    n?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  useEffect(() => {
    const load = () =>
      api.get('/notifications')
        .then(r => { setNotifications(r.data.notifications); setUnread(r.data.unread); })
        .catch(() => {});
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  const colors = {
    dark: {
      pageBg:       '#0d1117',
      sidebarBg:    'linear-gradient(180deg,#0d1526 0%,#0a1020 100%)',
      sidebarBorder:'rgba(99,143,255,.18)',
      cardBg:       '#161b22',
      hoverBg:      '#1c2128',
      border:       'rgba(59,130,246,.1)',
      divider:      'rgba(99,143,255,.12)',
      text:         '#e2ede6',
      text2:        '#8aab94',
      text3:        '#4d6b57',
      green:        '#10b981',
      greenBg:      'rgba(16,185,129,.15)',
    },
    light: {
      pageBg:       '#f9fafb',
      sidebarBg:    '#ffffff',
      sidebarBorder:'#e5e7eb',
      cardBg:       '#ffffff',
      hoverBg:      '#f3f4f6',
      border:       '#e5e7eb',
      divider:      '#e5e7eb',
      text:         '#111827',
      text2:        '#374151',
      text3:        '#9ca3af',
      green:        '#1a6b3c',
      greenBg:      '#f0fdf4',
    },
  };

  const c = isDark ? colors.dark : colors.light;

  const navLinkStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? c.green : c.text2,
    background: isActive ? c.greenBg : 'transparent',
    transition: 'all 0.15s',
    textDecoration: 'none',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: c.pageBg }}>

      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 20 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside style={{
        position: isDesktop ? 'relative' : 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 30,
        width: '256px',
        flexShrink: 0,
        display: isDesktop ? 'flex' : (sidebarOpen ? 'flex' : 'none'),
        flexDirection: 'column',
        background: c.sidebarBg,
        borderRight: `1px solid ${c.sidebarBorder}`,
        boxShadow: isDark ? '2px 0 20px rgba(0,0,0,.4)' : '1px 0 0 #e5e7eb',
        overflowY: 'auto',
        transform: isDesktop ? 'none' : (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'),
        transition: 'transform 0.2s',
      }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px', borderBottom: `1px solid ${c.divider}`, flexShrink: 0,
        }}>
          <img
            src="/logo.png" alt="AgriPulse"
            style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: c.text }}>AgriPulse</div>
            <div style={{ fontSize: 12, color: c.text3 }}>Farm Management</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: 'auto', color: c.text3, background: 'none', border: 'none', cursor: 'pointer' }}
            className="lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[...allNavItems.filter(item => item.roles.includes(user?.role || '')), ...(user?.role === 'superadmin' ? [{ icon: Shield, label: 'System', to: '/system' }] : [])].map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to} to={to}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => navLinkStyle(isActive)}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                if (el.style.background === 'transparent' || el.style.background === '') {
                  el.style.background = c.hoverBg;
                  el.style.color = c.text;
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                const isActive = el.getAttribute('aria-current') === 'page';
                if (!isActive) {
                  el.style.background = 'transparent';
                  el.style.color = c.text2;
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          padding: '12px', borderTop: `1px solid ${c.divider}`,
          flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {[
            { label: 'Profile',      Icon: User,          to: '/profile' },
            { label: 'Report Issue', Icon: AlertTriangle, to: '/issues'  },
          ].map(({ label, Icon, to }) => (
            <NavLink
              key={to} to={to}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => navLinkStyle(isActive)}
            >
              <Icon size={16} />{label}
            </NavLink>
          ))}

          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 12px', borderTop: `1px solid ${c.divider}`, marginTop: '4px',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#1a6b3c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {initials(user?.name || '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: c.text3, textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', color: c.text3, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = c.hoverBg; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = c.text3; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        <header style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderBottom: `1px solid ${c.border}`,
          background: c.cardBg, flexShrink: 0,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: c.text2 }}
          >
            <Menu size={20} />
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={toggleTheme}
              style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: isDark ? '#fbbf24' : '#6b7280', transition: 'all 0.15s' }}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: c.text2, position: 'relative' }}
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                )}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 44, width: 320, borderRadius: 12,
                  background: c.cardBg, border: `1px solid ${c.border}`,
                  boxShadow: '0 10px 40px rgba(0,0,0,.25)', zIndex: 50, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: c.text }}>Notifications</span>
                    {unread > 0 && <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 999 }}>{unread} new</span>}
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 14, color: c.text3 }}>No notifications</div>
                    ) : notifications.slice(0, 10).map(n => {
                      const cls = isDark ? (TYPE_COLORS_DARK[n.type] || TYPE_COLORS_DARK.info) : (TYPE_COLORS_LIGHT[n.type] || TYPE_COLORS_LIGHT.info);
                      return (
                        <div key={n.id} className={`border-b last:border-0 text-sm border-l-2 ${cls}`} style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 500 }}>{n.title}</div>
                          <div style={{ fontSize: 12, marginTop: 2, opacity: 0.75 }}>{n.message}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '8px 16px', borderTop: `1px solid ${c.border}` }}>
                    <button onClick={() => setNotifOpen(false)} style={{ fontSize: 12, color: c.text3, background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px 6px 8px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a6b3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                  {initials(user?.name || '')}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: c.text2 }} className="hidden sm:block">
                  {user?.name?.split(' ')[0]}
                </span>
                <ChevronDown size={14} style={{ color: c.text3 }} />
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 44, width: 176, borderRadius: 12,
                  background: c.cardBg, border: `1px solid ${c.border}`,
                  boxShadow: '0 10px 40px rgba(0,0,0,.25)', zIndex: 50, overflow: 'hidden', padding: '4px 0',
                }}>
                  {[
                    { label: 'Profile',      Icon: User,          action: () => { navigate('/profile'); setProfileOpen(false); } },
                    { label: 'Report issue', Icon: AlertTriangle, action: () => { navigate('/issues');  setProfileOpen(false); } },
                  ].map(({ label, Icon, action }) => (
                    <button key={label} onClick={action}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: '8px', color: c.text2, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = c.hoverBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Icon size={16} />{label}
                    </button>
                  ))}
                  <div style={{ margin: '4px 0', borderTop: `1px solid ${c.border}` }} />
                  <button onClick={handleLogout}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={16} />Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: c.pageBg }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

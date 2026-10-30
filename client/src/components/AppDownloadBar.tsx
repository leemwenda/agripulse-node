import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const KEY = 'agripulse.appbar.dismissed';

function isPhone(): boolean {
  const ua = navigator.userAgent || '';
  return /android|iphone|ipod|ipad/i.test(ua);
}

export default function AppDownloadBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
    if (!dismissed && isPhone()) setShow(true);
  }, []);

  if (!show) return null;

  const close = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
      background: '#0b1a12', border: '1px solid rgba(74,222,128,.35)',
      borderRadius: 14, boxShadow: '0 8px 30px rgba(0,0,0,.45)', color: '#fff',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <img src="/agripulse-logo.png" alt="" width={36} height={36}
        style={{ background: '#fff', borderRadius: 8, padding: 3 }} />
      <div style={{ flex: 1, lineHeight: 1.25 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Get the AgriPulse app</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Manage your farm from your phone</div>
      </div>
      <Link to="/download" style={{
        background: '#16a34a', color: '#fff', padding: '9px 14px', borderRadius: 10,
        fontWeight: 700, fontSize: 13, textDecoration: 'none',
      }}>Get it</Link>
      <button onClick={close} aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.6, fontSize: 20, cursor: 'pointer', padding: 4 }}>×</button>
    </div>
  );
}

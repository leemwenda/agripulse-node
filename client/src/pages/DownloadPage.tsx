import { useEffect, useState } from 'react';

const FALLBACK_APK_URL = 'https://agripulse.me/downloads/agripulse-1.0.0.apk';
const VERSION_URL = 'https://agripulse.me/downloads/version.json';

type Platform = 'android' | 'ios' | 'other';

function detect(): Platform {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'other';
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 16, padding: 24, flex: '1 1 280px', maxWidth: 420,
};
const btn: React.CSSProperties = {
  display: 'inline-block', background: '#16a34a', color: '#fff', padding: '14px 22px',
  borderRadius: 12, fontWeight: 700, textDecoration: 'none', marginTop: 12,
};

export default function DownloadPage() {
  const showAll = new URLSearchParams(window.location.search).get('all') === '1';
  const [platform] = useState<Platform>(() => (showAll ? 'other' : detect()));
  const [version, setVersion] = useState<string | null>(null);
  const [apkUrl, setApkUrl] = useState(FALLBACK_APK_URL);

  useEffect(() => {
    fetch(VERSION_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!d) return; setVersion(String(d.versionName || '')); if (d.url) setApkUrl(String(d.url)); })
      .catch(() => {});
  }, []);

  const android = (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>Android</h2>
      <p>Download the AgriPulse app{version ? ` (v${version})` : ''}.</p>
      <a href={apkUrl} style={btn} download>Download APK</a>
      <ol style={{ paddingLeft: 18, fontSize: 14, opacity: 0.8, marginTop: 16 }}>
        <li>Open the downloaded file.</li>
        <li>If asked, allow "Install unknown apps" for your browser.</li>
        <li>Tap Install, then open AgriPulse.</li>
      </ol>
    </div>
  );

  const ios = (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>iPhone / iPad</h2>
      <p>Install AgriPulse on your home screen:</p>
      <ol style={{ paddingLeft: 18, fontSize: 14, opacity: 0.85 }}>
        <li>Open <b>agripulse.me</b> in <b>Safari</b>.</li>
        <li>Tap the <b>Share</b> button.</li>
        <li>Choose <b>Add to Home Screen</b>, then tap Add.</li>
      </ol>
      <a href="https://agripulse.me" style={btn}>Open agripulse.me</a>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#060e09', color: '#fff', padding: '48px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <img src="/agripulse-logo.png" alt="AgriPulse" width={72} height={72} style={{ borderRadius: 16, background: '#fff', padding: 6 }} />
        <h1>Get the AgriPulse app</h1>
        <p style={{ opacity: 0.7 }}>Manage your farm, trade livestock and reach vets from your phone.</p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginTop: 32, textAlign: 'left' }}>
          {platform === 'android' && android}
          {platform === 'ios' && ios}
          {platform === 'other' && (<>{android}{ios}</>)}
        </div>
        {platform !== 'other' && (
          <p style={{ marginTop: 28, fontSize: 13, opacity: 0.6 }}>
            Using a different phone? <a href="/download?all=1" style={{ color: '#4ade80' }}>See all options</a>
          </p>
        )}
      </div>
    </div>
  );
}

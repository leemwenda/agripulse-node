import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const IMAGES = ['/journey1.jpg', '/journey2.jpg', '/journey3.jpg'];

const ROLES = [
  {
    key: 'farmer',
    label: 'FARM OWNER',
    tagline: 'Grow & Manage',
    description: 'Register your farm, manage your herd, track health and milk records, and sell directly from your dashboard.',
    features: ['Animal Passport & QR Code', 'Health & Milk Records', 'Marketplace Selling', 'Ownership Transfers', 'Farm Reports'],
    cta: 'Start as Farm Owner',
    path: '/register?role=farmer',
    glow: 'rgba(21,128,61,0.55)',
    glowHover: 'rgba(21,128,61,0.8)',
    accent: '#4ade80',
    accentDim: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.2)',
    borderHover: 'rgba(74,222,128,0.5)',
    btnBg: '#15803d',
    btnHover: '#16a34a',
  },
  {
    key: 'buyer',
    label: 'BUYER',
    tagline: 'Browse & Purchase',
    description: 'Find verified livestock with full digital passport history. Negotiate directly with farmers and complete transfers securely.',
    features: ['Browse Marketplace', 'View Animal Passports', 'Direct Farmer Chat', 'Secure Transfer Agreements', 'Purchase History'],
    cta: 'Start as Buyer',
    path: '/register?role=buyer',
    glow: 'rgba(37,99,235,0.55)',
    glowHover: 'rgba(37,99,235,0.8)',
    accent: '#60a5fa',
    accentDim: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.2)',
    borderHover: 'rgba(96,165,250,0.5)',
    btnBg: '#1d4ed8',
    btnHover: '#2563eb',
    featured: true,
  },
  {
    key: 'vet',
    label: 'VETERINARIAN',
    tagline: 'Treat & Verify',
    description: 'Register your practice, access animal histories, record treatments and vaccinations, and verify ownership transfers.',
    features: ['Animal Treatment Records', 'Vaccination Tracking', 'Transfer Verification', 'Appointment Requests', 'Client Reviews'],
    cta: 'Start as Veterinarian',
    path: '/register?role=vet',
    glow: 'rgba(13,148,136,0.55)',
    glowHover: 'rgba(13,148,136,0.8)',
    accent: '#2dd4bf',
    accentDim: 'rgba(45,212,191,0.12)',
    border: 'rgba(45,212,191,0.2)',
    borderHover: 'rgba(45,212,191,0.5)',
    btnBg: '#0f766e',
    btnHover: '#0d9488',
  },
];

export default function ChooseJourney() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrent(prev => (prev + 1) % IMAGES.length);
        setFade(true);
      }, 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px', overflow: 'hidden',
      background: '#050a0f',
    }}>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `url(${IMAGES[current]})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: fade ? 0.18 : 0,
        transition: 'opacity 0.6s ease',
      }} />

      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '5%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(21,128,61,0.18)',
          filter: 'blur(100px)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '40%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(37,99,235,0.15)',
          filter: 'blur(120px)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '5%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(13,148,136,0.18)',
          filter: 'blur(100px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/agripulse-logo.png" alt="AgriPulse" style={{ width: 32, height: 32, borderRadius: 7 }} />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>AgriPulse</span>
          </div>

          <div>
            <h1 style={{
              color: '#fff', margin: 0,
              fontSize: 'clamp(32px, 5vw, 54px)',
              fontWeight: 900, letterSpacing: -1, lineHeight: 1.1,
            }}>
              Choose Your Journey
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16, marginTop: 12, marginBottom: 0 }}>
              One platform. Three paths. All connected through verified animal passports.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, width: '100%', alignItems: 'start',
        }}>
          {ROLES.map(role => {
            const isHovered = hovered === role.key;
            return (
              <div
                key={role.key}
                onMouseEnter={() => setHovered(role.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: 'relative',
                  background: isHovered
                    ? `linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))`
                    : `linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${isHovered ? role.borderHover : role.border}`,
                  borderRadius: 20,
                  padding: '32px 28px',
                  display: 'flex', flexDirection: 'column', gap: 24,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: role.featured
                    ? isHovered ? 'translateY(-6px) scale(1.02)' : 'translateY(-4px) scale(1.01)'
                    : isHovered ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: isHovered
                    ? `0 0 60px ${role.glow}, 0 20px 40px rgba(0,0,0,0.4)`
                    : role.featured
                      ? `0 0 30px ${role.glow}, 0 8px 24px rgba(0,0,0,0.3)`
                      : '0 4px 20px rgba(0,0,0,0.3)',
                }}
                onClick={() => navigate(role.path)}
              >

                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 20,
                  background: isHovered ? role.glowHover : role.glow,
                  opacity: 0.08, zIndex: 0, pointerEvents: 'none',
                  transition: 'all 0.3s ease',
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

                  <div>
                    <div style={{
                      display: 'inline-block',
                      background: role.accentDim,
                      border: `1px solid ${role.border}`,
                      color: role.accent,
                      fontSize: 10, fontWeight: 800,
                      letterSpacing: 2, padding: '4px 10px',
                      borderRadius: 6, marginBottom: 14,
                    }}>
                      {role.label}
                    </div>
                    <div style={{ color: '#fff', fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>
                      {role.tagline}
                    </div>
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    {role.description}
                  </p>

                  <div style={{ height: 1, background: `linear-gradient(to right, ${role.border}, transparent)` }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {role.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: role.accentDim,
                          border: `1px solid ${role.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: role.accent }} />
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    style={{
                      marginTop: 4,
                      padding: '14px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: isHovered ? role.btnHover : role.btnBg,
                      color: '#fff',
                      fontSize: 14, fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: 0.3,
                      width: '100%',
                      boxShadow: isHovered ? `0 4px 20px ${role.glow}` : 'none',
                    }}
                    onClick={e => { e.stopPropagation(); navigate(role.path); }}
                  >
                    {role.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Already have an account?</span>
          <span
            onClick={() => navigate('/login')}
            style={{ color: '#4ade80', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Sign in
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>·</span>
          <span
            onClick={() => navigate('/')}
            style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, cursor: 'pointer' }}
          >
            Back to Home
          </span>
        </div>

      </div>
    </div>
  );
}

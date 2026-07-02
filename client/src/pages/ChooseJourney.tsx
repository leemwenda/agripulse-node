import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  {
    key: 'farmer',
    label: 'FARM OWNER',
    tagline: 'Grow & Manage',
    description: 'Your farm, fully digital. Register animals, track health, milk & breeding records, and sell directly from your dashboard.',
    features: ['Digital Animal Passports', 'Health & Milk Tracking', 'Breeding Management', 'Sell on Marketplace', 'Farm Analytics'],
    cta: 'Start as Farm Owner',
    path: '/register?role=farmer',
    accent: '#4ade80',
    glow: 'rgba(74,222,128,0.35)',
    border: 'rgba(74,222,128,0.25)',
    borderHover: 'rgba(74,222,128,0.6)',
    btnBg: 'linear-gradient(135deg, #15803d, #16a34a)',
    checkColor: '#4ade80',
  },
  {
    key: 'buyer',
    label: 'BUYER',
    tagline: 'Browse & Purchase',
    description: 'Find verified livestock with full passport history. Chat with farmers, negotiate prices, and complete secure ownership transfers.',
    features: ['Browse Live Listings', 'View Full Animal Passports', 'Direct Farmer Messaging', 'Secure Ownership Transfer', 'Purchase History'],
    cta: 'Start as Buyer',
    path: '/marketplace/signup',
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.4)',
    border: 'rgba(34,211,238,0.25)',
    borderHover: 'rgba(34,211,238,0.65)',
    btnBg: 'linear-gradient(135deg, #0e7490, #0891b2)',
    checkColor: '#22d3ee',
    featured: true,
  },
  {
    key: 'vet',
    label: 'VETERINARIAN',
    tagline: 'Treat & Verify',
    description: 'Access full animal health histories, record treatments and vaccinations, verify ownership transfers, and manage your client farms.',
    features: ['Animal Health Records', 'Vaccination Certificates', 'Transfer Verification', 'Client Farm Access', 'Appointment Management'],
    cta: 'Start as Veterinarian',
    path: '/vet/register',
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.35)',
    border: 'rgba(167,139,250,0.25)',
    borderHover: 'rgba(167,139,250,0.6)',
    btnBg: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
    checkColor: '#a78bfa',
  },
];

export default function ChooseJourney() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      overflow: 'hidden',
      background: '#020810',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Background image with dark overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundImage: `url('/farm-hero.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        opacity: 0.22,
      }} />

      {/* Dark gradient overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(2,8,16,0.7) 0%, rgba(2,8,16,0.5) 40%, rgba(2,8,16,0.85) 100%)',
      }} />

      {/* Ambient glow orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '15%', left: '8%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(21,128,61,0.12)', filter: 'blur(120px)',
        }} />
        <div style={{
          position: 'absolute', top: '25%', left: '35%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'rgba(34,211,238,0.10)', filter: 'blur(140px)',
        }} />
        <div style={{
          position: 'absolute', top: '15%', right: '8%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(109,40,217,0.12)', filter: 'blur(120px)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 52 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <img src="/agripulse-logo.png" alt="AgriPulse" style={{ width: 30, height: 30, borderRadius: 7 }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>AgriPulse</span>
          </div>

          {/* Big background text like the reference */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 'clamp(60px, 12vw, 130px)',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.04)',
              whiteSpace: 'nowrap',
              letterSpacing: -4,
              userSelect: 'none',
              zIndex: 0,
            }}>
              YOUR JOURNEY
            </div>
            <h1 style={{
              position: 'relative', zIndex: 1,
              color: '#fff', margin: 0,
              fontSize: 'clamp(28px, 4vw, 46px)',
              fontWeight: 900, letterSpacing: -1, lineHeight: 1.15,
            }}>
              Choose Your Journey
            </h1>
          </div>

          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 15, marginTop: 4, marginBottom: 0,
            maxWidth: 480, lineHeight: 1.6,
          }}>
            One platform. Three paths. All connected through verified digital animal passports.
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          width: '100%',
          alignItems: 'center',
        }}>
          {ROLES.map(role => {
            const isHovered = hovered === role.key;
            const isFeatured = role.featured;
            return (
              <div
                key={role.key}
                onMouseEnter={() => setHovered(role.key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(role.path)}
                style={{
                  position: 'relative',
                  borderRadius: 24,
                  padding: isFeatured ? '36px 28px' : '30px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 22,
                  cursor: 'pointer',
                  transition: 'all 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
                  transform: isFeatured
                    ? isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(-6px) scale(1.01)'
                    : isHovered ? 'translateY(-6px)' : 'translateY(0)',

                  // Glass effect
                  background: isHovered
                    ? `linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))`
                    : `linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))`,
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  border: `1px solid ${isHovered ? role.borderHover : role.border}`,
                  boxShadow: isHovered
                    ? `0 0 60px ${role.glow}, 0 0 120px ${role.glow.replace('0.35', '0.15')}, inset 0 1px 0 rgba(255,255,255,0.15), 0 24px 48px rgba(0,0,0,0.5)`
                    : isFeatured
                      ? `0 0 40px ${role.glow}, inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 32px rgba(0,0,0,0.4)`
                      : `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.3)`,
                  overflow: 'hidden',
                }}
              >
                {/* Inner shimmer top line */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: '10%', right: '10%',
                  height: 1,
                  background: `linear-gradient(to right, transparent, ${role.accent}60, transparent)`,
                  zIndex: 1,
                }} />

                {/* Glow blob inside card */}
                <div style={{
                  position: 'absolute',
                  top: -40, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 200, height: 200,
                  borderRadius: '50%',
                  background: role.glow,
                  filter: 'blur(60px)',
                  opacity: isHovered ? 0.6 : 0.3,
                  transition: 'opacity 0.35s ease',
                  zIndex: 0,
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Label badge */}
                  <div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: `rgba(255,255,255,0.06)`,
                      border: `1px solid ${role.border}`,
                      borderRadius: 8,
                      padding: '4px 12px',
                      marginBottom: 14,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: role.accent }} />
                      <span style={{ color: role.accent, fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>{role.label}</span>
                    </div>

                    <div style={{ color: '#fff', fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>
                      {role.tagline}
                    </div>
                  </div>

                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
                    {role.description}
                  </p>

                  {/* Divider */}
                  <div style={{ height: 1, background: `linear-gradient(to right, ${role.border}, transparent)` }} />

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {role.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: `rgba(255,255,255,0.05)`,
                          border: `1px solid ${role.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke={role.checkColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={e => { e.stopPropagation(); navigate(role.path); }}
                    style={{
                      marginTop: 6,
                      padding: '14px 20px',
                      borderRadius: 14,
                      border: `1px solid ${role.borderHover}`,
                      background: isHovered ? role.btnBg : `rgba(255,255,255,0.06)`,
                      color: '#fff',
                      fontSize: 14, fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      letterSpacing: 0.3,
                      width: '100%',
                      boxShadow: isHovered ? `0 4px 24px ${role.glow}` : 'none',
                    }}
                  >
                    {role.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Already have an account?</span>
          <span onClick={() => navigate('/login')} style={{ color: '#4ade80', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Sign in</span>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>·</span>
          <span onClick={() => navigate('/')} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, cursor: 'pointer' }}>Back to Home</span>
        </div>

      </div>
    </div>
  );
}

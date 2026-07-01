import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function VerifyEmail() {  useEffect(() => { document.title = 'Verify Email — AgriPulse'; }, []);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'resend'>('verifying');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new one.');
      return;
    }

    // Call the verify endpoint
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        const msg = err.response?.data?.error || 'This verification link is invalid or has expired.';
        setStatus('error');
        setMessage(msg);
      });
  }, [token]);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setResendSent(true);
    } catch {
      setResendSent(true); // Always show success to prevent enumeration
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#eef2ee',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img src="/agripulse-logo.png" alt="AgriPulse" width="56" height="56" style={{ borderRadius: '12px', marginBottom: '16px' }} />
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#0f1f0f' }}>AgriPulse</h1>
        <p style={{ margin: '0 0 32px', fontSize: '13px', color: '#9ca3af' }}>Smart Farm Management</p>

        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ color: '#111827', fontSize: '20px' }}>Verifying your email...</h2>
            <p style={{ color: '#6b7280' }}>Please wait while we activate your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ background: '#dcfce7', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✓</div>
            <h2 style={{ color: '#15803d', fontSize: '22px', margin: '0 0 12px' }}>Email Verified!</h2>
            <p style={{ color: '#374151', marginBottom: '28px' }}>Your AgriPulse account is now active. You can login and start managing your farm.</p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#1a6b3c',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Go to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ background: '#fee2e2', borderRadius: '50%', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✕</div>
            <h2 style={{ color: '#dc2626', fontSize: '20px', margin: '0 0 12px' }}>Verification Failed</h2>
            <p style={{ color: '#374151', marginBottom: '24px' }}>{message}</p>

            {!resendSent ? (
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>Enter your email to get a new verification link:</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '15px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleResend}
                  disabled={loading || !email}
                  style={{
                    background: loading ? '#9ca3af' : '#1a6b3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    width: '100%',
                  }}
                >
                  {loading ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', color: '#15803d', fontSize: '14px' }}>
                If that email is registered and unverified, a new link has been sent. Check your inbox.
              </div>
            )}

            <button
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer', marginTop: '16px' }}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

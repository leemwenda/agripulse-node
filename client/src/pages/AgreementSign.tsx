import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Pen } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function fmt(v: any) { return v ? `KSh ${Number(v).toLocaleString()}` : '—'; }

export default function AgreementSign() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const D = isDark
    ? { bg: '#0d1117', card: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)', text: '#e2ede6', text2: '#8aab94', text3: 'rgba(255,255,255,.3)' }
    : { bg: '#f9fafb', card: '#fff', border: '#e5e7eb', text: '#111827', text2: '#374151', text3: '#9ca3af' };

  useEffect(() => {
    setLoading(true);
    api.get(`/market-misc/agreements/${listingId}`)
      .then(r => setData(r.data))
      .catch(() => setError('Agreement not found or you are not authorised.'))
      .finally(() => setLoading(false));
  }, [listingId]);

  async function sign() {
    if (!signature.trim()) { setError('Please type your full name as your signature.'); return; }
    setSigning(true); setError('');
    try {
      const role = user?.id === data?.offer?.buyerId ? 'buyer' : 'seller';
      const res = await api.post(`/market-misc/agreements/${data.agreement.id}/sign`, { signature: signature.trim(), role });
      setData((prev: any) => ({ ...prev, agreement: res.data.agreement }));
      if (res.data.agreement.status === 'completed') {
        setMsg('Both parties have signed. Ownership has been transferred. The animal is now yours!');
      } else {
        setMsg('Your signature has been recorded. Waiting for the other party to sign.');
      }
      setSignature('');
    } catch (err: any) { setError(err?.response?.data?.error || 'Signing failed.'); }
    finally { setSigning(false); }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>Loading…</div>;

  const agreement = data?.agreement;
  const offer = data?.offer;
  const listing = agreement?.listing;
  const isBuyer = user?.id === offer?.buyerId;
  const isSeller = user?.id === listing?.sellerId;
  const hasSigned = isBuyer ? !!agreement?.buyerSignature : !!agreement?.sellerSignature;
  const otherSigned = isBuyer ? !!agreement?.sellerSignature : !!agreement?.buyerSignature;
  const completed = agreement?.status === 'completed';

  return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: '24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: D.text, margin: 0 }}>Sale Agreement</h1>
        </div>

        {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        {msg && <div style={{ padding: '12px 16px', background: isDark ? 'rgba(16,185,129,.1)' : '#f0fdf4', border: '1px solid rgba(16,185,129,.3)', borderRadius: 10, color: '#10b981', marginBottom: 16, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}><CheckCircle2 size={16} />{msg}</div>}

        {/* Agreement document */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: '28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${D.border}` }}>
            <FileText size={22} color="#15803d" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: D.text }}>Livestock Sale Agreement</div>
              <div style={{ fontSize: 12, color: D.text3 }}>AgriPulse Marketplace · Agreement #{agreement?.id}</div>
            </div>
            <span style={{
              marginLeft: 'auto', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: completed ? '#10b98122' : '#f59e0b22',
              color: completed ? '#10b981' : '#f59e0b',
              border: `1px solid ${completed ? '#10b98144' : '#f59e0b44'}`,
            }}>
              {completed ? 'COMPLETED' : agreement?.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['Animal', listing?.animal?.name],
              ['Breed', listing?.animal?.breed],
              ['AgriPulse ID', listing?.animal?.agripulseId],
              ['Agreed Price', fmt(agreement?.agreedPrice)],
              ['Location', listing?.county],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '10px 12px', background: isDark ? 'rgba(255,255,255,.03)' : '#f8fafc', borderRadius: 9, border: `1px solid ${D.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: D.text, marginTop: 3 }}>{value || '—'}</div>
              </div>
            ))}
          </div>

          {/* Signature status */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: "Buyer's Signature", signed: !!agreement?.buyerSignature, sig: agreement?.buyerSignature, date: agreement?.buyerSignedAt },
              { label: "Seller's Signature", signed: !!agreement?.sellerSignature, sig: agreement?.sellerSignature, date: agreement?.sellerSignedAt },
            ].map(({ label, signed, sig, date }) => (
              <div key={label} style={{ flex: 1, minWidth: 180, padding: '12px 14px', background: signed ? (isDark ? 'rgba(16,185,129,.08)' : '#f0fdf4') : (isDark ? 'rgba(255,255,255,.02)' : '#fafafa'), borderRadius: 10, border: `1px solid ${signed ? 'rgba(16,185,129,.3)' : D.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D.text3, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                {signed ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', fontStyle: 'italic' }}>{sig}</div>
                    <div style={{ fontSize: 11, color: D.text3, marginTop: 4 }}>{new Date(date).toLocaleDateString()}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: D.text3 }}>Awaiting signature</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sign form */}
        {!completed && !hasSigned && (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Pen size={16} color="#15803d" />
              <div style={{ fontWeight: 700, color: D.text, fontSize: 15 }}>Sign as {isBuyer ? 'Buyer' : 'Seller'}</div>
            </div>
            {otherSigned && <div style={{ fontSize: 13, color: '#10b981', marginBottom: 12 }}>The other party has already signed. Your signature will complete the agreement and transfer ownership.</div>}
            <p style={{ fontSize: 13, color: D.text2, marginBottom: 14, lineHeight: 1.6 }}>
              By typing your full name below you agree to the sale of <strong>{listing?.animal?.name}</strong> for <strong>{fmt(agreement?.agreedPrice)}</strong> and confirm the terms of this agreement.
            </p>
            <input
              value={signature} onChange={e => setSignature(e.target.value)}
              placeholder="Type your full name to sign"
              style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: `1px solid ${D.border}`, background: isDark ? 'rgba(255,255,255,.04)' : '#fff', color: D.text, fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' as const }}
            />
            <button onClick={sign} disabled={signing || !signature.trim()}
              style={{ width: '100%', height: 44, background: 'linear-gradient(135deg, #15803d, #16a34a)', color: '#fff', border: 'none', borderRadius: 11, fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: signing || !signature.trim() ? .6 : 1 }}>
              {signing ? 'Signing…' : 'Sign Agreement'}
            </button>
          </div>
        )}

        {hasSigned && !completed && (
          <div style={{ padding: '16px', background: isDark ? 'rgba(16,185,129,.08)' : '#f0fdf4', border: '1px solid rgba(16,185,129,.3)', borderRadius: 14, textAlign: 'center', color: '#10b981', fontSize: 14 }}>
            <CheckCircle2 size={20} style={{ margin: '0 auto 6px' }} />
            You have signed. Waiting for the {isBuyer ? 'seller' : 'buyer'} to sign.
          </div>
        )}

        {completed && (
          <div style={{ textAlign: 'center', padding: '24px', background: isDark ? 'rgba(16,185,129,.08)' : '#f0fdf4', border: '1px solid rgba(16,185,129,.3)', borderRadius: 14 }}>
            <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>Transfer Complete</div>
            <div style={{ fontSize: 13, color: D.text2, marginTop: 6 }}>Ownership has been transferred. Check the animal's passport for updated records.</div>
            <button onClick={() => navigate(`/animal/${listing?.animal?.agripulseId}`)}
              style={{ marginTop: 14, padding: '9px 20px', borderRadius: 10, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              View Animal Passport
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

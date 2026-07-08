import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const D = {
  bg: '#0d1117', card: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
  text: '#e2ede6', text2: '#8aab94', text3: 'rgba(255,255,255,.3)',
  green: '#10b981', greenLt: 'rgba(16,185,129,.12)',
  amber: '#f59e0b', amberLt: 'rgba(245,158,11,.12)',
  red: '#ef4444', redLt: 'rgba(239,68,68,.12)',
};

export default function VetVerifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vets, setVets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.role !== 'superadmin') { navigate('/dashboard'); return; }
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/vet-admin/all');
      setVets(r.data.vets || []);
    } catch {} finally { setLoading(false); }
  }

  async function setStatus(id: number, status: string) {
    setBusyId(id);
    try {
      await api.patch(`/vet-admin/${id}/verify`, { status });
      load();
    } catch {} finally { setBusyId(null); }
  }

  const pending = vets.filter(v => v.verificationStatus === 'pending');
  const verified = vets.filter(v => v.verificationStatus === 'verified');
  const rejected = vets.filter(v => v.verificationStatus === 'rejected');

  function VetCard({ v }: { v: any }) {
    return (
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, color: D.text, fontSize: 15 }}>{v.user?.name}</div>
          <div style={{ fontSize: 12, color: D.text2 }}>{v.user?.email} · {v.user?.county || 'No county'}</div>
          <div style={{ fontSize: 12, color: D.text3, marginTop: 4 }}>License: {v.licenseNumber || '—'} · {v.specialization || 'No specialization'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {v.verificationStatus !== 'verified' && (
            <button onClick={() => setStatus(v.id, 'verified')} disabled={busyId === v.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: D.green, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: busyId === v.id ? 0.5 : 1 }}>
              <CheckCircle2 size={14} /> Approve
            </button>
          )}
          {v.verificationStatus !== 'rejected' && (
            <button onClick={() => setStatus(v.id, 'rejected')} disabled={busyId === v.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${D.red}`, background: D.redLt, color: D.red, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: busyId === v.id ? 0.5 : 1 }}>
              <XCircle size={14} /> Reject
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate('/system')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${D.border}`, background: 'transparent', color: D.text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back to System
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: D.text, margin: 0 }}>Vet Verifications</h1>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: D.text3 }}>Loading…</div>
        ) : (
          <>
            {pending.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Clock size={16} color={D.amber} />
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Pending ({pending.length})</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pending.map(v => <VetCard key={v.id} v={v} />)}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ShieldCheck size={16} color={D.green} />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Verified ({verified.length})</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {verified.length === 0 ? <p style={{ color: D.text3, fontSize: 13 }}>No verified vets yet.</p> : verified.map(v => <VetCard key={v.id} v={v} />)}
              </div>
            </div>
            {rejected.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <XCircle size={16} color={D.red} />
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: D.text, margin: 0 }}>Rejected ({rejected.length})</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rejected.map(v => <VetCard key={v.id} v={v} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

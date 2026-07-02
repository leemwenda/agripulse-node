import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Stethoscope, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import { PageLoader } from '../components/ui';

const D = {
  pageBg: '#0d1117', cardBg: 'linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.01) 100%)',
  cardBorder: 'rgba(255,255,255,.07)', cardShadow: '0 4px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset',
  text: '#e2ede6', text2: '#8aab94', text3: '#4d6b57', green: '#10b981', greenLt: 'rgba(16,185,129,.12)',
  amber: '#f59e0b', amberLt: 'rgba(245,158,11,.12)',
};

export default function FindVet() {
  const [county, setCounty] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [vets, setVets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { search(); }, []);

  async function search() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (county) params.county = county;
      if (specialization) params.specialization = specialization;
      const res = await api.get('/vet/search', { params });
      setVets(res.data.vets || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const inputStyle = {
    padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)',
    border: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 14, outline: 'none', minWidth: 180,
  };

  return (
    <div style={{ padding: '24px', background: D.pageBg, minHeight: '100vh' }}>
      <h1 style={{ color: D.text, fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Find a Vet</h1>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 24 }}>
        <input style={inputStyle} placeholder="County (e.g. Kiambu)" value={county} onChange={e => setCounty(e.target.value)} />
        <input style={inputStyle} placeholder="Specialization (e.g. Dairy)" value={specialization} onChange={e => setSpecialization(e.target.value)} />
        <button onClick={search} style={{
          padding: '10px 20px', borderRadius: 8, background: D.green, color: '#fff',
          border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Search size={16} /> Search
        </button>
      </div>

      {loading ? <PageLoader /> : vets.length === 0 ? (
        <div style={{ color: D.text3, fontSize: 14 }}>No vets found. Try a different county or specialization.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 16 }}>
          {vets.map(v => (
            <Link key={v.id} to={`/vet/${v.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow,
                borderRadius: 14, padding: 18, height: '100%',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ color: D.text, fontWeight: 700, fontSize: 15 }}>{v.user?.name}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    background: v.verificationStatus === 'verified' ? D.greenLt : D.amberLt,
                    color: v.verificationStatus === 'verified' ? D.green : D.amber,
                  }}>
                    {v.verificationStatus === 'verified' ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
                {v.specialization && (
                  <div style={{ color: D.text2, fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Stethoscope size={14} /> {v.specialization}
                  </div>
                )}
                {v.user?.county && (
                  <div style={{ color: D.text2, fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} /> {v.user.county}
                  </div>
                )}
                {v.clinicName && <div style={{ color: D.text3, fontSize: 12, marginTop: 8 }}>{v.clinicName}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

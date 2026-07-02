import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface Passport {
  id: number;
  agripulseId: string;
  name: string;
  tagNumber: string;
  breed: string;
  gender: string;
  category: string;
  dateOfBirth: string;
  color: string;
  status: string;
  farm: { id: number; name: string; email: string };
  healthRecords: any[];
  milkProduction: any[];
  breeding: any[];
  weights: any[];
  photos: any[];
  ownershipTransfers: any[];
}

function formatAge(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months < 12) return `${months} Months`;
  return `${Math.floor(months / 12)} Years ${months % 12} Months`;
}

export default function AnimalPassport() {
  const { agripulseId } = useParams<{ agripulseId: string }>();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/passport/${agripulseId}`)
      .then(r => r.json())
      .then(data => {
        if (data.passport) setPassport(data.passport);
        else setError('Animal not found');
      })
      .catch(() => setError('Failed to load passport'))
      .finally(() => setLoading(false));
  }, [agripulseId]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
      <div style={{ color: '#15803d', fontSize: 18 }}>Loading passport...</div>
    </div>
  );

  if (error || !passport) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2' }}>
      <div style={{ color: '#dc2626', fontSize: 18 }}>{error || 'Not found'}</div>
    </div>
  );

  const vaccinations = passport.healthRecords.filter(h => h.vaccination);
  const treatments = passport.healthRecords.filter(h => h.treatment);
  const latestWeight = passport.weights[0];
  const lastVet = passport.healthRecords[0];

  // Build timeline
  const timeline: { date: string; label: string; type: string }[] = [];
  timeline.push({ date: passport.dateOfBirth, label: 'Animal Registered', type: 'Registration' });
  vaccinations.forEach(v => timeline.push({ date: v.recordDate, label: `Vaccinated (${v.vaccination})`, type: 'Health' }));
  treatments.forEach(t => timeline.push({ date: t.recordDate, label: `Treatment: ${t.treatment?.substring(0, 30)}`, type: 'Health' }));
  passport.weights.forEach(w => timeline.push({ date: w.recordDate, label: `Weight Recorded (${w.weightKg} kg)`, type: 'Weight' }));
  passport.breeding.forEach(b => timeline.push({ date: b.serviceDate, label: 'Artificial Insemination', type: 'Breeding' }));
  passport.breeding.filter(b => b.actualBirthDate).forEach(b => timeline.push({ date: b.actualBirthDate, label: 'Calved', type: 'Breeding' }));
  passport.ownershipTransfers.forEach(t => timeline.push({ date: t.completedAt, label: `Ownership Transferred to ${t.toFarm?.name}`, type: 'Ownership' }));
  timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const typeColor: Record<string, string> = {
    Registration: '#15803d', Health: '#0891b2', Weight: '#d97706',
    Breeding: '#7c3aed', Ownership: '#db2777', Marketplace: '#ea580c'
  };

  const s = {
    page: { background: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#1e293b' },
    container: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
    card: { background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16, overflow: 'hidden' as const },
    header: { background: 'linear-gradient(135deg, #15803d, #166534)', color: '#fff', padding: 24 },
    sectionTitle: { fontSize: 14, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
    label: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
    value: { fontSize: 14, fontWeight: 600, color: '#1e293b' },
    badge: (color: string) => ({ background: color + '20', color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }),
    idBox: { background: '#166534', borderRadius: 8, padding: '8px 16px', display: 'inline-block', marginTop: 8 },
    ownerBar: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  };

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={s.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#86efac', marginBottom: 4 }}> AgriPulse · Digital Animal Passport</div>
                <div style={{ fontSize: 32, fontWeight: 800 }}>{passport.name.toUpperCase()}</div>
                <div style={{ fontSize: 14, color: '#bbf7d0', marginTop: 4 }}>
                  {passport.breed} · {passport.gender === 'female' ? '' : ''} · {passport.category?.replace('_', ' ')}
                </div>
                <div style={s.idBox}>
                  <div style={{ fontSize: 10, color: '#86efac' }}>AgriPulse ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700 }}>{passport.agripulseId}</div>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: 8, textAlign: 'center' as const }}>
                <div style={{ fontSize: 10, color: '#15803d', fontWeight: 700, marginBottom: 4 }}> VERIFIED</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>by AgriPulse</div>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
              {[
                { label: 'Status', value: passport.status.toUpperCase(), color: '#4ade80' },
                { label: 'Breed', value: passport.breed },
                { label: 'Date of Birth', value: new Date(passport.dateOfBirth).toLocaleDateString() },
                { label: 'Age', value: formatAge(passport.dateOfBirth) },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#86efac' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color || '#fff' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Owner bar */}
            <div style={s.ownerBar}>
              <div>
                <div style={{ fontSize: 11, color: '#15803d' }}>Current Owner</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#14532d' }}>{passport.farm.name}</div>
              </div>
              <span style={s.badge('#15803d')}> Verified Owner</span>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}> 1. Identity</div>
            <div style={s.grid3}>
              {[
                { label: 'Tag Number', value: passport.tagNumber },
                { label: 'Breed', value: passport.breed },
                { label: 'Category', value: passport.category?.replace('_', ' ') || '—' },
                { label: 'Gender', value: passport.gender === 'female' ? 'Female ' : 'Male ' },
                { label: 'Date of Birth', value: new Date(passport.dateOfBirth).toLocaleDateString() },
                { label: 'Age', value: formatAge(passport.dateOfBirth) },
                { label: 'Color', value: passport.color || '—' },
                { label: 'Country', value: 'Kenya' },
                { label: 'Status', value: passport.status.toUpperCase() },
              ].map((item, i) => (
                <div key={i}>
                  <div style={s.label}>{item.label}</div>
                  <div style={s.value}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}>️ 3. Health Passport</div>
            <div style={s.grid3}>
              <div>
                <div style={s.label}>Vaccinations ({vaccinations.length})</div>
                {vaccinations.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>None recorded</div> :
                  vaccinations.slice(0, 4).map((v, i) => <div key={i} style={{ fontSize: 13, color: '#15803d' }}> {v.vaccination}</div>)}
              </div>
              <div>
                <div style={s.label}>Treatments ({treatments.length})</div>
                {treatments.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>None recorded</div> :
                  treatments.slice(0, 3).map((t, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#1e293b' }}>
                       {t.condition}
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(t.recordDate).toLocaleDateString()}</div>
                    </div>
                  ))}
              </div>
              <div>
                <div style={s.label}>Last Vet Visit</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{lastVet ? new Date(lastVet.recordDate).toLocaleDateString() : '—'}</div>
                <div style={s.label}>Health Status</div>
                <span style={s.badge('#15803d')}>Healthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breeding */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}> 4. Breeding History</div>
            {passport.breeding.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No breeding records</div>
            ) : (
              <div style={s.grid3}>
                {[
                  { label: 'Total Services', value: passport.breeding.length },
                  { label: 'Pregnancies', value: passport.breeding.filter(b => b.pregnancyStatus === 'pregnant' || b.pregnancyStatus === 'gave_birth').length },
                  { label: 'Calvings', value: passport.breeding.filter(b => b.actualBirthDate).length },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={s.label}>{item.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Milk Production */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}> 5. Production History</div>
            {passport.milkProduction.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No milk production records</div>
            ) : (
              <div style={s.grid3}>
                {(() => {
                  const total = passport.milkProduction.reduce((sum, m) => sum + parseFloat(m.quantityLiters), 0);
                  const avg = total / passport.milkProduction.length;
                  const max = Math.max(...passport.milkProduction.map(m => parseFloat(m.quantityLiters)));
                  return [
                    { label: 'Total Records', value: passport.milkProduction.length },
                    { label: 'Average / Day', value: `${avg.toFixed(1)} L` },
                    { label: 'Highest Yield', value: `${max.toFixed(1)} L` },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={s.label}>{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0891b2' }}>{item.value}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Weight */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}>️ 6. Weight History</div>
            {passport.weights.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No weight records</div>
            ) : (
              <div style={s.grid3}>
                {(() => {
                  const max = Math.max(...passport.weights.map(w => parseFloat(w.weightKg)));
                  return [
                    { label: 'Current Weight', value: `${latestWeight?.weightKg} kg` },
                    { label: 'Highest Weight', value: `${max} kg` },
                    { label: 'Last Recorded', value: latestWeight ? new Date(latestWeight.recordDate).toLocaleDateString() : '—' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={s.label}>{item.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#d97706' }}>{item.value}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Ownership History */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}> 2. Ownership History</div>
            {passport.ownershipTransfers.length === 0 ? (
              <div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>No transfers — original owner</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {['#', 'From', 'To', 'Date', 'Method'].map(h => (
                      <th key={h} style={{ textAlign: 'left' as const, padding: '8px 0', color: '#94a3b8', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {passport.ownershipTransfers.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 0', color: '#94a3b8' }}>{i + 1}</td>
                      <td style={{ padding: '8px 0', fontWeight: 600 }}>{t.fromFarm?.name}</td>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: '#15803d' }}>{t.toFarm?.name}</td>
                      <td style={{ padding: '8px 0', color: '#94a3b8' }}>{new Date(t.completedAt).toLocaleDateString()}</td>
                      <td style={{ padding: '8px 0' }}><span style={s.badge('#15803d')}>{t.method}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}></span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Verified Ownership Chain</div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>This animal's ownership history is verified and cannot be altered.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={s.card}>
          <div style={{ padding: 20 }}>
            <div style={s.sectionTitle}> Timeline</div>
            <div style={{ position: 'relative' as const }}>
              {timeline.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: typeColor[item.type] || '#94a3b8', marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                    <div style={{ fontSize: 13 }}>{item.label}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(item.date).toLocaleDateString()}</span>
                      <span style={s.badge(typeColor[item.type] || '#94a3b8')}>{item.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#14532d', color: '#fff', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}> VERIFIED BY AGRIPULSE</div>
            <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>All records are authenticated and cannot be altered.</div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: 11, color: '#86efac' }}>Passport ID</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{passport.agripulseId}</div>
            <div style={{ fontSize: 11, color: '#86efac', marginTop: 4 }}>Generated {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center' as const, marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
           Trusted Records · Verified Ownership · Better Decisions · Stronger Farming
        </div>

      </div>
    </div>
  );
}

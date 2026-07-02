import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { PageLoader } from '../components/ui';
import { Trash2 } from 'lucide-react';

const D = {
  pageBg: '#0d1117', cardBg: 'linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.01) 100%)',
  cardBorder: 'rgba(255,255,255,.07)', cardShadow: '0 4px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset',
  text: '#e2ede6', text2: '#8aab94', text3: '#4d6b57', green: '#10b981', greenLt: 'rgba(16,185,129,.12)',
  amber: '#f59e0b', red: '#ef4444',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,.04)',
  border: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 14, outline: 'none',
};
const labelStyle = { color: D.text2, fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' as const };

export default function VetProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    licenseNumber: '', specialization: '', clinicName: '', bio: '',
    yearsExperience: '', consultationFee: '',
  });
  const [slots, setSlots] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState({ date: '', startTime: '', endTime: '' });
  const [addingSlot, setAddingSlot] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const p = await api.get('/vet/profile/me');
      if (p.data.profile) {
        const pr = p.data.profile;
        setForm({
          licenseNumber: pr.licenseNumber || '', specialization: pr.specialization || '',
          clinicName: pr.clinicName || '', bio: pr.bio || '',
          yearsExperience: pr.yearsExperience?.toString() || '', consultationFee: pr.consultationFee?.toString() || '',
        });
      }
      const s = await api.get('/vet/slots/mine');
      setSlots(s.data.slots || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function saveProfile() {
    if (!form.licenseNumber) { setMsg('License number is required.'); return; }
    setSaving(true); setMsg('');
    try {
      await api.post('/vet/profile', {
        ...form,
        yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
        consultationFee: form.consultationFee ? parseFloat(form.consultationFee) : null,
      });
      setMsg('Profile saved. You are now visible in vet search (Pending Verification).');
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed to save profile.'); }
    finally { setSaving(false); }
  }

  async function addSlot() {
    if (!newSlot.date || !newSlot.startTime || !newSlot.endTime) return;
    setAddingSlot(true);
    try {
      await api.post('/vet/slots', newSlot);
      setNewSlot({ date: '', startTime: '', endTime: '' });
      load();
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed to add slot.'); }
    finally { setAddingSlot(false); }
  }

  async function removeSlot(id: number) {
    try { await api.delete(`/vet/slots/${id}`); load(); }
    catch (err: any) { setMsg(err?.response?.data?.error || 'Failed to remove slot.'); }
  }

  if (user && user.role !== 'vet') {
    return <div style={{ padding: 40, color: D.text }}>This page is for vet accounts only.</div>;
  }
  if (loading) return <PageLoader />;

  return (
    <div style={{ padding: '24px', background: D.pageBg, minHeight: '100vh' }}>
      <h1 style={{ color: D.text, fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Vet Profile & Availability</h1>

      {msg && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: D.greenLt, color: D.green, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow, borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ color: D.text, fontWeight: 700, marginBottom: 16 }}>Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
          <div>
            <label style={labelStyle}>License Number *</label>
            <input style={inputStyle} value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Specialization</label>
            <input style={inputStyle} placeholder="e.g. Large animal, Dairy cattle" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Clinic Name</label>
            <input style={inputStyle} value={form.clinicName} onChange={e => setForm({ ...form, clinicName: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Years of Experience</label>
            <input style={inputStyle} type="number" value={form.yearsExperience} onChange={e => setForm({ ...form, yearsExperience: e.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Consultation Fee (KES)</label>
            <input style={inputStyle} type="number" value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Bio</label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
        </div>
        <button onClick={saveProfile} disabled={saving} style={{
          marginTop: 16, padding: '10px 20px', borderRadius: 8, background: D.green, color: '#fff',
          border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow, borderRadius: 14, padding: 20 }}>
        <div style={{ color: D.text, fontWeight: 700, marginBottom: 16 }}>Availability Slots</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 16 }}>
          <input style={{ ...inputStyle, width: 160 }} type="date" value={newSlot.date} onChange={e => setNewSlot({ ...newSlot, date: e.target.value })} />
          <input style={{ ...inputStyle, width: 130 }} type="time" value={newSlot.startTime} onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })} />
          <input style={{ ...inputStyle, width: 130 }} type="time" value={newSlot.endTime} onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })} />
          <button onClick={addSlot} disabled={addingSlot} style={{
            padding: '10px 18px', borderRadius: 8, background: D.green, color: '#fff',
            border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            Add Slot
          </button>
        </div>
        {slots.length === 0 ? (
          <div style={{ color: D.text3, fontSize: 13 }}>No availability slots yet.</div>
        ) : (
          slots.map(s => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0',
              borderTop: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 13,
            }}>
              <span>
                {new Date(s.date).toLocaleDateString()} · {s.startTime}–{s.endTime}
                {s.isBooked && <span style={{ color: D.amber, marginLeft: 8 }}>Booked</span>}
              </span>
              {!s.isBooked && (
                <button onClick={() => removeSlot(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.red }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

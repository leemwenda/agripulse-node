import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Phone, AlertTriangle, CalendarClock } from 'lucide-react';
import api from '../lib/api';
import { PageLoader } from '../components/ui';

const D = {
  pageBg: '#0d1117', cardBg: 'linear-gradient(135deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.01) 100%)',
  cardBorder: 'rgba(255,255,255,.07)', cardShadow: '0 4px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset',
  text: '#e2ede6', text2: '#8aab94', text3: '#4d6b57', green: '#10b981', greenLt: 'rgba(16,185,129,.12)',
  amber: '#f59e0b', amberLt: 'rgba(245,158,11,.12)', red: '#ef4444', redLt: 'rgba(239,68,68,.12)',
};

export default function VetProfilePublic() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [emergencyContact, setEmergencyContact] = useState<{ name: string; phone: string | null } | null>(null);
  const [sendingEmergency, setSendingEmergency] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const p = await api.get(`/vet/${id}`);
      setProfile(p.data.profile);
      const s = await api.get(`/vet/slots/available/${id}`);
      setSlots(s.data.slots || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function book(slotId: number) {
    if (!serviceType) { setMsg('Please describe the service needed.'); return; }
    try {
      await api.post('/vet/appointments', { slotId, serviceType, notes });
      setMsg('Appointment requested. The vet will confirm shortly.');
      setBookingSlot(null); setServiceType(''); setNotes('');
      load();
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed to book appointment.'); }
  }

  async function sendEmergency() {
    if (!emergencyMsg) return;
    setSendingEmergency(true);
    try {
      const res = await api.post('/vet/emergency', { vetId: id, message: emergencyMsg });
      setEmergencyContact(res.data.vetContact);
    } catch (err: any) { setMsg(err?.response?.data?.error || 'Failed to send emergency alert.'); }
    finally { setSendingEmergency(false); }
  }

  if (loading) return <PageLoader />;
  if (!profile) return <div style={{ padding: 40, color: D.text }}>Vet not found.</div>;

  return (
    <div style={{ padding: '24px', background: D.pageBg, minHeight: '100vh' }}>
      <div style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow, borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: D.text, fontSize: 20, fontWeight: 700 }}>{profile.user?.name}</div>
            {profile.specialization && <div style={{ color: D.text2, fontSize: 14, marginTop: 4 }}>{profile.specialization}</div>}
            {profile.user?.county && (
              <div style={{ color: D.text2, fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> {profile.user.county}
              </div>
            )}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
            background: profile.verificationStatus === 'verified' ? D.greenLt : D.amberLt,
            color: profile.verificationStatus === 'verified' ? D.green : D.amber,
          }}>
            {profile.verificationStatus === 'verified' ? 'Verified' : 'Pending Verification'}
          </span>
        </div>
        {profile.bio && <div style={{ color: D.text2, fontSize: 13, marginTop: 14 }}>{profile.bio}</div>}

        <button onClick={() => setShowEmergency(!showEmergency)} style={{
          marginTop: 16, padding: '10px 18px', borderRadius: 8, background: D.redLt, color: D.red,
          border: `1px solid ${D.red}33`, fontWeight: 600, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={16} /> Emergency Contact
        </button>

        {showEmergency && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: D.redLt, border: `1px solid ${D.red}22` }}>
            {emergencyContact ? (
              <div style={{ color: D.text, fontSize: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Alert sent to {emergencyContact.name}</div>
                {emergencyContact.phone ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: D.green }}>
                    <Phone size={14} /> {emergencyContact.phone}
                  </div>
                ) : (
                  <div style={{ color: D.text3 }}>No phone number on file — check back for their in-app response.</div>
                )}
              </div>
            ) : (
              <>
                <textarea
                  placeholder="Describe the emergency..."
                  value={emergencyMsg}
                  onChange={e => setEmergencyMsg(e.target.value)}
                  style={{
                    width: '100%', minHeight: 70, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,.04)',
                    border: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 13, resize: 'vertical' as const,
                  }}
                />
                <button onClick={sendEmergency} disabled={sendingEmergency} style={{
                  marginTop: 10, padding: '9px 16px', borderRadius: 8, background: D.red, color: '#fff',
                  border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  {sendingEmergency ? 'Sending...' : 'Send Emergency Alert'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow, borderRadius: 14, padding: 20 }}>
        <div style={{ color: D.text, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={18} /> Available Slots
        </div>
        {msg && <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: D.greenLt, color: D.green, fontSize: 13 }}>{msg}</div>}
        {slots.length === 0 ? (
          <div style={{ color: D.text3, fontSize: 13 }}>No open slots right now.</div>
        ) : (
          slots.map(s => (
            <div key={s.id} style={{ borderTop: `1px solid ${D.cardBorder}`, padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: D.text, fontSize: 13 }}>
                  {new Date(s.date).toLocaleDateString()} · {s.startTime}–{s.endTime}
                </span>
                <button onClick={() => setBookingSlot(bookingSlot === s.id ? null : s.id)} style={{
                  padding: '6px 14px', borderRadius: 8, background: D.green, color: '#fff',
                  border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}>
                  {bookingSlot === s.id ? 'Cancel' : 'Book'}
                </button>
              </div>
              {bookingSlot === s.id && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <input
                    placeholder="Service needed (e.g. Vaccination, General checkup)"
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    style={{ padding: 9, borderRadius: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 13 }}
                  />
                  <textarea
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ padding: 9, borderRadius: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 13, minHeight: 50 }}
                  />
                  <button onClick={() => book(s.id)} style={{
                    padding: '9px 16px', borderRadius: 8, background: D.green, color: '#fff',
                    border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start',
                  }}>
                    Confirm Booking
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

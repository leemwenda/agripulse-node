import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, CheckCircle2, XCircle, Stethoscope } from 'lucide-react';
import api from '../lib/api';
import { useTheme } from '../context/ThemeContext';

function fmtDate(d: any) { return d ? new Date(d).toLocaleDateString() : '—'; }

function StatusPill({ status, D }: { status: string; D: any }) {
  const map: any = {
    confirmed: { bg: D.amberLt, color: D.amber, label: 'Confirmed' },
    completed: { bg: D.greenLt, color: D.green, label: 'Completed' },
    cancelled: { bg: D.redLt, color: D.red, label: 'Cancelled' },
  };
  const s = map[status] || map.confirmed;
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function ReviewForm({ appointment, D, onSubmitted }: any) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/vet-reviews', { appointmentId: appointment.id, rating, comment: comment.trim() || undefined });
      onSubmitted(appointment.id);
    } catch (err: any) { setError(err?.response?.data?.error || 'Failed to submit review.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: D.cardBg2, border: `1px solid ${D.cardBorder}` }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: D.text, marginBottom: 8 }}>Leave a Review</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Star size={24} color="#f59e0b" fill={(hoverRating || rating) >= n ? '#f59e0b' : 'none'} />
          </button>
        ))}
      </div>
      <textarea
        value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Share your experience (optional)"
        style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${D.cardBorder}`, color: D.text, fontSize: 13, resize: 'vertical' as const, marginBottom: 8 }}
      />
      {error && <div style={{ color: D.red, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <button onClick={submit} disabled={submitting} style={{ padding: '8px 18px', borderRadius: 8, background: D.green, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}

export default function MyVetAppointments() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reviewOpenId, setReviewOpenId] = useState<number | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const D = {
    bg: isDark ? '#0d1117' : '#f9fafb',
    cardBg: isDark ? 'rgba(255,255,255,.04)' : '#fff',
    cardBg2: isDark ? 'rgba(255,255,255,.03)' : '#f8fafc',
    cardBorder: isDark ? 'rgba(255,255,255,.08)' : '#e5e7eb',
    text: isDark ? '#e2ede6' : '#111827',
    text2: isDark ? '#8aab94' : '#374151',
    text3: isDark ? 'rgba(255,255,255,.3)' : '#9ca3af',
    green: '#10b981', greenLt: isDark ? 'rgba(16,185,129,.12)' : '#f0fdf4',
    amber: '#f59e0b', amberLt: isDark ? 'rgba(245,158,11,.12)' : '#fffbeb',
    red: '#ef4444', redLt: isDark ? 'rgba(239,68,68,.12)' : '#fef2f2',
  };

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/vet/appointments/mine');
      setAppointments(r.data.appointments || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleCancel(apptId: number) {
    if (!window.confirm('Cancel this appointment? This cannot be undone.')) return;
    setCancellingId(apptId);
    try {
      await api.patch(`/vet/appointments/${apptId}/cancel`);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  }

  function handleReviewSubmitted(appointmentId: number) {
    setReviewOpenId(null);
    setReviewedIds(prev => new Set(prev).add(appointmentId));
  }

  const filtered = filter === 'all' ? appointments : appointments.filter((a: any) => a.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: D.bg, padding: '24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${D.cardBorder}`, background: 'transparent', color: D.text2, cursor: 'pointer', fontSize: 14 }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: D.text, margin: 0 }}>My Vet Appointments</h1>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' as const }}>
          {['all', 'confirmed', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${D.cardBorder}`, background: filter === f ? D.green : D.cardBg, color: filter === f ? '#fff' : D.text2, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' as const }}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: D.text3 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: D.cardBg, border: `1px solid ${D.cardBorder}`, borderRadius: 16 }}>
            <Stethoscope size={36} color={D.text3} style={{ margin: '0 auto 12px' }} />
            <p style={{ color: D.text, fontWeight: 700, marginBottom: 6 }}>
              {appointments.length === 0 ? 'No vet appointments yet' : 'No appointments match this filter'}
            </p>
            {appointments.length === 0 && (
              <>
                <p style={{ color: D.text2, fontSize: 13, marginBottom: 20 }}>Find a vet and book your first appointment.</p>
                <button onClick={() => navigate('/find-vet')}
                  style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: D.green, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  Find a Vet
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((a: any) => {
              const alreadyReviewed = !!a.review || reviewedIds.has(a.id);
              const canReview = a.status === 'completed' && !alreadyReviewed;
              const canCancel = a.status === 'confirmed';
              return (
                <div key={a.id} style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' as const }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: D.text }}>{a.vet?.user?.name || 'Veterinarian'}</div>
                      <div style={{ fontSize: 13, color: D.text2, marginTop: 2 }}>{a.serviceType}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.text3, marginTop: 6 }}>
                        <Calendar size={13} /> {fmtDate(a.slot?.date)} · {a.slot?.startTime}–{a.slot?.endTime}
                      </div>
                    </div>
                    <StatusPill status={a.status} D={D} />
                  </div>

                  {a.notes && <div style={{ fontSize: 13, color: D.text2, marginTop: 10, fontStyle: 'italic' }}>"{a.notes}"</div>}

                  {alreadyReviewed && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: D.green, fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Reviewed
                    </div>
                  )}

                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {canCancel && (
                      <button onClick={() => handleCancel(a.id)} disabled={cancellingId === a.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.red}`, background: D.redLt, color: D.red, fontWeight: 700, fontSize: 12, cursor: cancellingId === a.id ? 'not-allowed' : 'pointer', opacity: cancellingId === a.id ? 0.6 : 1 }}>
                        <XCircle size={13} /> {cancellingId === a.id ? 'Cancelling…' : 'Cancel Appointment'}
                      </button>
                    )}
                    {canReview && reviewOpenId !== a.id && (
                      <button onClick={() => setReviewOpenId(a.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${D.amber}`, background: D.amberLt, color: D.amber, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <Star size={13} /> Leave a Review
                      </button>
                    )}
                  </div>

                  {reviewOpenId === a.id && (
                    <ReviewForm appointment={a} D={D} onSubmitted={handleReviewSubmitted} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

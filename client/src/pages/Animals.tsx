import { useEffect, useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Beef, ArrowRightLeft, X } from 'lucide-react';
import api from '../lib/api';
import { Animal, AnimalCategory } from '../types';
import { Modal, ConfirmDialog, EmptyState, PageLoader, Spinner } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui';
import { format } from 'date-fns';
import { getBreedingStage } from '../lib/breedingStage';
import {
  getAnimalCategory,
  getAgeMonths,
  formatAge,
  getCalfFeedingStage,
} from '../lib/animalUtils';

const EMPTY: Partial<Animal> = {
  name: '', tagNumber: '', breed: '', gender: 'female',
  dateOfBirth: '', color: '', notes: '', status: 'active',
};

const statusBadge = (s: string) =>
  ({ active: 'badge-green', sold: 'badge-yellow', deceased: 'badge-red' }[s] || 'badge-gray');

// Category tab definitions
const CATEGORY_TABS: Array<{ key: AnimalCategory | 'All'; label: string }> = [
  { key: 'All',    label: 'All'     },
  { key: 'Calf',   label: 'Calves'  },
  { key: 'Heifer', label: 'Heifers' },
  { key: 'Cow',    label: 'Cows'    },
  { key: 'Bull',   label: 'Bulls'   },
];

function categoryBadgeStyle(cat: AnimalCategory): React.CSSProperties {
  const map: Record<AnimalCategory, { color: string; bg: string }> = {
    Calf:   { color: '#3b82f6', bg: 'rgba(59,130,246,.12)'  },
    Heifer: { color: '#8b5cf6', bg: 'rgba(139,92,246,.12)'  },
    Cow:    { color: '#10b981', bg: 'rgba(16,185,129,.12)'  },
    Bull:   { color: '#f59e0b', bg: 'rgba(245,158,11,.12)'  },
  };
  const { color, bg } = map[cat];
  return {
    display: 'inline-block', padding: '2px 9px', borderRadius: 999,
    fontSize: 11, fontWeight: 700, border: `1px solid ${color}40`,
    background: bg, color,
  };
}

export function AnimalsPage() {
  useEffect(() => { document.title = 'Animal Records — AgriPulse'; }, []);

  const [animals, setAnimals]           = useState<Animal[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryTab, setCategoryTab]   = useState<AnimalCategory | 'All'>('All');
  const [form, setForm]                 = useState<Partial<Animal>>(EMPTY);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [saving, setSaving]             = useState(false);
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [showAccept, setShowAccept]     = useState(false);
  const [acceptCode, setAcceptCode]     = useState('');
  const [acceptPreview, setAcceptPreview] = useState<any>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [acceptError, setAcceptError]   = useState('');
  const [acceptSigMode, setAcceptSigMode] = useState<'type'|'draw'>('type');
  const [acceptSigName, setAcceptSigName] = useState('');
  const [acceptSigData, setAcceptSigData] = useState('');
  const acceptSigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  async function lookupTransferCode() {
    if (!acceptCode.trim()) return;
    setAcceptLoading(true);
    setAcceptError('');
    setAcceptPreview(null);
    try {
      const res = await api.get(`/passport/transfer/${acceptCode.trim().toUpperCase()}`);
      setAcceptPreview({
        animal: res.data.transfer.animal,
        fromFarm: res.data.transfer.fromFarm,
      });
    } catch (err: any) {
      setAcceptError(err?.response?.data?.error || 'Transfer code not found.');
    } finally {
      setAcceptLoading(false);
    }
  }

  function getAcceptSignature(): string {
    if (acceptSigMode === 'type' && acceptSigName.trim()) {
      const c = document.createElement('canvas'); c.width = 300; c.height = 80;
      const ctx = c.getContext('2d'); if (!ctx) return '';
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 80);
      ctx.font = 'italic 32px Georgia'; ctx.fillStyle = '#15803d';
      ctx.fillText(acceptSigName, 10, 52);
      return c.toDataURL();
    }
    return acceptSigData;
  }

  async function submitAcceptTransfer() {
    const sig = getAcceptSignature();
    if (!sig) { toast.error('Please sign before accepting.'); return; }
    setAcceptSubmitting(true);
    try {
      const res = await api.post('/passport/transfer/accept', {
        transferCode: acceptCode.trim().toUpperCase(),
        buyerSignature: sig,
      });
      toast.success(`${res.data.animal?.name || 'Animal'} is now in your account.`);
      setShowAccept(false);
      setAcceptCode(''); setAcceptPreview(null); setAcceptSigName(''); setAcceptSigData('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to accept transfer.');
    } finally {
      setAcceptSubmitting(false);
    }
  }
  const { toasts, toast, remove }       = useToast();
  const navigate                        = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/animals?${params}`);
      setAnimals(data.animals);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, statusFilter]);

  function openAdd() { setForm(EMPTY); setEditId(null); setPhotoFile(null); setModalOpen(true); }
  function openEdit(a: Animal) {
    setForm({ ...a, dateOfBirth: a.dateOfBirth.split('T')[0] });
    setEditId(a.id);
    setPhotoFile(null);
    setModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        const payload = {
          name: form.name,
          tagNumber: form.tagNumber,
          breed: form.breed,
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          color: form.color || null,
          notes: form.notes || null,
          status: form.status,
        };
        await api.put(`/animals/${editId}`, payload);
        if (photoFile) {
          const fd = new FormData();
          fd.append("photo", photoFile);
          fd.append("isPrimary", "true");
          await api.post(`/animals/${editId}/photos`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        }
        toast.success('Animal updated.');
      } else {
        const res = await api.post(`/animals`, form);
        if (photoFile && res.data?.animal?.id) {
          const fd = new FormData();
          fd.append("photo", photoFile);
          fd.append("isPrimary", "true");
          await api.post(`/animals/${res.data.animal.id}/photos`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        }
        toast.success('Animal added.');
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.delete(`/animals/${deleteId}`);
      toast.success('Animal deleted.');
      setDeleteId(null);
      load();
    } catch {
      toast.error('Delete failed.');
    } finally {
      setSaving(false);
    }
  }

  // Derive category for each animal and apply tab filter
  const animalsWithCategory = animals.map(a => ({
    ...a,
    _category: getAnimalCategory(
      a.dateOfBirth,
      a.gender,
      a.latestBreeding?.pregnancyStatus === 'gave_birth',
    ),
  }));

  const filtered = categoryTab === 'All'
    ? animalsWithCategory
    : animalsWithCategory.filter(a => a._category === categoryTab);

  // Category counts for tab badges
  const counts = animalsWithCategory.reduce<Record<string, number>>((acc, a) => {
    acc[a._category] = (acc[a._category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-in">
      <ToastContainer toasts={toasts} remove={remove} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Animals</h1>
          <p className="text-sm text-gray-500">{total} total animals</p>
        </div>
        <button onClick={() => setShowAccept(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/8 text-blue-500 text-sm font-semibold hover:bg-blue-500/15 transition-colors">
        <ArrowRightLeft className="w-4 h-4" /> Accept Transfer
      </button>
      <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Animal</button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORY_TABS.map(tab => {
          const count = tab.key === 'All' ? animals.length : (counts[tab.key] || 0);
          const active = categoryTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setCategoryTab(tab.key)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                border: active ? '1.5px solid #6366f1' : '1.5px solid transparent',
                background: active ? 'rgba(99,102,241,.13)' : 'rgba(255,255,255,.04)',
                color: active ? '#818cf8' : '#8aab94',
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 11,
                  color: active ? '#818cf8' : '#4d6b57',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, tag or breed..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-full sm:w-40"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
          <option value="deceased">Deceased</option>
        </select>
      </div>

      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState
          icon={<Beef className="w-8 h-8" />}
          title="No animals found"
          description="Add your first animal to get started."
          action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Animal</button>}
        />
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Tag #</th>
                <th>Breed</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Category</th>
                <th>Stage / Feeding</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const ageMonths    = getAgeMonths(a.dateOfBirth);
                const feedingStage = getCalfFeedingStage(a.dateOfBirth);
                const breedStage   = getBreedingStage(a.latestBreeding || null, a.dateOfBirth, a.gender);

                return (
                  <tr
                    key={a.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/animals/${a.id}`)}
                  >
                    <td className="font-medium">{a.name}</td>
                    <td className="text-gray-500 font-mono text-xs">{a.tagNumber}</td>
                    <td>{a.breed}</td>
                    <td className="capitalize">{a.gender}</td>

                    {/* Age — replaces static DOB display with both DOB tooltip + age */}
                    <td>
                      <span
                        title={format(new Date(a.dateOfBirth), 'dd MMM yyyy')}
                        style={{ cursor: 'help', fontSize: 13 }}
                      >
                        {formatAge(a.dateOfBirth)}
                      </span>
                    </td>

                    {/* Category badge */}
                    <td>
                      <span style={categoryBadgeStyle(a._category)}>{a._category}</span>
                    </td>

                    {/* Stage / Feeding: calves show feeding recommendation, adults show breeding stage */}
                    <td>
                      {a._category === 'Calf' && feedingStage ? (
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                          border: `1px solid ${feedingStage.color}40`,
                          background: feedingStage.glowColor,
                          color: feedingStage.color,
                          whiteSpace: 'nowrap',
                        }}
                          title={feedingStage.recommendation}
                        >
                          {feedingStage.label}
                        </span>
                      ) : breedStage ? (
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                          border: `1px solid ${breedStage.color}40`,
                          background: breedStage.glowColor,
                          color: breedStage.color,
                          boxShadow: breedStage.urgent ? `0 0 8px ${breedStage.glowColor}` : undefined,
                          whiteSpace: 'nowrap',
                        }}>
                          {breedStage.stage}
                        </span>
                      ) : ageMonths >= 18 && a.gender === 'female' ? (
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                          border: '1px solid rgba(16,185,129,.4)',
                          background: 'rgba(16,185,129,.1)',
                          color: '#10b981',
                        }}>
                          Ready
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    <td><span className={statusBadge(a.status)}>{a.status}</span></td>

                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(a.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Calf feeding summary — shown only when Calves tab active */}
      {categoryTab === 'Calf' && filtered.length > 0 && (
        <div style={{
          borderRadius: 12,
          border: '1px solid rgba(59,130,246,.2)',
          background: 'rgba(59,130,246,.06)',
          padding: '14px 18px',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>
            Calf Feeding Guide
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
            {[
              { range: '0–3 months',   rec: '6 litres / day',       color: '#3b82f6' },
              { range: '3–6 months',   rec: '5 litres / day',       color: '#6366f1' },
              { range: '6–9 months',   rec: 'Weaning stage',        color: '#f59e0b' },
              { range: '9–18 months',  rec: 'Post-wean monitoring', color: '#10b981' },
            ].map(row => (
              <div key={row.range} style={{ fontSize: 11 }}>
                <span style={{ color: row.color, fontWeight: 700 }}>{row.range}</span>
                <span style={{ color: '#8aab94', marginLeft: 6 }}>{row.rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Animal' : 'Add Animal'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Tag Number *</label>
              <input className="input font-mono" value={form.tagNumber || ''} onChange={e => setForm(p => ({ ...p, tagNumber: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Breed *</label>
              <input className="input" value={form.breed || ''} onChange={e => setForm(p => ({ ...p, breed: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Gender *</label>
              <select className="input" value={form.gender || 'female'} onChange={e => setForm(p => ({ ...p, gender: e.target.value as 'male' | 'female' }))}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="label">Date of Birth *</label>
              <input className="input" type="date" value={form.dateOfBirth || ''} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color || ''} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="e.g. Black & White" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status || 'active'} onChange={e => setForm(p => ({ ...p, status: e.target.value as Animal['status'] }))}>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>
          </div>
          {/* Show derived age + category while editing */}
          {form.dateOfBirth && (
            <div style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
              color: '#8aab94',
            }}>
              Age: <strong style={{ color: 'var(--color-text, inherit)' }}>{formatAge(form.dateOfBirth)}</strong>
              &nbsp;&nbsp;Category: <strong style={{ color: 'var(--color-text, inherit)' }}>
                {getAnimalCategory(form.dateOfBirth, form.gender || 'female')}
              </strong>
            </div>
          )}
          <div>
            <label className="label">Animal Photo</label>
            <input type="file" accept="image/*" className="input py-1.5" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            {photoFile && <p className="text-xs text-green-500 mt-1">Selected: {photoFile.name}</p>}
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size="sm" /> : null}
              {editId ? 'Update' : 'Add'} Animal
            </button>
          </div>
        </form>
      </Modal>

      {/* Accept Transfer Modal */}
      <Modal open={showAccept} onClose={() => { setShowAccept(false); setAcceptCode(''); setAcceptPreview(null); setAcceptError(''); setAcceptSigName(''); setAcceptSigData(''); }} title="Accept Animal Transfer" size="md">
        <div className="space-y-4">
          {!acceptPreview ? (
            <>
              <div>
                <label className="label">Transfer Code</label>
                <div className="flex gap-2">
                  <input
                    className="input font-mono uppercase tracking-widest"
                    placeholder="e.g. 9982604C"
                    value={acceptCode}
                    onChange={e => setAcceptCode(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                  <button
                    type="button"
                    className="btn-primary whitespace-nowrap"
                    disabled={acceptLoading || !acceptCode.trim()}
                    onClick={lookupTransferCode}
                  >
                    {acceptLoading ? 'Checking...' : 'Find'}
                  </button>
                </div>
                {acceptError && <p className="text-xs text-red-500 mt-2">{acceptError}</p>}
              </div>
              <p className="text-xs text-gray-400">
                Enter the transfer code shared with you by the seller to claim this animal.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-lg p-4 border border-blue-500/20 bg-blue-500/8">
                <div className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-2">You're accepting</div>
                <div className="text-lg font-black">{acceptPreview.animal?.name}</div>
                <div className="text-sm text-gray-400">
                  {acceptPreview.animal?.breed} · Tag: {acceptPreview.animal?.tagNumber}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  From: <strong>{acceptPreview.fromFarm?.name || 'Unknown seller'}</strong>
                </div>
              </div>

              <div className="rounded-lg p-3 border border-gray-200 dark:border-white/10">
                <div className="text-xs font-bold mb-2">Your E-Signature (required)</div>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setAcceptSigMode('type')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${acceptSigMode === 'type' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50'}`}>
                    Type Name
                  </button>
                  <button type="button" onClick={() => setAcceptSigMode('draw')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${acceptSigMode === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50'}`}>
                    Draw
                  </button>
                </div>
                {acceptSigMode === 'type' ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Type your full name to sign"
                      value={acceptSigName}
                      onChange={e => setAcceptSigName(e.target.value)}
                      className="input italic"
                      style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#2563eb' }}
                    />
                    {acceptSigName.trim() && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8,
                        border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.05)',
                        fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#2563eb',
                      }}>
                        {acceptSigName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <canvas
                      ref={acceptSigCanvasRef}
                      width={340} height={80}
                      onMouseDown={e => {
                        const c = acceptSigCanvasRef.current; if (!c) return;
                        const ctx = c.getContext('2d'); if (!ctx) return;
                        const rect = c.getBoundingClientRect();
                        ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                        (c as any)._signing = true;
                      }}
                      onMouseMove={e => {
                        const c = acceptSigCanvasRef.current; if (!c || !(c as any)._signing) return;
                        const ctx = c.getContext('2d'); if (!ctx) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                        ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
                      }}
                      onMouseUp={() => {
                        const c = acceptSigCanvasRef.current; if (!c) return;
                        (c as any)._signing = false;
                        setAcceptSigData(c.toDataURL());
                      }}
                      onMouseLeave={() => {
                        const c = acceptSigCanvasRef.current; if (c) (c as any)._signing = false;
                      }}
                      className="rounded border w-full cursor-crosshair bg-white"
                    />
                    <button type="button" onClick={() => {
                      const c = acceptSigCanvasRef.current;
                      if (c) { const ctx = c.getContext('2d'); ctx?.clearRect(0, 0, c.width, c.height); }
                      setAcceptSigData('');
                    }} className="text-xs mt-1 text-gray-400 hover:underline">Clear</button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" className="btn-secondary" onClick={() => { setAcceptPreview(null); setAcceptCode(''); }}>Back</button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={acceptSubmitting}
                  onClick={submitAcceptTransfer}
                >
                  {acceptSubmitting ? 'Accepting...' : 'Sign & Accept'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Animal"
        message="Are you sure you want to delete this animal? This will also remove all related records."
        danger
        loading={saving}
      />
    </div>
  );
}

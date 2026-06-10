import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2, Milk, Heart, Baby, Wallet, Search, AlertTriangle, CheckCircle2, List, LayoutGrid } from 'lucide-react';
import api from '../lib/api';
import { Modal, ConfirmDialog, EmptyState, PageLoader, Spinner, ToastContainer } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { format, differenceInDays } from 'date-fns';
import { Animal, MilkRecord, HealthRecord, BreedingRecord, Transaction, BulkMilkRow } from '../types';
import { getBreedingStage } from '../lib/breedingStage';
import { isBreedingEligible, monthsToBreedingEligibility, formatAge } from '../lib/animalUtils';

type BreedingForm = {
  animalId: number;
  serviceDate: string;
  bullName: string;
  expectedBirthDate: string;
  actualBirthDate: string;
  pregnancyStatus: 'pending' | 'pregnant' | 'gave_birth' | 'failed';
  notes: string;
};

type TransactionForm = {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  transactionDate: string;
};

type WorkerForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  hireDate: string;
  status: 'active' | 'inactive';
};

// ─── SHARED ─────────────────────────────────────────────────
function useAnimals() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  useEffect(() => {
    api.get('/animals?status=active&limit=100').then(r => setAnimals(r.data.animals || []));
  }, []);
  return animals;
}

// ─── MILK PAGE ───────────────────────────────────────────────
const MILK_EMPTY = { animalId: 0, productionDate: '', quantityLiters: 0, notes: '' };

export function MilkPage() {
  useEffect(() => { document.title = 'Milk Production — AgriPulse'; }, []);

  const [records, setRecords]     = useState<MilkRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState(MILK_EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [bulkMode, setBulkMode]   = useState(false);
  const [bulkDate, setBulkDate]   = useState(new Date().toISOString().split('T')[0]);
  const [bulkRows, setBulkRows]   = useState<BulkMilkRow[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const animals                   = useAnimals();
  const { toasts, toast, remove } = useToast();

  const load = () => {
    setLoading(true);
    api.get('/milk?limit=50')
      .then(r => setRecords(r.data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Initialise bulk rows whenever animals or date change while bulk panel is open
  useEffect(() => {
    if (!bulkMode) return;
    setBulkRows(
      animals
        .filter(a => a.gender === 'female')
        .map(a => ({
          animalId:     a.id,
          animalName:   a.name,
          tagNumber:    a.tagNumber,
          quantityLiters: '',
          skip:         false,
        }))
    );
  }, [bulkMode, animals, bulkDate]);

  const openAdd = () => {
    setForm({ ...MILK_EMPTY, productionDate: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setModalOpen(true);
  };
  const openEdit = (r: MilkRecord) => {
    setForm({
      animalId: r.animalId,
      productionDate: r.productionDate.split('T')[0],
      quantityLiters: Number(r.quantityLiters),
      notes: r.notes || '',
    });
    setEditId(r.id);
    setModalOpen(true);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      editId
        ? await api.put(`/milk/${editId}`, form)
        : await api.post('/milk', form);
      toast.success(editId ? 'Record updated.' : 'Record added.');
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function saveBulk() {
    const entries = bulkRows.filter(r => !r.skip && r.quantityLiters !== '' && Number(r.quantityLiters) > 0);
    if (entries.length === 0) {
      toast.error('No valid entries — enter at least one quantity greater than 0.');
      return;
    }
    setBulkSaving(true);
    let successCount = 0;
    let errorCount   = 0;
    // POST individually; if a bulk endpoint exists on the backend you can swap this
    for (const row of entries) {
      try {
        await api.post('/milk', {
          animalId:      row.animalId,
          productionDate: bulkDate,
          quantityLiters: Number(row.quantityLiters),
          notes:         '',
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setBulkSaving(false);
    if (successCount > 0) toast.success(`${successCount} record${successCount > 1 ? 's' : ''} saved.`);
    if (errorCount   > 0) toast.error(`${errorCount} record${errorCount > 1 ? 's' : ''} failed (duplicate dates?).`);
    setBulkMode(false);
    load();
  }

  async function del() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.delete(`/milk/${deleteId}`);
      toast.success('Deleted.');
      setDeleteId(null);
      load();
    } catch {
      toast.error('Delete failed.');
    } finally {
      setSaving(false);
    }
  }

  const bulkTotal = bulkRows.reduce((s, r) => s + (r.skip ? 0 : Number(r.quantityLiters) || 0), 0);

  return (
    <div className="space-y-5 animate-in">
      <ToastContainer toasts={toasts} remove={remove} />

      <div className="page-header">
        <div>
          <h1 className="page-title">Milk Production</h1>
          <p className="text-sm text-gray-500">{records.length} records</p>
        </div>
        <div className="flex gap-2">
          <button
            className={bulkMode ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setBulkMode(v => !v)}
          >
            <LayoutGrid className="w-4 h-4" />
            Bulk Entry
          </button>
          <button className="btn-primary" onClick={openAdd}>
            <Plus className="w-4 h-4" />Add Record
          </button>
        </div>
      </div>

      {/* ── Bulk entry panel ── */}
      {bulkMode && (
        <div style={{
          borderRadius: 14,
          border: '1px solid rgba(99,102,241,.3)',
          background: 'rgba(99,102,241,.06)',
          padding: '18px 20px',
        }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#818cf8' }}>Bulk Entry</p>
              <p style={{ fontSize: 12, color: '#8aab94' }}>Enter quantities for all female animals on one date.</p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="label" style={{ fontSize: 11 }}>Date *</label>
                <input
                  className="input"
                  type="date"
                  value={bulkDate}
                  onChange={e => setBulkDate(e.target.value)}
                  style={{ width: 160 }}
                />
              </div>
            </div>
          </div>

          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Tag</th>
                  <th>Litres</th>
                  <th style={{ width: 56, textAlign: 'center' }}>Skip</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, i) => (
                  <tr key={row.animalId} style={{ opacity: row.skip ? 0.4 : 1 }}>
                    <td className="font-medium">{row.animalName}</td>
                    <td className="font-mono text-xs text-gray-500">{row.tagNumber}</td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        className="input"
                        style={{ width: 100 }}
                        placeholder="0.0"
                        disabled={row.skip}
                        value={row.quantityLiters}
                        onChange={e => setBulkRows(rows =>
                          rows.map((r, idx) => idx === i ? { ...r, quantityLiters: e.target.value } : r)
                        )}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.skip}
                        onChange={e => setBulkRows(rows =>
                          rows.map((r, idx) => idx === i ? { ...r, skip: e.target.checked } : r)
                        )}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <span style={{ fontSize: 13, color: '#8aab94' }}>
              Total: <strong style={{ color: '#e2ede6' }}>{bulkTotal.toFixed(1)} L</strong>
              {' '}across{' '}
              <strong style={{ color: '#e2ede6' }}>
                {bulkRows.filter(r => !r.skip && Number(r.quantityLiters) > 0).length}
              </strong>{' '}animals
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => setBulkMode(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveBulk} disabled={bulkSaving}>
                {bulkSaving ? <Spinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
                Save All
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState
          icon={<Milk className="w-8 h-8" />}
          title="No milk records"
          description="Start recording daily milk production."
          action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Record</button>}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Animal</th><th>Date</th><th>Quantity (L)</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">
                    {r.animal?.name}{' '}
                    <span className="text-gray-400 text-xs font-mono">#{r.animal?.tagNumber}</span>
                  </td>
                  <td>{format(new Date(r.productionDate), 'dd MMM yyyy')}</td>
                  <td className="font-semibold text-farm-green">{Number(r.quantityLiters).toFixed(2)}</td>
                  <td className="text-gray-500 truncate max-w-xs">{r.notes || '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Record' : 'Add Milk Record'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Animal *</label>
            <select className="input" value={form.animalId} onChange={e => setForm(p => ({ ...p, animalId: +e.target.value }))} required>
              <option value={0}>Select animal...</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.tagNumber})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.productionDate} onChange={e => setForm(p => ({ ...p, productionDate: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Liters *</label>
              <input className="input" type="number" step="0.1" min="0" value={form.quantityLiters || ''} onChange={e => setForm(p => ({ ...p, quantityLiters: +e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner size="sm" /> : null}Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del} title="Delete Record" message="Delete this milk production record?" danger loading={saving} />
    </div>
  );
}

// ─── HEALTH PAGE ─────────────────────────────────────────────
const HEALTH_EMPTY = { animalId: 0, recordDate: '', condition: '', treatment: '', doctorName: '', vaccination: '', notes: '' };

export function HealthPage() {
  useEffect(() => { document.title = 'Health Records — AgriPulse'; }, []);

  const [records, setRecords]     = useState<HealthRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState(HEALTH_EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const animals                   = useAnimals();
  const { toasts, toast, remove } = useToast();

  const load = () => {
    setLoading(true);
    api.get('/animal-health?limit=50')
      .then(r => setRecords(r.data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm({ ...HEALTH_EMPTY, recordDate: new Date().toISOString().split('T')[0] }); setEditId(null); setModalOpen(true); };
  const openEdit = (r: HealthRecord) => {
    setForm({ animalId: r.animalId, recordDate: r.recordDate.split('T')[0], condition: r.condition, treatment: r.treatment || '', doctorName: r.doctorName || '', vaccination: r.vaccination || '', notes: r.notes || '' });
    setEditId(r.id); setModalOpen(true);
  };

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      editId ? await api.put(`/animal-health/${editId}`, form) : await api.post('/animal-health', form);
      toast.success('Saved.'); setModalOpen(false); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  }

  async function del() {
    if (!deleteId) return; setSaving(true);
    try { await api.delete(`/animal-health/${deleteId}`); toast.success('Deleted.'); setDeleteId(null); load(); }
    catch { toast.error('Failed.'); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 animate-in">
      <ToastContainer toasts={toasts} remove={remove} />
      <div className="page-header">
        <div><h1 className="page-title">Health Records</h1></div>
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Record</button>
      </div>
      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState icon={<Heart className="w-8 h-8" />} title="No health records" description="Track animal health, treatments, and vaccinations." action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Record</button>} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Animal</th><th>Date</th><th>Condition</th><th>Doctor</th><th>Vaccination</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td className="font-medium">{r.animal?.name}</td>
                  <td>{format(new Date(r.recordDate), 'dd MMM yyyy')}</td>
                  <td>{r.condition}</td>
                  <td className="text-gray-500">{r.doctorName || '—'}</td>
                  <td>{r.vaccination ? <span className="badge-green">{r.vaccination}</span> : '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Health Record' : 'Add Health Record'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Animal *</label>
              <select className="input" value={form.animalId} onChange={e => setForm(p => ({ ...p, animalId: +e.target.value }))} required>
                <option value={0}>Select animal...</option>
                {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.tagNumber})</option>)}
              </select>
            </div>
            <div><label className="label">Date *</label><input className="input" type="date" value={form.recordDate} onChange={e => setForm(p => ({ ...p, recordDate: e.target.value }))} required /></div>
            <div><label className="label">Condition *</label><input className="input" value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))} required /></div>
            <div><label className="label">Doctor Name</label><input className="input" value={form.doctorName} onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))} /></div>
            <div><label className="label">Vaccination</label><input className="input" value={form.vaccination} onChange={e => setForm(p => ({ ...p, vaccination: e.target.value }))} /></div>
          </div>
          <div><label className="label">Treatment</label><textarea className="input" rows={2} value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner size="sm" /> : null}Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del} title="Delete Record" message="Delete this health record?" danger loading={saving} />
    </div>
  );
}

// ─── BREEDING PAGE ───────────────────────────────────────────
const BREEDING_EMPTY: BreedingForm = {
  animalId: 0, serviceDate: '', bullName: '', expectedBirthDate: '',
  actualBirthDate: '', pregnancyStatus: 'pending', notes: '',
};
const statusColors: Record<string, string> = {
  pending: 'badge-gray', pregnant: 'badge-blue', gave_birth: 'badge-green', failed: 'badge-red',
};

// Compute days pregnant and days to calving from a breeding record
function getPregnancyInfo(r: BreedingRecord): { daysPregnant: number; daysToCalving: number | null } | null {
  if (r.pregnancyStatus !== 'pregnant' && r.pregnancyStatus !== 'pending') return null;
  const service = new Date(r.serviceDate);
  const now     = new Date();
  const daysPregnant = differenceInDays(now, service);
  const daysToCalving = r.expectedBirthDate
    ? differenceInDays(new Date(r.expectedBirthDate), now)
    : 283 - daysPregnant;
  return { daysPregnant, daysToCalving };
}

export function BreedingPage() {
  useEffect(() => { document.title = 'Breeding Records — AgriPulse'; }, []);

  const [records, setRecords]     = useState<BreedingRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState<BreedingForm>(BREEDING_EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [ageWarning, setAgeWarning] = useState<string | null>(null);
  const animals                   = useAnimals();
  const { toasts, toast, remove } = useToast();

  const load = () => {
    setLoading(true);
    api.get('/breeding?limit=50')
      .then(r => setRecords(r.data.records || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...BREEDING_EMPTY, serviceDate: new Date().toISOString().split('T')[0] });
    setEditId(null);
    setAgeWarning(null);
    setModalOpen(true);
  };
  const openEdit = (r: BreedingRecord) => {
    setForm({
      animalId: r.animalId, serviceDate: r.serviceDate.split('T')[0], bullName: r.bullName || '',
      expectedBirthDate: r.expectedBirthDate?.split('T')[0] || '',
      actualBirthDate:   r.actualBirthDate?.split('T')[0]   || '',
      pregnancyStatus: r.pregnancyStatus, notes: r.notes || '',
    });
    setEditId(r.id);
    setAgeWarning(null);
    setModalOpen(true);
  };

  function handleAnimalSelect(animalId: number) {
    const selected = animals.find(a => a.id === animalId);
    if (selected && !isBreedingEligible(selected.dateOfBirth)) {
      const mo = monthsToBreedingEligibility(selected.dateOfBirth);
      setAgeWarning(`${selected.name} is ${formatAge(selected.dateOfBirth)} old — minimum breeding age is 18 months. Eligible in ~${mo} month${mo !== 1 ? 's' : ''}.`);
    } else {
      setAgeWarning(null);
    }
    setForm(p => ({ ...p, animalId }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    // Soft block — warn but allow supervisor override by having already set the form
    if (ageWarning && !editId) {
      toast.error('Animal has not reached minimum breeding age (18 months).');
      return;
    }
    setSaving(true);
    try {
      editId ? await api.put(`/breeding/${editId}`, form) : await api.post('/breeding', form);
      toast.success('Saved.'); setModalOpen(false); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  }

  async function del() {
    if (!deleteId) return; setSaving(true);
    try { await api.delete(`/breeding/${deleteId}`); toast.success('Deleted.'); setDeleteId(null); load(); }
    catch { toast.error('Failed.'); } finally { setSaving(false); }
  }

  // Alerts — calving within 14 days
  const dueSoon = records.filter(r => {
    if (r.pregnancyStatus !== 'pregnant' && r.pregnancyStatus !== 'pending') return false;
    if (!r.expectedBirthDate) return false;
    const days = differenceInDays(new Date(r.expectedBirthDate), new Date());
    return days >= 0 && days <= 14;
  });

  return (
    <div className="space-y-5 animate-in">
      <ToastContainer toasts={toasts} remove={remove} />

      <div className="page-header">
        <div><h1 className="page-title">Breeding</h1></div>
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Record</button>
      </div>

      {/* Due-soon alert banner */}
      {dueSoon.length > 0 && (
        <div style={{
          borderRadius: 12,
          border: '1px solid rgba(245,158,11,.3)',
          background: 'rgba(245,158,11,.08)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b', marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
              {dueSoon.length} animal{dueSoon.length > 1 ? 's' : ''} calving within 14 days
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
              {dueSoon.map(r => {
                const days = differenceInDays(new Date(r.expectedBirthDate!), new Date());
                return (
                  <span key={r.id} style={{ fontSize: 12, color: '#8aab94' }}>
                    <strong style={{ color: '#e2ede6' }}>{r.animal?.name}</strong>
                    {' — '}
                    {days === 0 ? 'today' : `${days}d`}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {loading ? <PageLoader /> : records.length === 0 ? (
        <EmptyState
          icon={<Baby className="w-8 h-8" />}
          title="No breeding records"
          action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Record</button>}
        />
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th>Animal</th>
                <th>Service Date</th>
                <th>Bull</th>
                <th>Days Pregnant</th>
                <th>Expected Birth</th>
                <th>Days to Calving</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const pg = getPregnancyInfo(r);
                const dueSoonFlag = pg && pg.daysToCalving !== null && pg.daysToCalving <= 14 && pg.daysToCalving >= 0;
                return (
                  <tr key={r.id}>
                    <td className="font-medium">{r.animal?.name}</td>
                    <td>{format(new Date(r.serviceDate), 'dd MMM yyyy')}</td>
                    <td className="text-gray-500">{r.bullName || '—'}</td>

                    {/* Days pregnant */}
                    <td>
                      {pg ? (
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>
                          Day {pg.daysPregnant}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Expected birth */}
                    <td>
                      {r.expectedBirthDate
                        ? format(new Date(r.expectedBirthDate), 'dd MMM yyyy')
                        : '—'}
                    </td>

                    {/* Days to calving with urgency colour */}
                    <td>
                      {pg && pg.daysToCalving !== null ? (
                        <span style={{
                          fontWeight: 700, fontSize: 13,
                          color: dueSoonFlag
                            ? (pg.daysToCalving <= 3 ? '#ef4444' : '#f59e0b')
                            : '#10b981',
                        }}>
                          {pg.daysToCalving <= 0
                            ? 'Overdue'
                            : `${pg.daysToCalving}d`}
                          {dueSoonFlag && pg.daysToCalving > 0 && (
                            <AlertTriangle className="w-3 h-3 inline ml-1" style={{ verticalAlign: 'middle' }} />
                          )}
                        </span>
                      ) : '—'}
                    </td>

                    <td>
                      <span className={statusColors[r.pregnancyStatus] || 'badge-gray'}>
                        {r.pregnancyStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Record' : 'Add Breeding Record'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Animal *</label>
              <select
                className="input"
                value={form.animalId}
                onChange={e => handleAnimalSelect(+e.target.value)}
                required
              >
                <option value={0}>Select animal...</option>
                {animals.filter(a => a.gender === 'female').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.tagNumber})</option>
                ))}
              </select>

              {/* Age warning */}
              {ageWarning && (
                <div style={{
                  marginTop: 6, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                  fontSize: 12, color: '#f87171', display: 'flex', gap: 6, alignItems: 'flex-start',
                }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ marginTop: 1 }} />
                  {ageWarning}
                </div>
              )}

              {/* Breeding stage info pill */}
              {form.animalId > 0 && !ageWarning && (() => {
                const selected  = animals.find(a => a.id === form.animalId);
                if (!selected) return null;
                const latestRec = records.find(r => r.animalId === form.animalId);
                const s = getBreedingStage(latestRec ? {
                  serviceDate:     latestRec.serviceDate,
                  pregnancyStatus: latestRec.pregnancyStatus,
                  expectedBirthDate: latestRec.expectedBirthDate,
                  actualBirthDate:   latestRec.actualBirthDate,
                } : null, selected.dateOfBirth, selected.gender);
                if (!s) return null;
                return (
                  <div style={{
                    marginTop: 6, padding: '8px 12px', borderRadius: 8,
                    background: s.glowColor, border: `1px solid ${s.color}40`,
                    fontSize: 12, color: s.color, fontWeight: 600,
                  }}>
                    {s.stage} — {s.detail}
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="label">Service Date *</label>
              <input
                className="input"
                type="date"
                value={form.serviceDate}
                onChange={e => {
                  const d   = e.target.value;
                  const exp = d
                    ? new Date(new Date(d).getTime() + 283 * 86400000).toISOString().split('T')[0]
                    : '';
                  setForm(p => ({ ...p, serviceDate: d, expectedBirthDate: p.expectedBirthDate || exp }));
                }}
                required
              />
            </div>

            <div>
              <label className="label">Bull Name</label>
              <input className="input" value={form.bullName} onChange={e => setForm(p => ({ ...p, bullName: e.target.value }))} />
            </div>

            <div>
              <label className="label">
                Expected Birth{' '}
                <span style={{ fontSize: '0.7rem', color: '#10b981' }}>(auto-filled)</span>
              </label>
              <input
                className="input"
                type="date"
                value={form.expectedBirthDate}
                onChange={e => setForm(p => ({ ...p, expectedBirthDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Actual Birth</label>
              <input
                className="input"
                type="date"
                value={form.actualBirthDate}
                onChange={e => setForm(p => ({ ...p, actualBirthDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.pregnancyStatus}
                onChange={e => setForm(p => ({ ...p, pregnancyStatus: e.target.value as typeof form.pregnancyStatus }))}
              >
                <option value="pending">Pending</option>
                <option value="pregnant">Pregnant</option>
                <option value="gave_birth">Gave Birth</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || (!!ageWarning && !editId)}>
              {saving ? <Spinner size="sm" /> : null}Save
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del} title="Delete Record" message="Delete this breeding record?" danger loading={saving} />
    </div>
  );
}

// ─── FINANCIAL PAGE ──────────────────────────────────────────
const TX_EMPTY: TransactionForm = { type: 'income', category: '', amount: 0, description: '', transactionDate: '' };
const INCOME_CATEGORIES  = ['Milk Sales', 'Animal Sales', 'Breeding Services', 'Government Subsidy', 'Other Income'];
const EXPENSE_CATEGORIES = ['Feed & Fodder', 'Veterinary', 'Labour', 'Equipment', 'Utilities', 'Medicines', 'Other Expense'];

export function FinancialPage() {
  useEffect(() => { document.title = 'Financial Records — AgriPulse'; }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary]           = useState({ income: 0, expense: 0, profit: 0 });
  const [loading, setLoading]           = useState(true);
  const [typeFilter, setTypeFilter]     = useState('');
  const [form, setForm]                 = useState<TransactionForm>(TX_EMPTY);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editId, setEditId]             = useState<number | null>(null);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [saving, setSaving]             = useState(false);
  const { toasts, toast, remove }       = useToast();

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams(); if (typeFilter) p.set('type', typeFilter);
    api.get(`/financial?${p}&limit=50`)
      .then(r => { setTransactions(r.data.transactions || []); setSummary(r.data.summary || null); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [typeFilter]);

  const openAdd  = () => { setForm({ ...TX_EMPTY, transactionDate: new Date().toISOString().split('T')[0] }); setEditId(null); setModalOpen(true); };
  const openEdit = (t: Transaction) => {
    setForm({ type: t.type, category: t.category, amount: Number(t.amount), description: t.description || '', transactionDate: t.transactionDate.split('T')[0] });
    setEditId(t.id); setModalOpen(true);
  };

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      editId ? await api.put(`/financial/${editId}`, form) : await api.post('/financial', form);
      toast.success('Saved.'); setModalOpen(false); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  }

  async function del() {
    if (!deleteId) return; setSaving(true);
    try { await api.delete(`/financial/${deleteId}`); toast.success('Deleted.'); setDeleteId(null); load(); }
    catch { toast.error('Failed.'); } finally { setSaving(false); }
  }

  const cats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-5 animate-in">
      <ToastContainer toasts={toasts} remove={remove} />
      <div className="page-header">
        <div><h1 className="page-title">Finances</h1></div>
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Transaction</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Income</p>
          <p className="text-xl font-bold text-green-600">KSh {Number(summary.income).toLocaleString()}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Total Expense</p>
          <p className="text-xl font-bold text-red-500">KSh {Number(summary.expense).toLocaleString()}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Net Profit</p>
          <p className={`text-xl font-bold ${Number(summary.profit) >= 0 ? 'text-farm-green' : 'text-red-600'}`}>
            KSh {Number(summary.profit).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <select className="input w-48" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Transactions</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {loading ? <PageLoader /> : transactions.length === 0 ? (
        <EmptyState icon={<Wallet className="w-8 h-8" />} title="No transactions" action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Transaction</button>} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Type</th><th>Category</th><th>Amount</th><th>Description</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td><span className={t.type === 'income' ? 'badge-green' : 'badge-red'}>{t.type}</span></td>
                  <td className="font-medium">{t.category}</td>
                  <td className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}KSh {Number(t.amount).toLocaleString()}
                  </td>
                  <td className="text-gray-500 truncate max-w-xs">{t.description || '—'}</td>
                  <td>{format(new Date(t.transactionDate), 'dd MMM yyyy')}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(t.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Type *</label>
            <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'income' | 'expense', category: '' }))}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="label">Category *</label>
            <select className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} required>
              <option value="">Select category...</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (KSh) *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: +e.target.value }))} required />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.transactionDate} onChange={e => setForm(p => ({ ...p, transactionDate: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner size="sm" /> : null}Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del} title="Delete Transaction" message="Delete this transaction?" danger loading={saving} />
    </div>
  );
}

// ─── WORKERS PAGE ─────────────────────────────────────────────
import { Users } from 'lucide-react';

const WORKER_EMPTY: WorkerForm = { name: '', email: '', password: '', phone: '', address: '', hireDate: '', status: 'active' };

export function WorkersPage() {
  useEffect(() => { document.title = 'Workers — AgriPulse'; }, []);

  const [workers, setWorkers]     = useState<Array<{ id: number; name: string; email: string; isActive: boolean; workers: Array<{ phone?: string; hireDate?: string; status: string }> }>>([]);
  const [loading, setLoading]     = useState(true);
  const [form, setForm]           = useState<WorkerForm>(WORKER_EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const { toasts, toast, remove } = useToast();

  const load = () => { setLoading(true); api.get('/workers').then(r => setWorkers(r.data.workers)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(WORKER_EMPTY); setEditId(null); setModalOpen(true); };

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, ...(editId && !form.password ? { password: undefined } : {}) };
      editId ? await api.put(`/workers/${editId}`, payload) : await api.post('/workers', payload);
      toast.success(editId ? 'Worker updated.' : 'Worker added.'); setModalOpen(false); load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error || 'Failed.');
    } finally { setSaving(false); }
  }

  async function del() {
    if (!deleteId) return; setSaving(true);
    try { await api.delete(`/workers/${deleteId}`); toast.success('Worker removed.'); setDeleteId(null); load(); }
    catch { toast.error('Failed.'); } finally { setSaving(false); }
  }

  const filtered = workers.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in">
      <ToastContainer toasts={toasts} remove={remove} />
      <div className="page-header">
        <div><h1 className="page-title">Workers</h1><p className="text-sm text-gray-500">{workers.length} workers</p></div>
        <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Worker</button>
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search workers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8" />} title="No workers found" action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" />Add Worker</button>} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Hire Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(w => {
                const wd = w.workers?.[0];
                return (
                  <tr key={w.id}>
                    <td className="font-medium">{w.name}</td>
                    <td className="text-gray-500">{w.email}</td>
                    <td className="text-gray-500">{wd?.phone || '—'}</td>
                    <td>{wd?.hireDate ? format(new Date(wd.hireDate), 'dd MMM yyyy') : '—'}</td>
                    <td><span className={w.isActive ? 'badge-green' : 'badge-red'}>{w.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setForm({ name: w.name, email: w.email, password: '', phone: wd?.phone || '', address: '', hireDate: wd?.hireDate?.split('T')[0] || '', status: (wd?.status as 'active' | 'inactive') || 'active' });
                            setEditId(w.id); setModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(w.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Worker' : 'Add Worker'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
            <div><label className="label">{editId ? 'New Password (leave blank to keep)' : 'Password *'}</label><input className="input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} minLength={8} required={!editId} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><label className="label">Hire Date</label><input className="input" type="date" value={form.hireDate} onChange={e => setForm(p => ({ ...p, hireDate: e.target.value }))} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner size="sm" /> : null}Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del} title="Remove Worker" message="Remove this worker? They will lose access to the system." danger loading={saving} />
    </div>
  );
}

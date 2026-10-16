import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';

const MULTI = { headers: { 'Content-Type': 'multipart/form-data' } };
const COW_ID_OK = /^[A-Za-z0-9_-]{1,40}$/;

interface AnimalOption {
  id: number;
  name: string;
  tagNumber: string;
  agripulseId: string | null;
  status: string;
  farm?: { name?: string | null } | null;
}
interface Ranked { cowId: string; similarity: number }
interface IdentifyResult { status: string; message?: string; bestCowId?: string; confidence?: number; threshold?: number; ranking?: Ranked[] }
interface GroupResult { session: string | null; groups: { group: number; count: number; files: string[] }[]; rejected: string[]; errors: string[]; message?: string }

const card: React.CSSProperties = { border: '1px solid rgba(128,128,128,.25)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 };

export function ReidTab() {
  const [animals, setAnimals] = useState<AnimalOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const linkable = useMemo(() => animals.filter(a => !!a.agripulseId), [animals]);
  const byCowId = useMemo(() => {
    const m = new Map<string, AnimalOption>();
    animals.forEach(a => { if (a.agripulseId) m.set(a.agripulseId, a); });
    return m;
  }, [animals]);
  const describeAnimal = (cowId: string) => {
    const a = byCowId.get(cowId);
    return a ? `${a.name} · tag ${a.tagNumber} · ${a.agripulseId}` : `${cowId} (not linked to an animal record)`;
  };
  const optionLabel = (a: AnimalOption) => `${a.name} · tag ${a.tagNumber} · ${a.agripulseId}${a.status !== 'active' ? ` (${a.status})` : ''}`;

  const [identPhoto, setIdentPhoto] = useState<File | null>(null);
  const [identify, setIdentify] = useState<IdentifyResult | null>(null);

  const [regCowId, setRegCowId] = useState('');
  const [regConfirmed, setRegConfirmed] = useState(false);
  const [regFiles, setRegFiles] = useState<File[]>([]);

  const [groupFiles, setGroupFiles] = useState<File[]>([]);
  const [threshold, setThreshold] = useState('0.5');
  const [grouped, setGrouped] = useState<GroupResult | null>(null);
  const [groupAssign, setGroupAssign] = useState<Record<string, string>>({});

  const thresholdNum = Number(threshold);
  const thresholdOk = Number.isFinite(thresholdNum) && thresholdNum >= 0.1 && thresholdNum <= 0.9;

  const loadAnimals = () =>
    api.get('/admin/reid/animals').then(r => setAnimals(r.data.animals || [])).catch(() => setAnimals([]));
  useEffect(() => { loadAnimals(); }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); }
    catch (e: any) { setError(e?.response?.data?.error || 'Request failed. The re-ID service may be offline.'); }
    finally { setBusy(false); }
  }

  const doIdentify = () => run(async () => {
    const fd = new FormData();
    fd.append('photo', identPhoto!);
    const r = await api.post('/admin/reid/identify', fd, MULTI);
    setIdentify(r.data);
  });

  const doRegister = () => run(async () => {
    if (!COW_ID_OK.test(regCowId)) { setError('Choose an animal first.'); return; }
    const fd = new FormData();
    fd.append('cowId', regCowId);
    regFiles.forEach(f => fd.append('photos', f));
    const r = await api.post('/admin/reid/register', fd, MULTI);
    setNotice(`Saved ${r.data.saved} photo(s) for ${describeAnimal(regCowId)}. Reference photos now: ${r.data.totalReference}.`
      + (r.data.rejected?.length ? ` Rejected: ${r.data.rejected.join('; ')}` : ''));
    setRegFiles([]);
    setRegConfirmed(false);
  });

  const doGroup = () => run(async () => {
    const fd = new FormData();
    fd.append('threshold', threshold);
    groupFiles.forEach(f => fd.append('photos', f));
    const r = await api.post('/admin/reid/group', fd, MULTI);
    setGrouped(r.data);
    setGroupAssign({});
  });

  const doSaveGroups = () => run(async () => {
    const map: Record<string, string> = {};
    Object.entries(groupAssign).forEach(([g, cow]) => { if (cow) map[g] = cow; });
    if (!Object.keys(map).length) { setError('Choose an animal for at least one group.'); return; }
    const r = await api.post('/admin/reid/group/save', { session: grouped?.session, assignments: JSON.stringify(map) });
    setNotice(r.data.results.map((x: any) => x.status === 'saved'
      ? `Group ${x.group} saved for ${describeAnimal(x.cowId)} (${x.photos} photos)`
      : `Group ${x.group}: ${x.reason}`).join(' | '));
    setGrouped(null);
    setGroupFiles([]);
    setGroupAssign({});
  });

  return (
    <section aria-labelledby="reid-title" className="flex flex-col gap-4">
      <div>
        <h2 id="reid-title" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Cow re-identification</h2>
        <p className="text-xs text-gray-500">
          Same-cow candidate matching. Similarity scores are candidate-match signals, not probabilities or proof of identity.
          Nothing here changes an animal record automatically.
          {animals.length - linkable.length > 0 && <> {animals.length - linkable.length} animal(s) without an AgriPulse ID are not shown.</>}
        </p>
      </div>

      {error && <div className="text-sm text-red-500" role="alert">{error}</div>}
      {notice && <div className="text-sm text-green-600" role="status">{notice}</div>}

      <div style={card}>
        <div className="font-bold text-sm">Identify a cow</div>
        <input type="file" accept="image/*" className="input py-1.5" onChange={e => setIdentPhoto(e.target.files?.[0] || null)} />
        <button className="btn-primary self-start" disabled={busy || !identPhoto} onClick={doIdentify}>Identify</button>
        {identify && (identify.status === 'match' || identify.status === 'no_confident_match' ? (
          <div className="text-sm">
            <div>
              <strong>{identify.status === 'match' ? 'Top candidate' : 'No strong candidate'}:</strong>{' '}
              {identify.bestCowId && describeAnimal(identify.bestCowId)}
              {' '}(similarity {((identify.confidence ?? 0) * 100).toFixed(1)}%)
            </div>
            <ul className="text-xs mt-2">
              {identify.ranking?.map(r => <li key={r.cowId}>{describeAnimal(r.cowId)}: {(r.similarity * 100).toFixed(1)}%</li>)}
            </ul>
          </div>
        ) : <div className="text-sm">{identify.message}</div>)}
      </div>

      <div style={card}>
        <div className="font-bold text-sm">Register photos for an animal</div>
        <label className="label">Animal record</label>
        <select className="input" value={regCowId} onChange={e => setRegCowId(e.target.value)}>
          <option value="">Select an animal…</option>
          {linkable.map(a => <option key={a.id} value={a.agripulseId!}>{optionLabel(a)}</option>)}
        </select>
        <input type="file" accept="image/*" multiple className="input py-1.5" onChange={e => setRegFiles(Array.from(e.target.files || []))} />
        <label className="text-xs flex gap-2 items-start">
          <input type="checkbox" checked={regConfirmed} onChange={e => setRegConfirmed(e.target.checked)} />
          I confirm these photos show the selected animal.
        </label>
        <button className="btn-primary self-start" disabled={busy || !regCowId || !regFiles.length || !regConfirmed} onClick={doRegister}>Register photos</button>
      </div>

      <div style={card}>
        <div className="font-bold text-sm">Group unsorted photos</div>
        <input type="file" accept="image/*" multiple className="input py-1.5" onChange={e => setGroupFiles(Array.from(e.target.files || []))} />
        <label className="label">Similarity threshold (0.1 to 0.9; higher is stricter)</label>
        <input className="input w-32" type="number" step="0.05" min="0.1" max="0.9" value={threshold} onChange={e => setThreshold(e.target.value)} />
        {!thresholdOk && <div className="text-xs text-red-500">Threshold must be between 0.1 and 0.9.</div>}
        <button className="btn-primary self-start" disabled={busy || !groupFiles.length || !thresholdOk} onClick={doGroup}>Group photos</button>
        {grouped && (
          <>
            {grouped.message && <div className="text-sm">{grouped.message}</div>}
            <ul className="text-sm">
              {grouped.groups.map(g => (
                <li key={g.group} className="flex flex-col gap-1 mb-2">
                  <span>Group {g.group}: {g.count} photo(s)</span>
                  <select className="input" value={groupAssign[String(g.group)] || ''}
                    onChange={e => setGroupAssign(p => ({ ...p, [String(g.group)]: e.target.value }))}>
                    <option value="">Leave unassigned</option>
                    {linkable.map(a => <option key={a.id} value={a.agripulseId!}>{optionLabel(a)}</option>)}
                  </select>
                </li>
              ))}
            </ul>
            {grouped.rejected.length > 0 && <div className="text-xs">Rejected: {grouped.rejected.join('; ')}</div>}
            {grouped.errors.length > 0 && <div className="text-xs">Skipped: {grouped.errors.join('; ')}</div>}
            <button className="btn-primary self-start" disabled={busy || !grouped.session} onClick={doSaveGroups}>Save assigned groups</button>
          </>
        )}
      </div>
    </section>
  );
}

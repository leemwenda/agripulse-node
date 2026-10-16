import { useEffect, useState } from 'react';
import api from '../../lib/api';

const MULTI = { headers: { 'Content-Type': 'multipart/form-data' } };
const COW_ID = /^[A-Za-z0-9_-]{1,40}$/;

interface Ranked { cowId: string; similarity: number }
interface IdentifyResult { status: string; message?: string; bestCowId?: string; confidence?: number; threshold?: number; ranking?: Ranked[] }
interface GroupResult { session: string | null; groups: { group: number; count: number; files: string[] }[]; rejected: string[]; errors: string[]; message?: string }

export function ReidTab() {
  const [cows, setCows] = useState<{ cowId: string; referencePhotos: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [identify, setIdentify] = useState<IdentifyResult | null>(null);

  const [regId, setRegId] = useState('');
  const [regFiles, setRegFiles] = useState<File[]>([]);

  const [groupFiles, setGroupFiles] = useState<File[]>([]);
  const [threshold, setThreshold] = useState('0.5');
  const [grouped, setGrouped] = useState<GroupResult | null>(null);
  const [assign, setAssign] = useState('');

  const loadCows = () => api.get('/admin/reid/cows').then(r => setCows(r.data.cows || [])).catch(() => setCows([]));
  useEffect(() => { loadCows(); }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(); }
    catch (e: any) { setError(e?.response?.data?.error || 'Request failed. The re-ID service may be offline.'); }
    finally { setBusy(false); }
  }

  const doIdentify = () => run(async () => {
    const fd = new FormData();
    fd.append('photo', photo!);
    const r = await api.post('/admin/reid/identify', fd, MULTI);
    setIdentify(r.data);
  });

  const doRegister = () => run(async () => {
    const fd = new FormData();
    fd.append('cowId', regId.trim());
    regFiles.forEach(f => fd.append('photos', f));
    const r = await api.post('/admin/reid/register', fd, MULTI);
    setNotice(`Saved ${r.data.saved} photo(s) for ${regId.trim()}. Reference photos now: ${r.data.totalReference}.`
      + (r.data.rejected?.length ? ` Rejected: ${r.data.rejected.join('; ')}` : ''));
    setRegFiles([]);
    loadCows();
  });

  const doGroup = () => run(async () => {
    const fd = new FormData();
    fd.append('threshold', threshold);
    groupFiles.forEach(f => fd.append('photos', f));
    const r = await api.post('/admin/reid/group', fd, MULTI);
    setGrouped(r.data);
    setAssign((r.data.groups || []).map((g: any) => `${g.group}: new_${r.data.session}_g${g.group}`).join('\n'));
  });

  const doSave = () => run(async () => {
    const map: Record<string, string> = {};
    assign.split('\n').forEach(line => {
      const [n, id] = line.split(':').map(s => s?.trim());
      if (n && id) map[n] = id;
    });
    if (!Object.keys(map).length) { setError('Enter at least one line like "1: AGP-00127".'); return; }
    const r = await api.post('/admin/reid/group/save', { session: grouped?.session, assignments: JSON.stringify(map) });
    setNotice(r.data.results.map((x: any) => x.status === 'saved'
      ? `Group ${x.group} saved as ${x.cowId} (${x.photos} photos)`
      : `Group ${x.group}: ${x.reason}`).join(' | '));
    loadCows();
  });

  const card: React.CSSProperties = { border: '1px solid rgba(128,128,128,.25)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-gray-500">
        Advisory only. Similarity is a candidate match. A person must confirm the cow ID before it is saved.
        {cows.length > 0 && <> Registered cows: {cows.length}.</>}
      </div>

      {error && <div className="text-sm text-red-500" role="alert">{error}</div>}
      {notice && <div className="text-sm text-green-600" role="status">{notice}</div>}

      <div style={card}>
        <div className="font-bold text-sm">Identify a cow</div>
        <input type="file" accept="image/*" className="input py-1.5" onChange={e => setPhoto(e.target.files?.[0] || null)} />
        <button className="btn-primary self-start" disabled={busy || !photo} onClick={doIdentify}>Identify</button>
        {identify && (
          identify.status === 'match' || identify.status === 'no_confident_match' ? (
            <div className="text-sm">
              <div><strong>{identify.status === 'match' ? 'Best match' : 'No confident match'}:</strong> {identify.bestCowId} ({((identify.confidence ?? 0) * 100).toFixed(1)}%)</div>
              <ul className="text-xs mt-2">
                {identify.ranking?.map(r => <li key={r.cowId}>{r.cowId}: {(r.similarity * 100).toFixed(1)}%</li>)}
              </ul>
            </div>
          ) : <div className="text-sm">{identify.message}</div>
        )}
      </div>

      <div style={card}>
        <div className="font-bold text-sm">Register photos for a cow</div>
        <label className="label">Cow ID</label>
        <input className="input font-mono" placeholder="e.g. AGP-00127" value={regId} onChange={e => setRegId(e.target.value)} />
        <input type="file" accept="image/*" multiple className="input py-1.5" onChange={e => setRegFiles(Array.from(e.target.files || []))} />
        <button className="btn-primary self-start" disabled={busy || !COW_ID.test(regId.trim()) || !regFiles.length} onClick={doRegister}>Register</button>
      </div>

      <div style={card}>
        <div className="font-bold text-sm">Group unsorted photos</div>
        <input type="file" accept="image/*" multiple className="input py-1.5" onChange={e => setGroupFiles(Array.from(e.target.files || []))} />
        <label className="label">Similarity threshold (0.1 to 0.9, higher is stricter)</label>
        <input className="input w-32" type="number" step="0.05" min="0.1" max="0.9" value={threshold} onChange={e => setThreshold(e.target.value)} />
        <button className="btn-primary self-start" disabled={busy || !groupFiles.length} onClick={doGroup}>Group photos</button>
        {grouped && (
          <>
            {grouped.message && <div className="text-sm">{grouped.message}</div>}
            <ul className="text-sm">
              {grouped.groups.map(g => <li key={g.group}>Group {g.group}: {g.count} photo(s)</li>)}
            </ul>
            {grouped.rejected.length > 0 && <div className="text-xs">Rejected: {grouped.rejected.join('; ')}</div>}
            {grouped.errors.length > 0 && <div className="text-xs">Skipped: {grouped.errors.join('; ')}</div>}
            <label className="label">Assign a cow ID to each group (one per line)</label>
            <textarea className="input font-mono" rows={4} value={assign} onChange={e => setAssign(e.target.value)} />
            <button className="btn-primary self-start" disabled={busy || !grouped.session} onClick={doSave}>Save assigned groups</button>
          </>
        )}
      </div>
    </div>
  );
}

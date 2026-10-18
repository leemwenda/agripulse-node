import { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';

type Tab = 'identify' | 'register' | 'group';
type Tone = 'ok' | 'err' | 'info';
interface Notice { tone: Tone; text: string }

interface Animal { id: number; name: string; tagNumber: string; agripulseId: string | null; status: string }
interface Review { id: number; decision: string; reason: string | null; createdAt: string; reviewerName: string | null }
interface Candidate {
  id: number;
  rank: number;
  similarity: number;
  referenceIndex: number | null;
  animal: Animal | null;
  previewUrl: string | null;
  reviews: Review[];
}
interface QueryState { id: number; photoUrl: string }
interface QueueItem { id: number; createdAt: string; candidateCount: number; awaitingReview: number }
interface Workspace {
  model: { connected: boolean; device?: string; threshold?: number; model?: string };
  candidates: number;
  awaitingReview: number;
  queries: QueueItem[];
}
interface GroupResult {
  groups: { group: number; count: number; photoIndexes: number[]; files: string[] }[];
  rejected: string[];
  errors: string[];
  message?: string;
}

const MULTI = { headers: { 'Content-Type': 'multipart/form-data' } };
const MIN_REASON = 10;
const DECISIONS = [
  { value: 'same_animal', label: 'Same animal' },
  { value: 'different_animals', label: 'Different animals' },
  { value: 'inconclusive', label: 'Inconclusive' },
] as const;
const DECISION_LABEL: Record<string, string> = Object.fromEntries(DECISIONS.map(d => [d.value, d.label]));

const CARD: React.CSSProperties = {
  border: '1px solid rgba(128,128,128,.25)',
  borderRadius: 12,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

// The api client already has baseURL '/api', so strip it from server-provided paths.
const apiPath = (u: string) => u.replace(/^\/api/, '');

function errText(e: any, fallback: string): string {
  const s = e?.response?.status;
  if (s === 401 || s === 403) return 'This session does not have Super Admin access. Sign in again.';
  if (s === 503) return 'The cow re-identification model is offline. Start the laptop service and the SSH tunnel.';
  if (s === 502) return 'The model service rejected the request. Check the laptop service log.';
  return e?.response?.data?.error || fallback;
}

function animalLine(a: Animal | null): string {
  if (!a) return 'Animal record no longer exists';
  return `${a.name} · tag ${a.tagNumber} · ID ${a.id}${a.agripulseId ? ` · ${a.agripulseId}` : ''}`;
}

function useProtectedUrl(path: string | null) {
  const [state, setState] = useState<{ url: string | null; error: boolean }>({ url: null, error: false });
  useEffect(() => {
    if (!path) { setState({ url: null, error: false }); return; }
    let alive = true;
    let created: string | null = null;
    setState({ url: null, error: false });
    api.get(apiPath(path), { responseType: 'blob' })
      .then(r => {
        if (!alive) return;
        created = URL.createObjectURL(r.data);
        setState({ url: created, error: false });
      })
      .catch(() => { if (alive) setState({ url: null, error: true }); });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [path]);
  return state;
}

function ProtectedPhoto({ path, alt }: { path: string | null; alt: string }) {
  const { url, error } = useProtectedUrl(path);
  const box: React.CSSProperties = {
    width: '100%', aspectRatio: '4 / 3', borderRadius: 10, overflow: 'hidden',
    background: 'rgba(128,128,128,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  if (!path) return <div style={box}><span className="text-xs text-gray-500">No photo available</span></div>;
  if (error) return <div style={box}><span className="text-xs text-red-500">Photo unavailable</span></div>;
  if (!url) return <div style={box}><span className="text-xs text-gray-500">Loading photo…</span></div>;
  return (
    <div style={box}>
      <img src={url} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}

function ReviewPanel({ busy, onSubmit }: { busy: boolean; onSubmit: (decision: string, reason: string) => Promise<boolean> }) {
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const valid = !!decision && trimmed.length >= MIN_REASON;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold">Your decision</div>
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map(d => (
          <button
            key={d.value}
            type="button"
            aria-pressed={decision === d.value}
            onClick={() => setDecision(d.value)}
            className="btn-secondary text-xs"
            style={{ outline: decision === d.value ? '2px solid #15803d' : 'none', fontWeight: decision === d.value ? 700 : 500 }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <textarea
        className="input text-sm"
        rows={2}
        placeholder="Reason, e.g. ear tag and white patch match"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      {reason.length > 0 && trimmed.length < MIN_REASON && (
        <span className="text-xs text-gray-500">{MIN_REASON - trimmed.length} more characters needed.</span>
      )}
      <button
        type="button"
        className="btn-primary self-start text-xs"
        disabled={busy || !valid}
        onClick={async () => {
          const ok = await onSubmit(decision, trimmed);
          if (ok) { setDecision(''); setReason(''); }
        }}
      >
        {busy ? 'Saving…' : 'Save review'}
      </button>
    </div>
  );
}

function CandidateCard({
  c, threshold, busy, onReview,
}: {
  c: Candidate;
  threshold: number | undefined;
  busy: boolean;
  onReview: (c: Candidate, decision: string, reason: string) => Promise<boolean>;
}) {
  const above = threshold !== undefined && c.similarity >= threshold;
  return (
    <div style={CARD}>
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <span className="text-sm font-bold">Rank #{c.rank}</span>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 rounded border border-gray-300">
            Cosine similarity <strong>{c.similarity.toFixed(3)}</strong>
          </span>
          {threshold !== undefined && (
            <span className="px-2 py-0.5 rounded border border-gray-300">
              {above ? 'Above' : 'Below'} model threshold {threshold.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Registered reference photo</div>
          <ProtectedPhoto path={c.previewUrl} alt={`Reference photo for ${c.animal?.name ?? 'animal'}`} />
        </div>
        <div className="flex flex-col gap-1 justify-center">
          <div className="text-sm font-bold">{c.animal?.name ?? 'Animal record missing'}</div>
          <div className="text-xs text-gray-500">{animalLine(c.animal)}</div>
          <div className="text-xs text-gray-500 mt-2">
            Model signal only. Similarity ranks candidates; it is not proof that the photos show the same animal.
          </div>
          {!c.previewUrl && (
            <div className="text-xs text-amber-600 mt-2">
              No preview: this reference was registered before previews were stored.
            </div>
          )}
        </div>
      </div>

      {c.reviews.length > 0 ? (
        <div className="text-xs flex flex-col gap-1">
          <div className="font-bold">Review history</div>
          {c.reviews.map(r => (
            <div key={r.id} className="border-l-2 border-gray-300 pl-2">
              <strong>{DECISION_LABEL[r.decision] ?? r.decision}</strong>
              {' · '}{r.reviewerName ?? 'Unknown reviewer'}{' · '}{new Date(r.createdAt).toLocaleString()}
              {r.reason && <div className="text-gray-500">{r.reason}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Not reviewed yet.</div>
      )}

      <ReviewPanel busy={busy} onSubmit={(decision, reason) => onReview(c, decision, reason)} />
    </div>
  );
}

function RegisterPanel({
  animals, disabled, report, onSaved,
}: {
  animals: Animal[];
  disabled: boolean;
  report: (n: Notice) => void;
  onSaved: () => void;
}) {
  const [animalId, setAnimalId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = animals.find(a => String(a.id) === animalId) ?? null;

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('animalId', String(selected.id));
      fd.append('confirmed', 'true');
      files.forEach(f => fd.append('photos', f));
      const { data } = await api.post('/admin/reid/register', fd, MULTI);
      const extra = [
        data.rejected?.length ? `Rejected: ${data.rejected.join('; ')}` : '',
        data.errors?.length ? `Skipped: ${data.errors.join('; ')}` : '',
      ].filter(Boolean).join(' ');
      report({
        tone: data.saved > 0 ? 'ok' : 'info',
        text: `Saved ${data.saved} photo(s) to ${selected.name} (tag ${selected.tagNumber}). Reference photos now: ${data.totalReference ?? 'n/a'}. ${extra}`.trim(),
      });
      setFiles([]);
      setConfirmed(false);
      onSaved();
    } catch (e) {
      report({ tone: 'err', text: errText(e, 'Registration failed.') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={CARD}>
      <div className="text-sm font-bold">Register reference photos for an animal</div>
      <div className="text-xs text-gray-500">
        Reference photos are stored for matching. Choose the real animal record first. Nothing is registered automatically.
      </div>
      <label className="label">Animal record</label>
      <select className="input" value={animalId} onChange={e => setAnimalId(e.target.value)} disabled={disabled}>
        <option value="">Select an animal…</option>
        {animals.map(a => (
          <option key={a.id} value={a.id}>{animalLine(a)}</option>
        ))}
      </select>
      <input
        type="file"
        accept="image/*"
        multiple
        className="input py-1.5"
        disabled={disabled}
        onChange={e => setFiles(Array.from(e.target.files || []))}
      />
      <label className="text-xs flex gap-2 items-start">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={disabled} />
        I confirm these photos show {selected ? `${selected.name} (tag ${selected.tagNumber})` : 'the selected animal'}.
      </label>
      <button
        type="button"
        className="btn-primary self-start"
        disabled={disabled || busy || !selected || files.length === 0 || !confirmed}
        onClick={save}
      >
        {busy ? 'Saving…' : `Register ${files.length || ''} photo(s)`.trim()}
      </button>
    </div>
  );
}

function GroupPanel({
  animals, disabled, report, onSaved,
}: {
  animals: Animal[];
  disabled: boolean;
  report: (n: Notice) => void;
  onSaved: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [threshold, setThreshold] = useState('0.5');
  const [result, setResult] = useState<GroupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [assign, setAssign] = useState<Record<number, string>>({});
  const [confirmedGroups, setConfirmedGroups] = useState<Record<number, boolean>>({});
  const [savedGroups, setSavedGroups] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setThumbs(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const t = Number(threshold);
  const thresholdOk = Number.isFinite(t) && t >= 0.1 && t <= 0.9;

  const propose = async () => {
    setBusy(true);
    setResult(null);
    setAssign({});
    setConfirmedGroups({});
    setSavedGroups({});
    try {
      const fd = new FormData();
      fd.append('threshold', threshold);
      files.forEach(f => fd.append('photos', f));
      const { data } = await api.post('/admin/reid/group', fd, MULTI);
      setResult(data);
      if (!data.groups?.length) report({ tone: 'info', text: data.message || 'No groups were proposed.' });
    } catch (e) {
      report({ tone: 'err', text: errText(e, 'Grouping failed.') });
    } finally {
      setBusy(false);
    }
  };

  // Registers one proposed group to one real animal. Uses the same confirmed register endpoint.
  const saveGroup = async (g: GroupResult['groups'][number]) => {
    const animalId = assign[g.group];
    const animal = animals.find(a => String(a.id) === animalId);
    if (!animal) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('animalId', String(animal.id));
      fd.append('confirmed', 'true');
      g.photoIndexes.forEach(i => { if (files[i]) fd.append('photos', files[i]); });
      const { data } = await api.post('/admin/reid/register', fd, MULTI);
      report({
        tone: data.saved > 0 ? 'ok' : 'info',
        text: `Group ${g.group}: saved ${data.saved} photo(s) to ${animal.name} (tag ${animal.tagNumber}).`,
      });
      setSavedGroups(s => ({ ...s, [g.group]: true }));
      onSaved();
    } catch (e) {
      report({ tone: 'err', text: errText(e, `Group ${g.group} could not be saved.`) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div style={CARD}>
        <div className="text-sm font-bold">Group unsorted photos</div>
        <div className="text-xs text-gray-500">
          The model proposes groups of photos that look alike. Groups are not saved. Assign each group to a real animal and confirm it.
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="input py-1.5"
          disabled={disabled}
          onChange={e => { setFiles(Array.from(e.target.files || [])); setResult(null); }}
        />
        <label className="label">Similarity threshold (0.1 to 0.9, higher is stricter)</label>
        <input
          className="input w-32"
          type="number"
          step="0.05"
          min="0.1"
          max="0.9"
          value={threshold}
          onChange={e => setThreshold(e.target.value)}
          disabled={disabled}
        />
        {!thresholdOk && <div className="text-xs text-red-500">Threshold must be between 0.1 and 0.9.</div>}
        <button
          type="button"
          className="btn-primary self-start"
          disabled={disabled || busy || files.length === 0 || !thresholdOk}
          onClick={propose}
        >
          {busy ? 'Working…' : 'Propose groups'}
        </button>
      </div>

      {result?.groups.map(g => (
        <div key={g.group} style={CARD}>
          <div className="flex justify-between flex-wrap gap-2">
            <span className="text-sm font-bold">Proposed group {g.group}</span>
            <span className="text-xs text-gray-500">{g.count} photo(s) · not saved yet</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {g.photoIndexes.map(i => (
              <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', background: 'rgba(128,128,128,.08)' }}>
                {thumbs[i] && <img src={thumbs[i]} alt={files[i]?.name ?? 'photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            ))}
          </div>
          {savedGroups[g.group] ? (
            <div className="text-xs text-green-600">Saved to an animal record.</div>
          ) : (
            <>
              <select
                className="input"
                value={assign[g.group] ?? ''}
                onChange={e => setAssign(p => ({ ...p, [g.group]: e.target.value }))}
                disabled={disabled}
              >
                <option value="">Select the animal this group shows…</option>
                {animals.map(a => <option key={a.id} value={a.id}>{animalLine(a)}</option>)}
              </select>
              <label className="text-xs flex gap-2 items-start">
                <input
                  type="checkbox"
                  checked={!!confirmedGroups[g.group]}
                  onChange={e => setConfirmedGroups(p => ({ ...p, [g.group]: e.target.checked }))}
                  disabled={disabled}
                />
                I confirm all photos in this group show the selected animal.
              </label>
              <button
                type="button"
                className="btn-primary self-start"
                disabled={disabled || busy || !assign[g.group] || !confirmedGroups[g.group]}
                onClick={() => saveGroup(g)}
              >
                Register this group
              </button>
            </>
          )}
        </div>
      ))}

      {result && (result.rejected.length > 0 || result.errors.length > 0) && (
        <div style={CARD} className="text-xs">
          {result.rejected.length > 0 && <div>Rejected as not cattle: {result.rejected.join('; ')}</div>}
          {result.errors.length > 0 && <div>Skipped: {result.errors.join('; ')}</div>}
        </div>
      )}
    </div>
  );
}

export function ReidTab() {
  const [tab, setTab] = useState<Tab>('identify');
  const [ws, setWs] = useState<Workspace | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [animalsError, setAnimalsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [idFile, setIdFile] = useState<File | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [query, setQuery] = useState<QueryState | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reviewBusyId, setReviewBusyId] = useState<number | null>(null);

  const modelOnline = !!ws?.model.connected;
  const threshold = ws?.model.threshold;

  const loadWorkspace = useCallback(async () => {
    try {
      setWsError(null);
      const { data } = await api.get('/admin/reid/workspace');
      setWs(data);
    } catch (e) {
      setWsError(errText(e, 'Could not load the review workspace.'));
    }
  }, []);

  const loadAnimals = useCallback(async () => {
    try {
      setAnimalsError(null);
      const { data } = await api.get('/admin/reid/animals');
      setAnimals(data.animals || []);
    } catch (e) {
      setAnimalsError(errText(e, 'Could not load animal records.'));
    }
  }, []);

  useEffect(() => {
    loadWorkspace();
    loadAnimals();
  }, [loadWorkspace, loadAnimals]);

  const fetchQuery = useCallback(async (id: number) => {
    const { data } = await api.get(`/admin/reid/queries/${id}`);
    setQuery({ id, photoUrl: data.query.photoUrl });
    setCandidates(data.candidates || []);
  }, []);

  const openQuery = async (id: number) => {
    setNotice(null);
    try {
      await fetchQuery(id);
    } catch (e) {
      setNotice({ tone: 'err', text: errText(e, 'Could not open that query.') });
    }
  };

  const identify = async () => {
    if (!idFile) return;
    setIdentifying(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append('photo', idFile);
      const { data: d } = await api.post('/admin/reid/identify', fd, MULTI);
      if (d.status === 'not_cattle') {
        setQuery(null);
        setCandidates([]);
        setNotice({ tone: 'info', text: `Not identified. This photo looks like "${d.label ?? 'something else'}", not cattle. Upload a clear photo of the cow.` });
      } else if (d.status === 'empty') {
        setQuery(null);
        setCandidates([]);
        setNotice({ tone: 'info', text: 'No registered animal has reference photos yet. Register photos first.' });
      } else if (d.queryId) {
        setQuery({ id: d.queryId, photoUrl: `/api/admin/reid/queries/${d.queryId}/photo` });
        setCandidates(d.candidates || []);
        setNotice(
          d.candidates?.length
            ? { tone: 'ok', text: `${d.candidates.length} candidate(s) ranked. Review each one. Nothing is recorded until you decide.` }
            : { tone: 'info', text: 'No candidates matched registered animals that have usable photos.' },
        );
      }
      setIdFile(null);
      await loadWorkspace();
    } catch (e) {
      setNotice({ tone: 'err', text: errText(e, 'Identification failed.') });
    } finally {
      setIdentifying(false);
    }
  };

  const submitReview = async (c: Candidate, decision: string, reason: string): Promise<boolean> => {
    setReviewBusyId(c.id);
    setNotice(null);
    try {
      await api.post(`/admin/reid/candidates/${c.id}/review`, { decision, reason });
      if (query) await fetchQuery(query.id);
      await loadWorkspace();
      setNotice({
        tone: 'ok',
        text: `Saved "${DECISION_LABEL[decision]}" for rank #${c.rank}. Animal records and fraud review status were not changed.`,
      });
      return true;
    } catch (e) {
      setNotice({ tone: 'err', text: errText(e, 'Could not save the review.') });
      return false;
    } finally {
      setReviewBusyId(null);
    }
  };

  const afterChange = () => { loadWorkspace(); loadAnimals(); };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'identify', label: 'Identify' },
    { id: 'register', label: 'Register photos' },
    { id: 'group', label: 'Group photos' },
  ];

  const noticeStyle = (tone: Tone): React.CSSProperties => ({
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    border: `1px solid ${tone === 'err' ? '#fca5a5' : tone === 'ok' ? '#86efac' : 'rgba(128,128,128,.35)'}`,
    background: tone === 'err' ? 'rgba(239,68,68,.08)' : tone === 'ok' ? 'rgba(34,197,94,.08)' : 'rgba(128,128,128,.06)',
  });

  return (
    <section aria-labelledby="reid-title" className="flex flex-col gap-4">
      <header>
        <h2 id="reid-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cow Re-identification</h2>
        <p className="text-sm text-gray-500">AI-assisted animal matching and verification. Human verification required.</p>
      </header>

      {/* Summary strip: every value comes from the backend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div style={CARD}>
          <div className="text-xs text-gray-500">Candidates</div>
          <div className="text-xl font-bold">{ws ? ws.candidates : '—'}</div>
        </div>
        <div style={CARD}>
          <div className="text-xs text-gray-500">Awaiting review</div>
          <div className="text-xl font-bold">{ws ? ws.awaitingReview : '—'}</div>
        </div>
        <div style={CARD}>
          <div className="text-xs text-gray-500">Model status</div>
          <div className="text-xl font-bold" style={{ color: ws ? (modelOnline ? '#15803d' : '#b91c1c') : undefined }}>
            {!ws && !wsError ? 'Checking…' : modelOnline ? 'Connected' : 'Offline'}
          </div>
          {modelOnline && (
            <div className="text-xs text-gray-500">
              {ws?.model.model ?? 'model'} · threshold {threshold?.toFixed(2)} · {ws?.model.device}
            </div>
          )}
        </div>
      </div>

      {ws && !modelOnline && (
        <div style={noticeStyle('err')} role="alert">
          The model service is offline. Identify, Register and Group are disabled until the laptop service and tunnel are running.
          Saved reviews remain available.
        </div>
      )}
      {wsError && <div style={noticeStyle('err')} role="alert">{wsError}</div>}
      {animalsError && <div style={noticeStyle('err')} role="alert">{animalsError}</div>}
      {notice && <div style={noticeStyle(notice.tone)} role="status">{notice.text}</div>}

      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="btn-secondary text-sm"
            style={{ fontWeight: tab === t.id ? 700 : 500, outline: tab === t.id ? '2px solid #15803d' : 'none' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'identify' && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <aside className="flex flex-col gap-4">
            <div style={CARD}>
              <div className="text-sm font-bold">Upload a cow photograph</div>
              <div className="text-xs text-gray-500">Use a clear photo with the whole cow visible.</div>
              <input
                type="file"
                accept="image/*"
                className="input py-1.5"
                disabled={!modelOnline}
                onChange={e => setIdFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                className="btn-primary self-start"
                disabled={!modelOnline || !idFile || identifying}
                onClick={identify}
              >
                {identifying ? 'Analysing…' : 'Find candidate matches'}
              </button>
            </div>

            <div style={CARD}>
              <div className="text-sm font-bold">Recent queries</div>
              {!ws || ws.queries.length === 0 ? (
                <div className="text-xs text-gray-500">No queries yet.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {ws.queries.map(q => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => openQuery(q.id)}
                      className="text-left text-xs p-2 rounded border border-gray-300"
                      style={{ outline: query?.id === q.id ? '2px solid #15803d' : 'none' }}
                    >
                      <div className="font-bold">Query #{q.id}</div>
                      <div className="text-gray-500">
                        {new Date(q.createdAt).toLocaleString()} · {q.candidateCount} candidate(s) · {q.awaitingReview} awaiting review
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="flex flex-col gap-4">
            {!query ? (
              <div style={CARD} className="text-sm text-gray-500">
                Upload a cow photograph to see candidate matches from registered animals.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
                <div style={CARD} className="xl:sticky xl:top-4 self-start">
                  <div className="text-sm font-bold">Uploaded photo</div>
                  <ProtectedPhoto path={query.photoUrl} alt={`Uploaded query photo ${query.id}`} />
                  <div className="text-xs text-gray-500">Query #{query.id}</div>
                </div>
                <div className="flex flex-col gap-4">
                  {candidates.length === 0 ? (
                    <div style={CARD} className="text-sm text-gray-500">No candidates for this query.</div>
                  ) : (
                    candidates.map(c => (
                      <CandidateCard
                        key={c.id}
                        c={c}
                        threshold={threshold}
                        busy={reviewBusyId === c.id}
                        onReview={submitReview}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {tab === 'register' && (
        <RegisterPanel animals={animals} disabled={!modelOnline} report={setNotice} onSaved={afterChange} />
      )}

      {tab === 'group' && (
        <GroupPanel animals={animals} disabled={!modelOnline} report={setNotice} onSaved={afterChange} />
      )}
    </section>
  );
}

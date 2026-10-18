import { useCallback, useEffect, useState } from 'react';
import api from '../../lib/api';

type Tab = 'identify' | 'register' | 'group';
type Tone = 'ok' | 'err' | 'info';
interface Notice { tone: Tone; text: string }

interface Animal { id: number; name: string; tagNumber: string; agripulseId: string | null; status: string }
interface StoredPhoto { id: number; isPrimary: boolean; fileUrl: string }
interface StoredAnimal extends Animal { photos: StoredPhoto[] }
interface Picked { ids: number[]; owners: Record<number, Animal> }
interface Review { id: number; decision: string; reason: string | null; createdAt: string; reviewerName: string | null }
interface Candidate {
  id: number; rank: number; similarity: number; referenceIndex: number | null;
  animal: Animal | null; previewUrl: string | null; reviews: Review[];
}
interface QueryState { id: number; photoUrl: string }
interface Workspace {
  model: { connected: boolean; device?: string; threshold?: number; model?: string };
  candidates: number;
  awaitingReview: number;
  queries: { id: number; createdAt: string; candidateCount: number; awaitingReview: number }[];
}
interface GroupResult {
  groups: {
    group: number;
    crossRecord: boolean;
    photos: { photoId: number; animalId: number; animalName: string | null; tagNumber: string | null; fileUrl: string }[];
  }[];
  rejected: string[];
  errors: string[];
}

const MULTI = { headers: { 'Content-Type': 'multipart/form-data' } };
const PHOTO_LIMIT = 100;
const MIN_REASON = 10;
const EMPTY_PICK: Picked = { ids: [], owners: {} };
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
            <div className="text-xs text-amber-600 mt-2">No preview stored for this reference.</div>
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

// Browses stored AgriPulse animal photos. Emits the selected photo ids and the animal that owns each one.
function PhotoBrowser({
  maxPhotos, singleAnimal, onChange,
}: {
  maxPhotos: number;
  singleAnimal: boolean;
  onChange: (p: Picked) => void;
}) {
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');
  const [animals, setAnimals] = useState<StoredAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, Animal>>({});

  useEffect(() => {
    const t = setTimeout(() => setTerm(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Keeps the previous list on screen while a new search loads, so tiles don't collapse.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    api.get('/admin/reid/animals-with-photos', { params: term ? { q: term } : undefined })
      .then(r => { if (alive) setAnimals(r.data.animals || []); })
      .catch(e => { if (alive) setLoadError(errText(e, 'Could not load animal photos.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [term]);

  useEffect(() => {
    onChange({ ids: Object.keys(picked).map(Number).sort((a, b) => a - b), owners: picked });
  }, [picked, onChange]);

  const cur = animals.find(a => a.id === activeId) ?? animals[0] ?? null;
  const count = Object.keys(picked).length;
  const owners = new Set(Object.values(picked).map(a => a.id)).size;

  const toggle = (a: StoredAnimal, p: StoredPhoto) => {
    setPicked(prev => {
      if (prev[p.id]) {
        const next = { ...prev };
        delete next[p.id];
        return next;
      }
      if (maxPhotos === 1) return { [p.id]: a };
      const others = Object.values(prev);
      if (singleAnimal && others.length > 0 && others[0].id !== a.id) return { [p.id]: a };
      if (others.length >= maxPhotos) return prev;
      return { ...prev, [p.id]: a };
    });
  };

  const selectAllLoaded = () => {
    const next: Record<number, Animal> = {};
    let n = 0;
    for (const a of animals) {
      for (const p of a.photos) {
        if (n >= maxPhotos) break;
        next[p.id] = a;
        n++;
      }
    }
    setPicked(next);
  };

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <input
        className="input w-full"
        placeholder="Search by name, tag number or AgriPulse ID"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {loadError && <div className="text-xs text-red-500">{loadError}</div>}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500">
          {count} photo(s) from {owners} animal record(s) selected{maxPhotos < PHOTO_LIMIT ? ` (max ${maxPhotos})` : ''}.
          {loading && ' Searching…'}
        </span>
        {count > 0 && <button type="button" className="btn-secondary text-xs" onClick={() => setPicked({})}>Clear</button>}
        {!singleAnimal && maxPhotos > 1 && animals.length > 0 && (
          <button type="button" className="btn-secondary text-xs" onClick={selectAllLoaded}>
            Select all loaded (up to {PHOTO_LIMIT})
          </button>
        )}
      </div>

      {!loading && animals.length === 0 && (
        <div className="text-xs text-gray-500">No animals with photos match this search.</div>
      )}

      {/* Stacks on phones: animals scroll sideways above the photos. Side by side from md up. */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-3 min-w-0">
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[420px] min-w-0 pb-1">
          {animals.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActiveId(a.id)}
              className="shrink-0 md:shrink text-left text-xs p-2 rounded border border-gray-300 w-44 md:w-auto"
              style={{ outline: cur?.id === a.id ? '2px solid #15803d' : 'none' }}
            >
              <span className="block font-bold truncate">{a.name}</span>
              <span className="block text-gray-500 truncate">
                tag {a.tagNumber} · {a.photos.length} photo(s)
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 min-w-0 content-start">
          {cur && cur.photos.map(p => {
            const on = !!picked[p.id];
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(cur, p)}
                className="flex flex-col min-w-0 w-full text-left overflow-hidden rounded-lg"
                style={{ border: on ? '2px solid #15803d' : '1px solid rgba(128,128,128,.3)', background: 'transparent', padding: 0 }}
              >
                <ProtectedPhoto path={p.fileUrl} alt={`${cur.name} photo ${p.id}`} />
                <span className="flex justify-between items-center gap-1 px-2 py-1 text-[11px]">
                  <span className="truncate">{p.isPrimary ? 'Primary' : `Photo ${p.id}`}</span>
                  {on && <span className="shrink-0 font-bold text-green-700">Selected</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ReidTab() {
  const [tab, setTab] = useState<Tab>('identify');
  const [ws, setWs] = useState<Workspace | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  const [idPick, setIdPick] = useState<Picked>(EMPTY_PICK);
  const [query, setQuery] = useState<QueryState | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reviewBusyId, setReviewBusyId] = useState<number | null>(null);

  const [regPick, setRegPick] = useState<Picked>(EMPTY_PICK);
  const [regConfirmed, setRegConfirmed] = useState(false);

  const [grpPick, setGrpPick] = useState<Picked>(EMPTY_PICK);
  const [grpThreshold, setGrpThreshold] = useState('0.5');
  const [grpConfirmed, setGrpConfirmed] = useState(false);
  const [groups, setGroups] = useState<GroupResult | null>(null);

  const modelOnline = !!ws?.model.connected;
  const threshold = ws?.model.threshold;
  const regOwner: Animal | undefined = regPick.owners[regPick.ids[0]];
  const grpOwners = new Set(Object.values(grpPick.owners).map(a => a.id)).size;
  const grpT = Number(grpThreshold);
  const grpTOk = Number.isFinite(grpT) && grpT >= 0.1 && grpT <= 0.9;

  const loadWorkspace = useCallback(async () => {
    try {
      setWsError(null);
      const { data } = await api.get('/admin/reid/workspace');
      setWs(data);
    } catch (e) {
      setWsError(errText(e, 'Could not load the review workspace.'));
    }
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

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
    const photoId = idPick.ids[0];
    if (!photoId) return;
    setBusy(true);
    setNotice(null);
    setGroups(null);
    try {
      const { data: d } = await api.post('/admin/reid/identify-from-db', { photoId });
      if (d.status === 'not_cattle') {
        setQuery(null);
        setCandidates([]);
        setNotice({ tone: 'info', text: `Not identified. This photo looks like "${d.label ?? 'something else'}", not cattle.` });
      } else if (d.status === 'empty') {
        setQuery(null);
        setCandidates([]);
        setNotice({ tone: 'info', text: 'No animal record has reference photos yet. Add reference photos first.' });
      } else if (d.queryId) {
        setQuery({ id: d.queryId, photoUrl: `/api/admin/reid/queries/${d.queryId}/photo` });
        setCandidates(d.candidates || []);
        setNotice(
          d.candidates?.length
            ? { tone: 'ok', text: `${d.candidates.length} candidate(s) ranked against other animal records. The photo's own record was excluded. Nothing is recorded until you decide.` }
            : { tone: 'info', text: 'No other animal record has a usable reference photo to compare against.' },
        );
      }
      await loadWorkspace();
    } catch (e) {
      setNotice({ tone: 'err', text: errText(e, 'Identification failed.') });
    } finally {
      setBusy(false);
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

  const addReferences = async () => {
    if (!regOwner || !regConfirmed || regPick.ids.length === 0) return;
    setBusy(true);
    setNotice(null);
    try {
      const { data } = await api.post('/admin/reid/register-from-db', {
        animalId: regOwner.id,
        photoIds: regPick.ids,
        confirmed: true,
      });
      setNotice({
        tone: data.saved > 0 ? 'ok' : 'info',
        text: `Added ${data.saved} reference view(s) for ${regOwner.name} (tag ${regOwner.tagNumber}). Reference views now: ${data.totalReference ?? 'n/a'}.`
          + (data.rejected?.length ? ` Rejected as not cattle: ${data.rejected.join('; ')}` : ''),
      });
      setRegConfirmed(false);
      setPickerKey(k => k + 1);
      await loadWorkspace();
    } catch (e) {
      setNotice({ tone: 'err', text: errText(e, 'Could not add reference photos.') });
    } finally {
      setBusy(false);
    }
  };

  const proposeGroups = async () => {
    if (grpPick.ids.length === 0 || !grpConfirmed || !grpTOk) return;
    setBusy(true);
    setNotice(null);
    setGroups(null);
    try {
      const { data } = await api.post('/admin/reid/group-from-db', {
        photoIds: grpPick.ids,
        threshold: grpT,
      });
      setGroups(data);
      if (!data.groups?.length) setNotice({ tone: 'info', text: 'No groups were proposed.' });
    } catch (e) {
      setNotice({ tone: 'err', text: errText(e, 'Grouping failed.') });
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'identify', label: 'Identify' },
    { id: 'register', label: 'Add reference photos' },
    { id: 'group', label: 'Compare photos' },
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
        <p className="text-sm text-gray-500">
          Uses photos already stored in AgriPulse. AI-assisted matching; human verification required.
        </p>
      </header>

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
          The model service is offline. Browsing photos still works. Identify, adding reference photos and comparisons are
          disabled until the laptop service and tunnel are running. Saved reviews remain available.
        </div>
      )}
      {wsError && <div style={noticeStyle('err')} role="alert">{wsError}</div>}
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
        <div className="flex flex-col gap-4">
          <div style={CARD}>
            <div className="text-sm font-bold">1. Select one stored photo</div>
            <div className="text-xs text-gray-500">
              Search an animal, then click one of its photos. The model compares it with other animal records.
            </div>
            <PhotoBrowser maxPhotos={1} singleAnimal onChange={setIdPick} />
            <button
              type="button"
              className="btn-primary self-start"
              disabled={!modelOnline || busy || idPick.ids.length === 0}
              onClick={identify}
            >
              {busy ? 'Analysing…' : 'Find candidate matches'}
            </button>
          </div>

          {query && (
            <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
              <div style={CARD} className="xl:sticky xl:top-4 self-start">
                <div className="text-sm font-bold">Query photo</div>
                <ProtectedPhoto path={query.photoUrl} alt={`Query photo ${query.id}`} />
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

          <div style={CARD}>
            <div className="text-sm font-bold">Recent queries</div>
            {!ws || ws.queries.length === 0 ? (
              <div className="text-xs text-gray-500">No queries yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>
      )}

      {tab === 'register' && (
        <div style={CARD}>
          <div className="text-sm font-bold">Add stored photos as reference views</div>
          <div className="text-xs text-gray-500">
            Choose one animal record and the photos that show it. Several views of the same animal improve matching.
            The animal record itself is not changed.
          </div>
          <PhotoBrowser key={pickerKey} maxPhotos={PHOTO_LIMIT} singleAnimal onChange={setRegPick} />
          {regOwner && <div className="text-xs">Animal: <strong>{animalLine(regOwner)}</strong></div>}
          <label className="text-xs flex gap-2 items-start">
            <input type="checkbox" checked={regConfirmed} onChange={e => setRegConfirmed(e.target.checked)} />
            I confirm the selected photos show {regOwner ? `${regOwner.name} (tag ${regOwner.tagNumber})` : 'the selected animal'}.
          </label>
          <button
            type="button"
            className="btn-primary self-start"
            disabled={!modelOnline || busy || !regOwner || !regConfirmed}
            onClick={addReferences}
          >
            Add {regPick.ids.length || ''} reference view(s)
          </button>
        </div>
      )}

      {tab === 'group' && (
        <div className="flex flex-col gap-4">
          <div style={CARD}>
            <div className="text-sm font-bold">Compare stored photos</div>
            <div className="text-xs text-gray-500">
              The model proposes groups of photos that look alike. Groups that span several animal records are flagged
              for review. Nothing is saved or merged.
            </div>
            <PhotoBrowser maxPhotos={PHOTO_LIMIT} singleAnimal={false} onChange={setGrpPick} />
            <label className="label">Similarity threshold (0.1 to 0.9, higher is stricter)</label>
            <input
              className="input w-32"
              type="number"
              step="0.05"
              min="0.1"
              max="0.9"
              value={grpThreshold}
              onChange={e => setGrpThreshold(e.target.value)}
            />
            {!grpTOk && <div className="text-xs text-red-500">Threshold must be between 0.1 and 0.9.</div>}
            <div className="text-xs">
              Summary: {grpPick.ids.length} photo(s) from {grpOwners} animal record(s) will be compared.
              {grpPick.ids.length >= 50 && ' Large batches can take several minutes.'}
            </div>
            <label className="text-xs flex gap-2 items-start">
              <input type="checkbox" checked={grpConfirmed} onChange={e => setGrpConfirmed(e.target.checked)} />
              I understand these suggestions are for review only and no animal record will be changed.
            </label>
            <button
              type="button"
              className="btn-primary self-start"
              disabled={!modelOnline || busy || grpPick.ids.length === 0 || !grpConfirmed || !grpTOk}
              onClick={proposeGroups}
            >
              {busy ? 'Comparing…' : 'Compare selected photos'}
            </button>
          </div>

          {groups?.groups.map(g => (
            <div key={g.group} style={CARD}>
              <div className="flex justify-between flex-wrap gap-2">
                <span className="text-sm font-bold">Proposed group {g.group}</span>
                <span className="text-xs text-gray-500">{g.photos.length} photo(s)</span>
              </div>
              {g.crossRecord && (
                <div className="text-xs text-amber-600">
                  Photos from more than one animal record look alike. This may be the same cow listed twice. It is a review item only.
                  Nothing was merged or changed.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {g.photos.map(p => (
                  <div key={p.photoId}>
                    <ProtectedPhoto path={p.fileUrl} alt={`${p.animalName ?? 'Animal'} photo ${p.photoId}`} />
                    <div className="text-xs text-gray-500 mt-1">
                      {p.animalName ?? 'Animal record missing'} · tag {p.tagNumber ?? '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groups && (groups.rejected.length > 0 || groups.errors.length > 0) && (
            <div style={CARD} className="text-xs">
              {groups.rejected.length > 0 && <div>Rejected as not cattle: {groups.rejected.join('; ')}</div>}
              {groups.errors.length > 0 && <div>Skipped: {groups.errors.join('; ')}</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

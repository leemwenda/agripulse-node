import { useCallback, useEffect, useMemo, useState } from 'react';
import { startBackfill } from './api';
import { DEFAULT_FILTERS, KNOWN_FLAGS, METADATA_OPTIONS, SOURCE_OPTIONS } from './constants';
import { describeError } from './errors';
import { FilterBar } from './FilterBar';
import { ImageDetailDrawer } from './ImageDetailDrawer';
import { ImageGallery, Pagination } from './ImageGallery';
import { useDebounced, useImageList, useImageStats } from './hooks';
import { StatsPanel } from './StatsPanel';
import { IMAGE_INTELLIGENCE_CSS } from './styles';
import type { ImageFilters } from './types';
import { ReidTab } from '../reid/ReidTab';

function backfillMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string' && d.message.trim()) return d.message;
    const counts = Object.entries(d).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k}: ${v}`);
    if (counts.length) return `Backfill finished (${counts.join(', ')}).`;
  }
  return 'Backfill finished.';
}

interface ToastState { msg: string; error?: boolean }

export function ImageIntelligenceTab() {
  const stats = useImageStats();
  const [filters, setFilters] = useState<ImageFilters>(DEFAULT_FILTERS);
  const debouncedSearch = useDebounced(filters.search, 350);
  const applied = useMemo(() => ({ ...filters, search: debouncedSearch.trim() }), [filters, debouncedSearch]);
  const list = useImageList(applied);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmBackfill, setConfirmBackfill] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const patchFilters = useCallback((patch: Partial<ImageFilters>) => {
    setFilters(f => ({ ...f, ...patch, page: patch.page ?? 1 }));
  }, []);

  // Source, review and metadata values are the backend's enums; flags also include any seen in loaded data.
  const options = useMemo(() => {
    const flags = new Set<string>(KNOWN_FLAGS);
    for (const img of list.state.data?.items ?? []) img.flags.forEach(f => flags.add(f.code));
    if (filters.flag) flags.add(filters.flag);
    return { sources: SOURCE_OPTIONS, metadata: METADATA_OPTIONS, flags: [...flags].sort() };
  }, [list.state.data, filters.flag]);

  const onChanged = useCallback((message: string) => {
    setToast({ msg: message });
    stats.reload();
    list.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.reload, list.reload]);

  async function runBackfill() {
    setBackfilling(true);
    try {
      const res = await startBackfill();
      setConfirmBackfill(false);
      onChanged(backfillMessage(res.data));
    } catch (err) {
      setConfirmBackfill(false);
      setToast({ msg: describeError(err, 'Could not start the backfill.').message, error: true });
    } finally {
      setBackfilling(false);
    }
  }

  const data = list.state.data;
  const loading = list.state.status === 'loading';
  const filtered = !!(applied.search || applied.source || applied.review || applied.metadata || applied.flag || applied.unresolvedOnly);

  return (
    <div className="ii-root">
      <style>{IMAGE_INTELLIGENCE_CSS}</style>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Image fraud and evidence analysis</h2>

      <StatsPanel state={stats.state} onRetry={stats.reload} />

      <div className="ii-row">
        <div className="ii-muted">Duplicate matches and metadata signals are prompts for review, not proof of fraud.</div>
        <span className="ii-spacer" />
        {!confirmBackfill ? (
          <button type="button" className="ii-btn" onClick={() => setConfirmBackfill(true)}>Run backfill</button>
        ) : (
          <div className="ii-row" role="alertdialog" aria-label="Confirm backfill">
            <span className="ii-muted">Analyze up to 100 images now? This runs on the server and may take a while. Run again for more.</span>
            <button type="button" className="ii-btn primary" disabled={backfilling} onClick={runBackfill}>{backfilling ? 'Starting...' : 'Confirm backfill'}</button>
            <button type="button" className="ii-btn" disabled={backfilling} onClick={() => setConfirmBackfill(false)}>Cancel</button>
          </div>
        )}
      </div>

      <FilterBar filters={filters} options={options} onChange={patchFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      {list.state.status === 'error' && (
        <div className="ii-error" role="alert">
          <div>Could not load images. {list.state.error.message}</div>
          {list.state.error.kind !== 'forbidden' && (
            <button type="button" className="ii-btn" style={{ marginTop: 8 }} onClick={list.reload}>Retry</button>
          )}
        </div>
      )}

      {!data && loading && (
        <div className="ii-grid" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="ii-card"><div className="ii-thumb"><div className="ii-skeleton" /></div></div>)}
        </div>
      )}

      {data && data.items.length === 0 && list.state.status !== 'error' && (
        <div className="ii-empty">
          {filtered ? 'No images match these filters.' : 'No images have been recorded yet.'}
          {filtered && <div><button type="button" className="ii-btn" style={{ marginTop: 10 }} onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</button></div>}
        </div>
      )}

      {data && data.items.length > 0 && (
        <div style={{ opacity: loading ? 0.6 : 1 }} aria-busy={loading}>
          <ImageGallery items={data.items} onOpen={setSelectedId} />
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={applied.page} totalPages={data.totalPages} total={data.total} disabled={loading} onPage={p => patchFilters({ page: p })} />
      )}

      {selectedId && (
        <ImageDetailDrawer
          imageId={selectedId}
          onClose={() => setSelectedId(null)}
          onOpenImage={setSelectedId}
          onChanged={onChanged}
        />
      )}

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(128,128,128,.25)' }}>
        <ReidTab />
      </div>

      {toast && <div className={`ii-toast${toast.error ? ' error' : ''}`} role="status">{toast.msg}</div>}
    </div>
  );
}

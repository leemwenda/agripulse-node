import type { LoadState } from './hooks';
import { humanize } from './format';
import type { ImageStats } from './types';

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (!entries.length) return null;
  return (
    <div className="ii-panel">
      <h3>{title}</h3>
      <div className="ii-badges">
        {entries.map(([k, v]) => <span key={k} className="ii-badge">{humanize(k)}: {v}</span>)}
      </div>
    </div>
  );
}

export function StatsPanel({ state, onRetry }: { state: LoadState<ImageStats>; onRetry: () => void }) {
  if (state.status === 'error' && !state.data) {
    return (
      <div className="ii-error" role="alert">
        <div>Could not load statistics. {state.error.message}</div>
        <button type="button" className="ii-btn" style={{ marginTop: 8 }} onClick={onRetry}>Retry</button>
      </div>
    );
  }
  if (!state.data) {
    return <div className="ii-stats" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="ii-stat"><div className="ii-skeleton" style={{ height: 40 }} /></div>)}</div>;
  }
  const s = state.data;
  return (
    <>
      {state.status === 'error' && <div className="ii-error" role="alert">Statistics may be out of date. {state.error.message}</div>}
      {s.cards.length > 0 ? (
        <div className="ii-stats">
          {s.cards.map(c => (
            <div key={c.key} className="ii-stat">
              <div className="ii-stat-label">{c.label}</div>
              <div className="ii-stat-value">{c.value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : <div className="ii-muted">The server returned no summary counts.</div>}
      <div className="ii-row" style={{ alignItems: 'stretch' }}>
        <Breakdown title="By review status" data={s.byReview} />
        <Breakdown title="By analysis status" data={s.byAnalysis} />
        <div className="ii-panel">
          <h3>AI detector</h3>
          <span className={`ii-badge ${s.aiDetector.known ? (s.aiDetector.active ? 'green' : 'amber') : ''}`}>
            {!s.aiDetector.known ? 'Status not reported' : s.aiDetector.active ? 'Active' : 'Inactive'}
          </span>
          {s.aiDetector.known && !s.aiDetector.active && (
            <div className="ii-muted" style={{ marginTop: 6 }}>No AI results are produced while the detector is inactive.</div>
          )}
        </div>
      </div>
    </>
  );
}

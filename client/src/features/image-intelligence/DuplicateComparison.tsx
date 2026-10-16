import { Fragment } from 'react';
import { formatDateTime, humanize } from './format';
import { ProtectedImage } from './ProtectedImage';
import type { DuplicateMatch, ImageSummary } from './types';

const DIRECTION: Record<string, string> = {
  this_matches_earlier: 'Earlier image this one resembles',
  later_matches_this: 'Later image that resembles this one',
};

export function DuplicateComparison({ current, duplicates, onOpen }: {
  current: ImageSummary; duplicates: DuplicateMatch[]; onOpen: (id: string) => void;
}) {
  if (!duplicates.length) return <div className="ii-muted">No duplicate or near-duplicate matches were reported.</div>;
  return (
    <ul className="ii-list" aria-label="Possible matches">
      {duplicates.map(d => {
        const evidence = Object.entries(d.evidence);
        const sameFarm = current.farmId && d.farmId ? current.farmId === d.farmId : undefined;
        return (
          <li key={`${d.direction ?? ''}-${d.id}`}>
            <div className="ii-compare">
              <figure>
                <ProtectedImage id={current.id} alt={`This image: ${current.filename}`} fit="contain" lazy />
                <figcaption>This image</figcaption>
              </figure>
              <figure>
                <ProtectedImage id={d.id} alt={`Possible match: ${d.filename}`} fit="contain" lazy />
                <figcaption>{d.direction ? DIRECTION[d.direction] ?? humanize(d.direction) : 'Possible match'}: {d.filename}</figcaption>
              </figure>
            </div>
            <div className="ii-row" style={{ marginTop: 8 }}>
              {d.kind && <span className="ii-badge blue">{humanize(d.kind)}</span>}
              {d.method && <span className="ii-badge">Method: {humanize(d.method)}</span>}
              {d.score !== undefined && <span className="ii-badge" title="Raw matcher score. Its scale depends on the method.">Score {d.score}</span>}
              {sameFarm !== undefined && <span className="ii-badge">{sameFarm ? 'Same farm' : `Different farm (#${d.farmId})`}</span>}
              <span className="ii-muted">{formatDateTime(d.createdAt)}</span>
              <span className="ii-spacer" />
              <button type="button" className="ii-btn" onClick={() => onOpen(d.id)}>Open match</button>
            </div>
            {evidence.length > 0 && (
              <dl className="ii-kv" style={{ marginTop: 8 }}>
                {evidence.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{String(v)}</dd></Fragment>)}
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
}

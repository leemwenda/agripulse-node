import { Fragment, useEffect, useRef, useState } from 'react';
import { reanalyzeImage, submitReview } from './api';
import { FlagBadge, MetadataBadge, ReviewBadge } from './Badges';
import { EVIDENCE_NOTE } from './constants';
import { DuplicateComparison } from './DuplicateComparison';
import { describeError } from './errors';
import { formatBytes, formatDateTime, formatDimensions, humanize } from './format';
import { useImageDetail } from './hooks';
import { ProtectedImage } from './ProtectedImage';
import { ReviewForm } from './ReviewForm';
import type { AiDetection, ImageDetail, ReviewDecision } from './types';

interface Props {
  imageId: string;
  onClose: () => void;
  onOpenImage: (id: string) => void;
  /** Called after a successful review or re-analysis so the list and stats can refresh. */
  onChanged: (message: string) => void;
}

function AiSection({ ai }: { ai: AiDetection }) {
  if (ai.status === 'not_run' || ai.status === 'inactive') {
    return (
      <div className="ii-warn">
        <strong>{ai.status === 'inactive' ? 'AI detector inactive.' : 'AI assessment not run.'}</strong> No AI result exists for this image. This is not a clean result.
        {ai.message && <div>{ai.message}</div>}
      </div>
    );
  }
  if (ai.status === 'unknown') return <div className="ii-muted">No AI assessment has been recorded for this image.</div>;
  if (ai.status === 'pending') return <div className="ii-muted">AI analysis is pending.</div>;
  if (ai.status === 'failed') return <div className="ii-error">AI analysis failed.{ai.message ? ` ${ai.message}` : ''}</div>;
  return (
    <dl className="ii-kv">
      <dt>Detector output</dt>
      <dd>{ai.label ?? 'Completed'}{ai.scorePct !== undefined ? ` (score ${ai.scorePct}%)` : ''}</dd>
      {ai.model && <Fragment><dt>Detector</dt><dd>{ai.model}</dd></Fragment>}
      {ai.analyzedAt && <Fragment><dt>Analyzed</dt><dd>{formatDateTime(ai.analyzedAt)}</dd></Fragment>}
      <dt>Note</dt><dd>Advisory and uncalibrated unless validated on farm images. A person must decide.</dd>
    </dl>
  );
}

function summaryRows(img: ImageDetail): [string, string][] {
  const rows: [string, string | undefined][] = [
    ['Image ID', img.id],
    ['Source', img.source ? humanize(img.source) : undefined],
    ['Farm', img.farmName ?? (img.farmId ? `#${img.farmId}` : undefined)],
    ['Animal', img.animal ? [img.animal.name, img.animal.tagNumber && `tag ${img.animal.tagNumber}`].filter(Boolean).join(', ') || undefined : img.animalId ? `#${img.animalId}` : undefined],
    ['Listing', img.listingId ? `#${img.listingId}` : undefined],
    ['Recorded', img.createdAt ? formatDateTime(img.createdAt) : undefined],
    ['Type', img.mimeType],
    ['Dimensions', img.width && img.height ? formatDimensions(img.width, img.height) : undefined],
    ['Size', img.sizeBytes !== undefined ? formatBytes(img.sizeBytes) : undefined],
    ['Analysis', img.analysisStatus ? `${humanize(img.analysisStatus)}${img.analyzedAt ? `, ${formatDateTime(img.analyzedAt)}` : ''}` : undefined],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

function DetailBody({ image, onOpenImage, onChanged }: { image: ImageDetail } & Pick<Props, 'onOpenImage' | 'onChanged'>) {
  const [busy, setBusy] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);

  async function reanalyze() {
    setBusy(true);
    setReanalyzeError(null);
    try {
      const res = await reanalyzeImage(image.id);
      onChanged(res.data?.image ? 'Analysis refreshed.' : 'Re-analysis finished with no new result.');
    } catch (err) {
      setReanalyzeError(describeError(err, 'Could not re-run the analysis.').message);
    } finally {
      setBusy(false);
    }
  }

  async function review(decision: ReviewDecision, reason: string) {
    await submitReview(image.id, decision, reason);
    onChanged('Review saved.');
  }

  const meta = Object.entries(image.metadata);
  return (
    <>
      <div className="ii-preview"><ProtectedImage id={image.id} alt={image.filename} fit="contain" /></div>

      <section className="ii-section" aria-labelledby="ii-s-summary">
        <h3 id="ii-s-summary">Summary</h3>
        <div className="ii-badges" style={{ marginBottom: 8 }}>
          <ReviewBadge status={image.reviewStatus} />
          {image.metadataStatus && <MetadataBadge status={image.metadataStatus} />}
        </div>
        <dl className="ii-kv">
          {summaryRows(image).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
        </dl>
      </section>

      <div className="ii-note">{EVIDENCE_NOTE}</div>

      <section className="ii-section" aria-labelledby="ii-s-ai">
        <h3 id="ii-s-ai">AI detection</h3>
        <AiSection ai={image.ai} />
        <div className="ii-row" style={{ marginTop: 8 }}>
          <button type="button" className="ii-btn" onClick={reanalyze} disabled={busy}>{busy ? 'Requesting...' : 'Re-run analysis'}</button>
        </div>
        {reanalyzeError && <div className="ii-error" role="alert" style={{ marginTop: 8 }}>{reanalyzeError}</div>}
      </section>

      <section className="ii-section" aria-labelledby="ii-s-flags">
        <h3 id="ii-s-flags">Technical flags</h3>
        {image.flags.length === 0 ? <div className="ii-muted">No technical flags were raised.</div> : (
          <ul className="ii-list">
            {image.flags.map(f => (
              <li key={f.code}><FlagBadge flag={f} />{f.detail && <div className="ii-muted" style={{ marginTop: 4 }}>{f.detail}</div>}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="ii-section" aria-labelledby="ii-s-quality">
        <h3 id="ii-s-quality">Quality warnings</h3>
        {image.qualityWarnings.length === 0 ? <div className="ii-muted">No quality warnings.</div> : (
          <ul className="ii-list">{image.qualityWarnings.map((w, i) => <li key={`${w}-${i}`}>{w}</li>)}</ul>
        )}
      </section>

      <section className="ii-section" aria-labelledby="ii-s-meta">
        <h3 id="ii-s-meta">Metadata</h3>
        {meta.length === 0 ? <div className="ii-muted">No metadata fields were returned for this image.</div> : (
          <dl className="ii-kv">{meta.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</dd></Fragment>)}</dl>
        )}
      </section>

      <section className="ii-section" aria-labelledby="ii-s-dupes">
        <h3 id="ii-s-dupes">Duplicate comparison</h3>
        <DuplicateComparison current={image} duplicates={image.duplicates} onOpen={onOpenImage} />
      </section>

      <section className="ii-section" aria-labelledby="ii-s-history">
        <h3 id="ii-s-history">Review history</h3>
        {image.reviewHistory.length === 0 ? <div className="ii-muted">This image has not been reviewed.</div> : (
          <ul className="ii-list">
            {image.reviewHistory.map(r => (
              <li key={r.id}>
                <div className="ii-row"><ReviewBadge status={r.decision} /><span className="ii-muted">{r.reviewerName ?? 'Unknown reviewer'} - {formatDateTime(r.createdAt)}</span></div>
                {r.toStatus && <div className="ii-muted" style={{ marginTop: 4 }}>Status: {r.fromStatus ? `${humanize(r.fromStatus)} to ` : ''}{humanize(r.toStatus)}</div>}
                {r.reason && <div style={{ marginTop: 4 }}>{r.reason}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {image.limitations.length > 0 && (
        <section className="ii-section" aria-labelledby="ii-s-limits">
          <h3 id="ii-s-limits">Limitations of this analysis</h3>
          <ul className="ii-list">{image.limitations.map((l, i) => <li key={`${l}-${i}`}>{l}</li>)}</ul>
        </section>
      )}

      <section className="ii-section" aria-labelledby="ii-s-review">
        <h3 id="ii-s-review">Record a review</h3>
        <ReviewForm onSubmit={review} />
      </section>
    </>
  );
}

export function ImageDetailDrawer({ imageId, onClose, onOpenImage, onChanged }: Props) {
  const { state, reload } = useImageDetail(imageId);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const image = state.status === 'ready' ? state.data : null;

  return (
    <>
      <div className="ii-overlay" onClick={onClose} />
      <aside className="ii-drawer" role="dialog" aria-modal="true" aria-labelledby="ii-drawer-title">
        <div className="ii-drawer-head">
          <h2 id="ii-drawer-title" className="ii-drawer-title">{image?.filename ?? 'Image details'}</h2>
          <button ref={closeRef} type="button" className="ii-btn" onClick={onClose}>Close</button>
        </div>
        <div className="ii-drawer-body">
          {state.status === 'loading' && !state.data && <div className="ii-skeleton" style={{ height: 220 }} role="status" aria-label="Loading image details" />}
          {state.status === 'error' && (
            <div className="ii-error" role="alert">
              <div>{state.error.message}</div>
              {state.error.kind !== 'forbidden' && state.error.kind !== 'not_found' && (
                <button type="button" className="ii-btn" style={{ marginTop: 8 }} onClick={reload}>Retry</button>
              )}
            </div>
          )}
          {image && (
            <DetailBody
              key={image.id}
              image={image}
              onOpenImage={onOpenImage}
              onChanged={msg => { reload(); onChanged(msg); }}
            />
          )}
        </div>
      </aside>
    </>
  );
}

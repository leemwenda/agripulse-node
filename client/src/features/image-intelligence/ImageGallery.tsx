import { FlagBadge, MetadataBadge, ReviewBadge } from './Badges';
import { formatDateTime, humanize } from './format';
import { ProtectedImage } from './ProtectedImage';
import type { ImageSummary } from './types';

function ImageCard({ image, onOpen }: { image: ImageSummary; onOpen: (id: string) => void }) {
  const shownFlags = image.flags.slice(0, 2);
  return (
    <article className="ii-card" onClick={() => onOpen(image.id)}>
      <ProtectedImage id={image.id} alt={image.filename} lazy />
      <div className="ii-card-body">
        <button type="button" className="ii-link" title={image.filename} onClick={e => { e.stopPropagation(); onOpen(image.id); }}>
          {image.filename}
        </button>
        <div className="ii-badges">
          <ReviewBadge status={image.reviewStatus} />
          {image.source && <span className="ii-badge">{humanize(image.source)}</span>}
          {image.metadataStatus && <MetadataBadge status={image.metadataStatus} />}
        </div>
        {(shownFlags.length > 0 || image.duplicateCount > 0) && (
          <div className="ii-badges">
            {shownFlags.map(f => <FlagBadge key={f.code} flag={f} />)}
            {image.flags.length > shownFlags.length && <span className="ii-badge">+{image.flags.length - shownFlags.length} flags</span>}
            {image.duplicateCount > 0 && <span className="ii-badge blue">{image.duplicateCount} possible match{image.duplicateCount === 1 ? '' : 'es'}</span>}
          </div>
        )}
        <span className="ii-muted">{image.farmName ? `${image.farmName} - ` : ''}{formatDateTime(image.createdAt)}</span>
      </div>
    </article>
  );
}

export function ImageGallery({ items, onOpen }: { items: ImageSummary[]; onOpen: (id: string) => void }) {
  return (
    <div className="ii-grid" role="list" aria-label="Images">
      {items.map(img => <div role="listitem" key={img.id} style={{ display: 'contents' }}><ImageCard image={img} onOpen={onOpen} /></div>)}
    </div>
  );
}

export function Pagination({ page, totalPages, total, disabled, onPage }: {
  page: number; totalPages: number; total: number; disabled?: boolean; onPage: (p: number) => void;
}) {
  return (
    <nav className="ii-pager" aria-label="Pagination">
      <button type="button" className="ii-btn" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages} ({total.toLocaleString()} images)</span>
      <button type="button" className="ii-btn" disabled={disabled || page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </nav>
  );
}

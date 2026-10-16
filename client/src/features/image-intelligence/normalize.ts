import { UnexpectedResponseError } from './errors';
import { humanize } from './format';
import type {
  AiDetection, AiStatus, DuplicateMatch, FlagSeverity, ImageDetail, ImageFlag, ImageListResult,
  ImageStats, ImageSummary, ReviewEntry, StatCard,
} from './types';

/**
 * Maps the responses of /api/admin/images (see src/routes/imageIntelligence.routes.ts) into UI types.
 * Nothing is invented: a field the backend did not send stays undefined and the UI hides it.
 */
type Rec = Record<string, unknown>;
type Prim = string | number | boolean;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v.trim() ? v : undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
};
const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const first = (r: Rec, keys: string[]): unknown => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== null) return r[k];
  return undefined;
};
const unwrap = (data: unknown, keys: string[]): Rec => {
  if (!isRec(data)) throw new UnexpectedResponseError();
  for (const k of keys) if (isRec(data[k])) return data[k] as Rec;
  return data;
};
const isPrim = (v: unknown): v is Prim => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

function severity(v: unknown): FlagSeverity {
  const s = (str(v) ?? '').toLowerCase();
  if (['critical', 'high', 'error', 'severe'].includes(s)) return 'critical';
  if (['info', 'low', 'notice'].includes(s)) return 'info';
  return 'warning';
}

/** The backend sends flags as plain code strings (e.g. "exact_duplicate"). Objects are also accepted. */
export function normalizeFlag(v: unknown): ImageFlag | null {
  if (typeof v === 'string' && v.trim()) return { code: v, label: humanize(v), severity: 'warning' };
  if (!isRec(v)) return null;
  const code = str(first(v, ['code', 'type', 'key', 'name', 'id']));
  const label = str(first(v, ['label', 'title', 'name', 'message'])) ?? (code ? humanize(code) : undefined);
  if (!code && !label) return null;
  return {
    code: code ?? label!,
    label: label ?? humanize(code!),
    severity: severity(first(v, ['severity', 'level'])),
    detail: str(first(v, ['detail', 'details', 'description', 'message'])),
  };
}

const normalizeFlags = (v: unknown): ImageFlag[] =>
  Array.isArray(v) ? v.map(normalizeFlag).filter((f): f is ImageFlag => f !== null) : [];

function reviewStatusOf(r: Rec): string {
  const raw = str(first(r, ['reviewStatus', 'review_status']));
  return raw ? raw.toLowerCase() : 'unknown';
}

export function normalizeSummary(raw: unknown): ImageSummary | null {
  if (!isRec(raw)) return null;
  const id = str(first(raw, ['id', 'imageId', '_id']));
  if (!id) return null;
  const source = str(raw.source);
  const counts = isRec(raw._count) ? raw._count : undefined;
  const explicitDupes = num(first(raw, ['duplicateCount', 'duplicatesCount']));
  return {
    id,
    filename: str(first(raw, ['originalName', 'filename', 'fileName', 'name'])) ?? `${source ? humanize(source) : 'Image'} #${id}`,
    source,
    sourceId: str(raw.sourceId),
    animalId: str(raw.animalId),
    listingId: str(raw.listingId),
    farmId: str(raw.farmId),
    farmName: str(raw.farmName),
    mimeType: str(first(raw, ['mimeType', 'contentType'])),
    width: num(raw.width),
    height: num(raw.height),
    sizeBytes: num(first(raw, ['sizeBytes', 'size', 'fileSize'])),
    createdAt: str(first(raw, ['createdAt', 'uploadedAt'])),
    reviewStatus: reviewStatusOf(raw),
    metadataStatus: str(raw.metadataStatus),
    cameraMake: str(raw.cameraMake),
    cameraModel: str(raw.cameraModel),
    c2paPresent: bool(raw.c2paPresent),
    analysisStatus: str(raw.analysisStatus),
    analyzedAt: str(raw.analyzedAt),
    flags: normalizeFlags(first(raw, ['flags', 'technicalFlags'])),
    duplicateCount: explicitDupes ?? (counts ? (num(counts.matches) ?? 0) + (num(counts.matchedBy) ?? 0) : 0),
  };
}

export function normalizeList(data: unknown): ImageListResult {
  if (!isRec(data)) throw new UnexpectedResponseError();
  const rawItems = first(data, ['items', 'images', 'data', 'results']);
  if (!Array.isArray(rawItems)) throw new UnexpectedResponseError();
  const items = rawItems.map(normalizeSummary).filter((i): i is ImageSummary => i !== null);
  const pg = isRec(data.pagination) ? data.pagination : data;
  const total = num(first(pg, ['total', 'totalCount', 'count'])) ?? items.length;
  const pageSize = num(first(pg, ['pageSize', 'limit', 'perPage'])) ?? (items.length || 1);
  const page = num(first(pg, ['page', 'currentPage'])) ?? 1;
  const totalPages = num(first(pg, ['totalPages', 'pages'])) ?? Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return { items, total, page, pageSize, totalPages };
}

const EXIF_LABELS: Record<string, string> = { orientation: 'Orientation', lens: 'Lens', notes: 'Notes', c2paNote: 'C2PA note' };

/** Metadata rows come from the record's own columns and its exifJson. Nulls are skipped. */
function metadataRows(raw: Rec): Record<string, Prim> {
  const out: Record<string, Prim> = {};
  const put = (label: string, v: unknown) => { if (isPrim(v) && !(typeof v === 'string' && !v.trim())) out[label] = v; };
  put('Camera make', raw.cameraMake);
  put('Camera model', raw.cameraModel);
  put('C2PA marker present', raw.c2paPresent);
  const exif = isRec(raw.exifJson) ? raw.exifJson : isRec(raw.metadata) ? raw.metadata : {};
  for (const [k, v] of Object.entries(exif)) {
    const label = EXIF_LABELS[k] ?? humanize(k);
    if (Array.isArray(v)) {
      const items = v.filter((x): x is string => typeof x === 'string' && !!x.trim());
      if (items.length) out[label] = items.join('; ');
    } else if (isRec(v)) {
      for (const [k2, v2] of Object.entries(v)) put(`${label} ${k2}`, v2);
    } else put(label, v);
  }
  return out;
}

function flatEvidence(v: unknown): Record<string, Prim> {
  const out: Record<string, Prim> = {};
  if (!isRec(v)) return out;
  for (const [k, val] of Object.entries(v)) if (isPrim(val)) out[humanize(k)] = val;
  return out;
}

function normalizeDuplicate(v: unknown): DuplicateMatch | null {
  if (!isRec(v)) return null;
  const other = isRec(v.other) ? v.other : v;
  const id = str(first(other, ['id', 'imageId'])) ?? str(first(v, ['duplicateImageId', 'otherImageId', 'matchId']));
  if (!id) return null;
  const source = str(other.source);
  return {
    id,
    filename: `${source ? humanize(source) : 'Image'} #${id}`,
    direction: str(v.direction),
    kind: str(first(v, ['type', 'matchType', 'kind'])),
    method: str(v.method),
    score: num(first(v, ['score', 'similarity'])),
    evidence: flatEvidence(v.evidence),
    source,
    farmId: str(other.farmId),
    createdAt: str(other.createdAt),
  };
}

function normalizeReview(v: unknown, i: number): ReviewEntry | null {
  if (!isRec(v)) return null;
  const reviewer = isRec(v.reviewer) ? v.reviewer : {};
  return {
    id: str(v.id) ?? `review-${i}`,
    decision: (str(first(v, ['decision', 'status'])) ?? 'unknown').toLowerCase(),
    reason: str(first(v, ['reason', 'note', 'comment'])) ?? '',
    fromStatus: str(v.fromStatus),
    toStatus: str(v.toStatus),
    reviewerName: str(reviewer.name) ?? str(first(v, ['reviewerName', 'reviewedBy'])),
    createdAt: str(first(v, ['createdAt', 'reviewedAt'])),
  };
}

/** Reads the backend's flat aiStatus/aiScore/aiDetector fields, or a nested ai object. */
export function normalizeAi(raw: Rec): AiDetection {
  const nested = first(raw, ['ai', 'aiDetection', 'aiAnalysis']);
  const src: Rec = isRec(nested)
    ? nested
    : { status: raw.aiStatus, score: raw.aiScore, detector: raw.aiDetector, version: raw.aiDetectorVer };
  const s = (str(first(src, ['status', 'state'])) ?? '').toLowerCase();
  if (!s) {
    return bool(raw.aiDetectorActive) === false ? { status: 'inactive' } : { status: 'unknown' };
  }
  let status: AiStatus = 'unknown';
  if (['not_run', 'not run', 'none'].includes(s)) status = 'not_run';
  else if (['inactive', 'disabled', 'off', 'not_configured', 'unavailable'].includes(s) || bool(src.active) === false) status = 'inactive';
  else if (['pending', 'queued', 'running', 'processing'].includes(s)) status = 'pending';
  else if (['failed', 'error'].includes(s)) status = 'failed';
  else if (['completed', 'complete', 'done', 'success', 'flagged', 'clear', 'ok'].includes(s)) status = 'completed';
  const score = num(first(src, ['score', 'probability', 'confidence']));
  const model = [str(src.detector), str(src.version)].filter(Boolean).join(' ') || str(src.model);
  return {
    status,
    label: s === 'flagged' ? 'Flagged by detector' : str(src.label),
    scorePct: status === 'completed' && score !== undefined ? Math.round((score <= 1 ? score * 100 : score) * 10) / 10 : undefined,
    model,
    analyzedAt: str(first(src, ['analyzedAt', 'completedAt', 'updatedAt'])) ?? str(raw.analyzedAt),
    message: str(first(src, ['message', 'error'])),
  };
}

/** Detail response: { image, matches, reviews, limitations, note }. */
export function normalizeDetail(data: unknown): ImageDetail {
  if (!isRec(data)) throw new UnexpectedResponseError();
  const raw = unwrap(data, ['image', 'item']);
  const summary = normalizeSummary(raw);
  if (!summary) throw new UnexpectedResponseError();

  const matchesRaw = first(data, ['matches', 'duplicates', 'duplicateMatches']);
  const duplicates = Array.isArray(matchesRaw) ? matchesRaw.map(normalizeDuplicate).filter((d): d is DuplicateMatch => d !== null) : [];
  const reviewsRaw = first(data, ['reviews', 'reviewHistory', 'history']);
  const reviewHistory = Array.isArray(reviewsRaw) ? reviewsRaw.map(normalizeReview).filter((r): r is ReviewEntry => r !== null) : [];
  reviewHistory.sort((a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0));

  const explicitWarnings = first(raw, ['qualityWarnings', 'warnings']);
  const qualityWarnings = Array.isArray(explicitWarnings)
    ? explicitWarnings.map(w => (typeof w === 'string' ? w : isRec(w) ? str(first(w, ['message', 'label', 'code'])) : undefined)).filter((w): w is string => !!w)
    : summary.flags.filter(f => f.code.includes('quality')).map(f => f.detail ?? f.label);

  const limitations = Array.isArray(data.limitations) ? data.limitations.filter((l): l is string => typeof l === 'string' && !!l.trim()) : [];
  const animal = isRec(raw.animal) ? { name: str(raw.animal.name), tagNumber: str(raw.animal.tagNumber) } : undefined;

  return {
    ...summary,
    metadata: metadataRows(raw),
    qualityWarnings,
    duplicates,
    reviewHistory,
    ai: normalizeAi(raw),
    animal,
    limitations,
    duplicateCount: matchesRaw !== undefined ? duplicates.length : summary.duplicateCount,
  };
}

const countMap = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (isRec(v)) for (const [k, val] of Object.entries(v)) { const n = num(val); if (n !== undefined) out[k] = n; }
  return out;
};

const CARD_DEFS: { key: string; label: string; from: string[] }[] = [
  { key: 'total', label: 'Total images', from: ['total', 'totalImages'] },
  { key: 'exactDuplicates', label: 'Exact duplicates', from: ['exactDuplicates'] },
  { key: 'nearDuplicates', label: 'Near duplicates', from: ['nearDuplicates'] },
  { key: 'missingMetadata', label: 'Missing metadata', from: ['missingMetadata'] },
  { key: 'qualityWarnings', label: 'Quality warnings', from: ['qualityWarnings'] },
  { key: 'c2pa', label: 'C2PA markers found', from: ['c2pa'] },
  { key: 'notAnalyzed', label: 'Not yet analyzed', from: ['notAnalyzed'] },
];

export function normalizeStats(data: unknown): ImageStats {
  const raw = unwrap(data, ['stats']);
  const byReview = countMap(first(raw, ['byReview', 'byReviewStatus']));
  const activeFlag = bool(raw.aiDetectorActive);

  const cards: StatCard[] = [];
  for (const def of CARD_DEFS) {
    const n = num(first(raw, def.from));
    if (n !== undefined) cards.push({ key: def.key, label: def.label, value: n });
  }
  // Same definition the backend uses for its "unresolved" filter: pending or needs_review.
  if ('pending' in byReview || 'needs_review' in byReview) {
    cards.splice(Math.min(1, cards.length), 0, {
      key: 'unresolved', label: 'Unresolved', value: (byReview.pending ?? 0) + (byReview.needs_review ?? 0),
    });
  }
  // A 0 here while the detector is inactive would read as "clean", so it is only shown for an active detector.
  const aiFlagged = num(raw.aiFlagged);
  if (activeFlag === true && aiFlagged !== undefined) cards.push({ key: 'aiFlagged', label: 'AI flagged (advisory)', value: aiFlagged });

  return {
    cards,
    byReview,
    byAnalysis: countMap(first(raw, ['byAnalysis', 'byAnalysisStatus'])),
    aiDetector: { known: activeFlag !== undefined, active: activeFlag === true },
  };
}

import type { ImageFilters, ReviewDecision } from './types';

export const MIN_REASON_LENGTH = 10;
export const PAGE_SIZE = 24;

export const REVIEW_DECISIONS: { value: ReviewDecision; label: string; hint: string }[] = [
  { value: 'legitimate', label: 'Legitimate', hint: 'Evidence reviewed; image appears genuine.' },
  { value: 'suspicious', label: 'Suspicious', hint: 'Needs follow-up; not yet confirmed.' },
  { value: 'confirmed', label: 'Confirmed', hint: 'Reviewer confirmed a problem with this image.' },
  { value: 'inconclusive', label: 'Inconclusive', hint: 'Evidence is not enough to decide.' },
];

/** Values accepted by GET /api/admin/images (zod enums in imageIntelligence.routes.ts). */
export const REVIEW_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'confirmed_issue', label: 'Confirmed issue' },
  { value: 'inconclusive', label: 'Inconclusive' },
];
export const SOURCE_OPTIONS = ['animal_photo', 'market_photo'];
export const METADATA_OPTIONS = ['present', 'absent', 'invalid', 'inconsistent'];
/** Flag codes the backend is known to raise; flags seen in loaded data are added at runtime. */
export const KNOWN_FLAGS = ['exact_duplicate', 'near_duplicate', 'cross_farm_match', 'no_metadata', 'quality_warning'];

export const DEFAULT_FILTERS: ImageFilters = {
  search: '',
  source: '',
  review: '',
  metadata: '',
  flag: '',
  unresolvedOnly: false,
  page: 1,
  pageSize: PAGE_SIZE,
};

export const EVIDENCE_NOTE =
  'Duplicate matches, technical flags and metadata signals are evidence for human review. They are not proof of fraud.';

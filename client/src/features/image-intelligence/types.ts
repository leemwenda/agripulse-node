export type ReviewDecision = 'legitimate' | 'suspicious' | 'confirmed' | 'inconclusive';
/** Backend statuses: pending, needs_review, reviewed, confirmed_issue, inconclusive. Unknown values are preserved. */
export type ReviewStatus = string;
export type FlagSeverity = 'info' | 'warning' | 'critical';
export type AiStatus = 'not_run' | 'inactive' | 'pending' | 'completed' | 'failed' | 'unknown';

export interface ImageFlag {
  code: string;
  label: string;
  severity: FlagSeverity;
  detail?: string;
}

export interface ImageSummary {
  id: string;
  /** Display title. The backend has no filename, so this is "<Source> #<id>". */
  filename: string;
  source?: string;
  sourceId?: string;
  animalId?: string;
  listingId?: string;
  farmId?: string;
  farmName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  createdAt?: string;
  reviewStatus: ReviewStatus;
  metadataStatus?: string;
  cameraMake?: string;
  cameraModel?: string;
  c2paPresent?: boolean;
  analysisStatus?: string;
  analyzedAt?: string;
  flags: ImageFlag[];
  /** Number of match records involving this image (both directions). */
  duplicateCount: number;
}

export interface DuplicateMatch {
  id: string;
  filename: string;
  /** this_matches_earlier | later_matches_this */
  direction?: string;
  kind?: string;
  method?: string;
  /** Raw matcher score. Its scale depends on the method, so it is never shown as a percentage. */
  score?: number;
  evidence: Record<string, string | number | boolean>;
  source?: string;
  farmId?: string;
  createdAt?: string;
}

export interface ReviewEntry {
  id: string;
  decision: string;
  reason: string;
  fromStatus?: string;
  toStatus?: string;
  reviewerName?: string;
  createdAt?: string;
}

export interface AiDetection {
  status: AiStatus;
  label?: string;
  /** Percentage 0-100. Only present for a completed result with a score. */
  scorePct?: number;
  model?: string;
  analyzedAt?: string;
  message?: string;
}

export interface ImageDetail extends ImageSummary {
  metadata: Record<string, string | number | boolean>;
  qualityWarnings: string[];
  duplicates: DuplicateMatch[];
  reviewHistory: ReviewEntry[];
  ai: AiDetection;
  animal?: { name?: string; tagNumber?: string };
  /** Limitations stated by the backend. */
  limitations: string[];
}

export interface ImageListResult {
  items: ImageSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StatCard {
  key: string;
  label: string;
  value: number;
}

export interface ImageStats {
  /** Only cards the backend actually returned. */
  cards: StatCard[];
  byReview: Record<string, number>;
  byAnalysis: Record<string, number>;
  aiDetector: { known: boolean; active: boolean };
}

export interface ImageFilters {
  search: string;
  source: string;
  review: string;
  metadata: string;
  flag: string;
  unresolvedOnly: boolean;
  page: number;
  pageSize: number;
}

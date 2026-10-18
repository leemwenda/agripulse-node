// Pure decision logic for photo suitability. No I/O. Similarity/identity is a separate signal and is not used here.
export type DetectorResult = { status: 'cow' | 'not_cow' | 'uncertain' | 'error'; label?: string; score?: number };
export type Quality = { width: number; height: number; sharpness: number; brightness: number; contrast: number };
export type Thresholds = {
  minSide: number; minSharpness: number; minBrightness: number; maxBrightness: number; minContrast: number;
  rejectMinScore: number;        // not_cow needs at least this confidence to be rejected
  trustLabelOnly: boolean;       // if the detector gives no score, allow rejection on label alone (default false)
};
export const DEFAULT_THRESHOLDS: Thresholds = {
  minSide: 480, minSharpness: 4, minBrightness: 35, maxBrightness: 225, minContrast: 20,
  rejectMinScore: 0.9, trustLabelOnly: false,
};
export type Decision = 'accepted' | 'rejected' | 'needs_retake' | 'pending_review' | 'retry';
export type Outcome = { decision: Decision; reasonCode: string };

export function decide(d: DetectorResult, q: Quality, t: Thresholds = DEFAULT_THRESHOLDS): Outcome {
  if (d.status === 'error') return { decision: 'retry', reasonCode: 'detector_unavailable' };
  if (d.status === 'uncertain') return { decision: 'pending_review', reasonCode: 'detector_uncertain' };
  if (d.status === 'not_cow') {
    const confident = d.score !== undefined ? d.score >= t.rejectMinScore : t.trustLabelOnly;
    return confident ? { decision: 'rejected', reasonCode: 'not_cow' } : { decision: 'pending_review', reasonCode: 'not_cow_low_confidence' };
  }
  if (Math.min(q.width, q.height) < t.minSide) return { decision: 'needs_retake', reasonCode: 'low_resolution' };
  if (q.sharpness < t.minSharpness) return { decision: 'needs_retake', reasonCode: 'blurry' };
  if (q.brightness < t.minBrightness) return { decision: 'needs_retake', reasonCode: 'too_dark' };
  if (q.brightness > t.maxBrightness) return { decision: 'needs_retake', reasonCode: 'too_bright' };
  if (q.contrast < t.minContrast) return { decision: 'needs_retake', reasonCode: 'low_contrast' };
  return { decision: 'accepted', reasonCode: 'ok' };
}

// Exponential backoff with a cap. attempts is the number of tries already made (>= 1).
export function backoffMs(attempts: number, baseMs = 60_000, capMs = 3_600_000): number {
  return Math.min(capMs, baseMs * 2 ** Math.max(0, attempts - 1));
}

const TEXT: Record<string, string> = {
  not_cow: 'The photo does not appear to show a cow. Please upload a clear photo of the animal.',
  low_resolution: 'The photo is too small. Please take it closer or with a higher camera setting.',
  blurry: 'The photo is blurry. Hold the phone steady and tap the screen to focus before taking it.',
  too_dark: 'The photo is too dark. Please take it in daylight.',
  too_bright: 'The photo is too bright. Please avoid direct glare and take it in even daylight.',
  low_contrast: 'The animal is hard to see. Please take the photo against a clearer background.',
};
// Plain-language text only: never includes labels, scores, paths or error details.
export function userReason(code: string): string {
  return TEXT[code] ?? 'The photo could not be used. Please upload a clear photo of the cow.';
}

// Idempotency: send at most one email per decision, only in enforce mode, only for user-actionable outcomes.
export function shouldEmail(job: { decision: Decision | null; mode: string; emailStatus: string }): boolean {
  return job.mode === 'enforce' && job.emailStatus !== 'sent' && (job.decision === 'rejected' || job.decision === 'needs_retake');
}

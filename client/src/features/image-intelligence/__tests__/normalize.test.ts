import { describe, expect, it } from 'vitest';
import { normalizeDetail, normalizeList, normalizeStats } from '../normalize';
import { buildListParams } from '../api';
import { DEFAULT_FILTERS } from '../constants';
import { DETAIL, LIST, STATS } from './fixtures';

describe('normalizeList (real backend shape)', () => {
  it('maps items, pagination and match counts', () => {
    const r = normalizeList(LIST);
    expect(r).toMatchObject({ total: 48, page: 1, pageSize: 24, totalPages: 2 });
    expect(r.items[0]).toMatchObject({ id: '1', filename: 'Animal photo #1', reviewStatus: 'needs_review', duplicateCount: 1, farmName: 'Wanjiru Farm' });
    expect(r.items[0].flags.map(f => f.label)).toEqual(['Exact duplicate', 'No metadata']);
    expect(r.items[1].duplicateCount).toBe(1);
  });
  it('rejects an unexpected payload', () => {
    expect(() => normalizeList({ nope: true })).toThrow();
  });
});

describe('normalizeDetail (real backend shape)', () => {
  const d = normalizeDetail(DETAIL);
  it('reads matches from the top level, not the raw prisma relation', () => {
    expect(d.duplicates).toHaveLength(1);
    expect(d.duplicates[0]).toMatchObject({ id: '2', kind: 'near', method: 'phash', score: 0.93, farmId: '4', direction: 'this_matches_earlier' });
    expect(d.duplicates[0].evidence).toEqual({ Hamming: 3 });
  });
  it('never turns an unknown score scale into a percentage', () => {
    expect(JSON.stringify(d.duplicates[0])).not.toContain('Pct');
  });
  it('reports AI as not run and does not fabricate a score', () => {
    expect(d.ai).toMatchObject({ status: 'not_run' });
    expect(d.ai.scorePct).toBeUndefined();
  });
  it('builds metadata rows and skips nulls', () => {
    expect(d.metadata).toEqual({ 'C2PA marker present': false, Notes: 'No EXIF block found' });
  });
  it('keeps backend limitations and animal info', () => {
    expect(d.limitations[1]).toContain('not run');
    expect(d.animal).toEqual({ name: 'Daisy', tagNumber: 'T-12' });
  });
  it('sorts review history newest first and keeps the status change', () => {
    const r = normalizeDetail({
      ...DETAIL,
      reviews: [
        { id: 1, decision: 'suspicious', reason: 'older one here', fromStatus: 'pending', toStatus: 'needs_review', reviewerName: 'Admin', createdAt: '2026-01-01T00:00:00Z' },
        { id: 2, decision: 'legitimate', reason: 'newer one here', fromStatus: 'needs_review', toStatus: 'reviewed', reviewerName: 'Admin', createdAt: '2026-02-01T00:00:00Z' },
      ],
    });
    expect(r.reviewHistory.map(x => x.id)).toEqual(['2', '1']);
    expect(r.reviewHistory[0]).toMatchObject({ toStatus: 'reviewed', reviewerName: 'Admin' });
  });
  it('treats a flat record with no AI fields as unknown', () => {
    expect(normalizeDetail({ id: 1 }).ai).toEqual({ status: 'unknown' });
  });
  it('drops any score from an inactive detector and keeps a completed score', () => {
    expect(normalizeDetail({ id: 1, ai: { status: 'disabled', score: 0.9 } }).ai.scorePct).toBeUndefined();
    expect(normalizeDetail({ id: 1, aiStatus: 'flagged', aiScore: 0.42, aiDetector: 'x', aiDetectorVer: '1' }).ai)
      .toMatchObject({ status: 'completed', label: 'Flagged by detector', scorePct: 42, model: 'x 1' });
  });
});

describe('normalizeStats (real backend shape)', () => {
  const s = normalizeStats(STATS);
  it('maps the backend counters', () => {
    const byKey = Object.fromEntries(s.cards.map(c => [c.key, c.value]));
    expect(byKey).toMatchObject({ total: 120, exactDuplicates: 4, nearDuplicates: 6, missingMetadata: 30, notAnalyzed: 9, qualityWarnings: 2, c2pa: 1 });
  });
  it('derives unresolved from pending + needs_review, the backend filter definition', () => {
    expect(s.cards.find(c => c.key === 'unresolved')?.value).toBe(7);
  });
  it('hides the AI flagged count while the detector is inactive', () => {
    expect(s.cards.some(c => c.key === 'aiFlagged')).toBe(false);
    expect(s.aiDetector).toEqual({ known: true, active: false });
  });
  it('shows it when the detector is active', () => {
    expect(normalizeStats({ ...STATS, aiDetectorActive: true, aiFlagged: 3 }).cards.some(c => c.key === 'aiFlagged')).toBe(true);
  });
});

describe('buildListParams', () => {
  it('uses the backend parameter names and omits empty filters', () => {
    expect(buildListParams(DEFAULT_FILTERS)).toEqual({ page: 1, limit: 24 });
    expect(buildListParams({ ...DEFAULT_FILTERS, search: ' 42 ', review: 'needs_review', unresolvedOnly: true, source: 'animal_photo', metadata: 'absent', flag: 'exact_duplicate' }))
      .toEqual({ page: 1, limit: 24, q: '42', reviewStatus: 'needs_review', unresolved: 'true', source: 'animal_photo', metadata: 'absent', flag: 'exact_duplicate' });
  });
});

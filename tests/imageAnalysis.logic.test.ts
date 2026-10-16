import { describe, it, expect } from 'vitest';
import { hammingHex, dhashFromGray, evaluateMetadata, evaluateQuality, deriveFlags, encodeFlags, decodeFlags, safeJoin, REVIEW_MAP } from '../src/services/imageAnalysis.logic';

describe('hammingHex', () => {
  it('is 0 for identical, counts differing bits, Infinity for invalid', () => {
    expect(hammingHex('ffffffffffffffff', 'ffffffffffffffff')).toBe(0);
    expect(hammingHex('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hammingHex('0000000000000001', '0000000000000003')).toBe(1);
    expect(hammingHex('zz', 'zz')).toBe(Infinity);
    expect(hammingHex('00', '0000')).toBe(Infinity);
  });
});

describe('dhashFromGray', () => {
  it('is deterministic, 16 hex chars, and a gradient differs from its inverse', () => {
    const asc = Array.from({ length: 72 }, (_, i) => i % 9 * 10);
    const desc = Array.from({ length: 72 }, (_, i) => 90 - (i % 9) * 10);
    expect(dhashFromGray(asc)).toBe(dhashFromGray(asc));
    expect(dhashFromGray(asc)).toHaveLength(16);
    expect(hammingHex(dhashFromGray(asc), dhashFromGray(desc))).toBe(64);
  });
  it('rejects too few pixels', () => expect(() => dhashFromGray([1, 2, 3])).toThrow());
});

describe('evaluateMetadata', () => {
  const up = new Date('2026-10-12T10:00:00Z');
  it('absent EXIF is flagged neutrally', () => {
    const r = evaluateMetadata({ parseError: false, hasAnyExif: false }, up);
    expect(r.status).toBe('absent'); expect(r.flags).toEqual(['no_metadata']);
  });
  it('invalid block', () => expect(evaluateMetadata({ parseError: true, hasAnyExif: false }, up).status).toBe('invalid'));
  it('future capture date is inconsistent', () => {
    const r = evaluateMetadata({ parseError: false, hasAnyExif: true, capturedAt: new Date('2027-01-01') }, up);
    expect(r.status).toBe('inconsistent'); expect(r.flags).toContain('inconsistent_metadata');
  });
  it('generative tool name in Software tag is surfaced; normal camera is clean', () => {
    expect(evaluateMetadata({ parseError: false, hasAnyExif: true, software: 'Stable Diffusion 1.5' }, up).flags).toContain('ai_tool_in_metadata');
    expect(evaluateMetadata({ parseError: false, hasAnyExif: true, software: 'Adobe Photoshop' }, up).flags).toContain('editing_software');
    const ok = evaluateMetadata({ parseError: false, hasAnyExif: true, make: 'Samsung', model: 'A14', capturedAt: new Date('2026-10-11') }, up);
    expect(ok.status).toBe('present'); expect(ok.flags).toEqual([]);
  });
});

describe('evaluateQuality', () => {
  it('flags only what is measured', () => {
    expect(evaluateQuality({ width: 4000, height: 3000, sharpness: 20, brightness: 120, contrast: 60 })).toEqual([]);
    expect(evaluateQuality({ width: 320, height: 240, sharpness: 2, brightness: 20, contrast: 10 }))
      .toEqual(['low_resolution', 'possibly_blurry', 'too_dark', 'low_contrast']);
  });
});

describe('deriveFlags', () => {
  const base = { metaFlags: [], qualityWarnings: [], exact: 0, near: 0, crossFarm: false, c2pa: false, aiStatus: 'not_run' };
  it('no signals stays pending', () => expect(deriveFlags(base).suggestedReview).toBe('pending'));
  it('missing metadata alone does NOT trigger review', () => expect(deriveFlags({ ...base, metaFlags: ['no_metadata'] }).suggestedReview).toBe('pending'));
  it('exact or near duplicates trigger review', () => {
    expect(deriveFlags({ ...base, exact: 1 }).suggestedReview).toBe('needs_review');
    expect(deriveFlags({ ...base, near: 2, crossFarm: true }).flags).toEqual(expect.arrayContaining(['near_duplicate', 'cross_farm_match']));
  });
  it('AI detector not_run never produces an AI flag', () => expect(deriveFlags(base).flags).not.toContain('ai_detector_flag'));
});

describe('flag encoding', () => {
  it('round-trips and supports exact-token contains', () => {
    const e = encodeFlags(['exact_duplicate', 'no_metadata']);
    expect(e).toBe(',exact_duplicate,no_metadata,');
    expect(e.includes(',duplicate,')).toBe(false);
    expect(decodeFlags(e)).toEqual(['exact_duplicate', 'no_metadata']);
    expect(decodeFlags('')).toEqual([]);
  });
});

describe('safeJoin (path traversal)', () => {
  it('allows inside, blocks escapes and null bytes', () => {
    expect(safeJoin('/srv/up', 'animals/a.jpg')).toBe('/srv/up/animals/a.jpg');
    expect(safeJoin('/srv/up', '../etc/passwd')).toBeNull();
    expect(safeJoin('/srv/up', 'animals/../../etc/passwd')).toBeNull();
    expect(safeJoin('/srv/up', 'a\0.jpg')).toBeNull();
    expect(safeJoin('/srv/up', '')).toBeNull();
  });
});

describe('review mapping', () => {
  it('maps decisions to statuses', () => {
    expect(REVIEW_MAP).toEqual({ legitimate: 'reviewed', suspicious: 'needs_review', confirmed: 'confirmed_issue', inconclusive: 'inconclusive' });
  });
});

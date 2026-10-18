import { describe, it, expect } from 'vitest';
import { decide, backoffMs, userReason, shouldEmail, DEFAULT_THRESHOLDS } from '../src/services/photoVerification.logic';
const good = { width: 1600, height: 1200, sharpness: 20, brightness: 120, contrast: 60 };

describe('decide', () => {
  it('accepts a clear cow', () => expect(decide({ status: 'cow' }, good)).toEqual({ decision: 'accepted', reasonCode: 'ok' }));
  it('rejects a confident non-cow', () => expect(decide({ status: 'not_cow', score: 0.97 }, good).decision).toBe('rejected'));
  it('does not reject a low-confidence non-cow', () => expect(decide({ status: 'not_cow', score: 0.6 }, good).decision).toBe('pending_review'));
  it('does not reject on label alone by default', () => expect(decide({ status: 'not_cow', label: 'car' }, good).decision).toBe('pending_review'));
  it('uncertain goes to review, not accept or reject', () => expect(decide({ status: 'uncertain' }, good).decision).toBe('pending_review'));
  it('detector error means retry, never a decision', () => expect(decide({ status: 'error' }, good).decision).toBe('retry'));
  it('blurry, dark, small cow photos need a retake', () => {
    expect(decide({ status: 'cow' }, { ...good, sharpness: 1 }).reasonCode).toBe('blurry');
    expect(decide({ status: 'cow' }, { ...good, brightness: 10 }).reasonCode).toBe('too_dark');
    expect(decide({ status: 'cow' }, { ...good, width: 200 }).reasonCode).toBe('low_resolution');
  });
  it('trustLabelOnly can be enabled explicitly', () =>
    expect(decide({ status: 'not_cow' }, good, { ...DEFAULT_THRESHOLDS, trustLabelOnly: true }).decision).toBe('rejected'));
});

describe('backoffMs', () => {
  it('doubles and caps', () => {
    expect(backoffMs(1)).toBe(60_000);
    expect(backoffMs(3)).toBe(240_000);
    expect(backoffMs(20)).toBe(3_600_000);
  });
});

describe('user text and email idempotency', () => {
  it('has plain text and a safe fallback', () => {
    expect(userReason('blurry')).toMatch(/blurry/);
    expect(userReason('weird_internal_code')).toMatch(/clear photo/);
    expect(userReason('not_cow')).not.toMatch(/score|stack|path/i);
  });
  it('emails once, only in enforce mode, only for actionable decisions', () => {
    expect(shouldEmail({ decision: 'rejected', mode: 'enforce', emailStatus: 'none' })).toBe(true);
    expect(shouldEmail({ decision: 'rejected', mode: 'enforce', emailStatus: 'sent' })).toBe(false);
    expect(shouldEmail({ decision: 'rejected', mode: 'shadow', emailStatus: 'none' })).toBe(false);
    expect(shouldEmail({ decision: 'accepted', mode: 'enforce', emailStatus: 'none' })).toBe(false);
    expect(shouldEmail({ decision: 'pending_review', mode: 'enforce', emailStatus: 'none' })).toBe(false);
  });
});

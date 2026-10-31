import { describe, it, expect } from 'vitest';
import { animalKey, animalIdFromKey, isDecision } from '../src/services/reid.logic';

describe('re-id animal keys', () => {
  it('round-trips real animal ids', () => {
    expect(animalIdFromKey(animalKey(5))).toBe(5);
  });
  it('rejects legacy free-text labels', () => {
    expect(animalIdFromKey('AGP-00127')).toBeNull();
    expect(animalIdFromKey('new_20261016_g1')).toBeNull();
    expect(animalIdFromKey('cow_001')).toBeNull();
  });
  it('rejects zero, traversal and oversized ids', () => {
    expect(animalIdFromKey('animal-0')).toBeNull();
    expect(animalIdFromKey('animal-5/../x')).toBeNull();
    expect(animalIdFromKey('animal-99999999999999999')).toBeNull();
  });
});

describe('re-id review decisions', () => {
  it('accepts only the three candidate decisions', () => {
    expect(isDecision('same_animal')).toBe(true);
    expect(isDecision('different_animals')).toBe(true);
    expect(isDecision('inconclusive')).toBe(true);
  });
  it('rejects fraud-review vocabulary', () => {
    expect(isDecision('legitimate')).toBe(false);
    expect(isDecision('suspicious')).toBe(false);
    expect(isDecision('confirmed')).toBe(false);
  });
});

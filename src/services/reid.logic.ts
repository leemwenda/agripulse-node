// Pure helpers for cow re-identification. No database or network access, so they are unit-testable.
export const ANIMAL_KEY_RE = /^animal-(\d{1,12})$/;
export const DECISIONS = ['same_animal', 'different_animals', 'inconclusive'] as const;
export type ReviewDecision = (typeof DECISIONS)[number];

export const SIMILARITY_NOTE =
  'Candidate match from a model. Similarity is not proof of identity. A person must decide. No animal record is changed.';

export function animalKey(id: number): string {
  return `animal-${id}`;
}

export function animalIdFromKey(key: string): number | null {
  const m = ANIMAL_KEY_RE.exec(key);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function isDecision(v: unknown): v is ReviewDecision {
  return typeof v === 'string' && (DECISIONS as readonly string[]).includes(v);
}

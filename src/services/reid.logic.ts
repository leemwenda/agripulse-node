// Pure helpers for cow re-identification. No database or network access, so they are unit-testable.
import path from 'path';

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

// Maps a stored upload URL (e.g. /uploads/animals/x.jpg) to a filesystem path that must stay inside root.
// Pure: no filesystem access. Returns null for anything outside /uploads/<subdir>/.
export function resolveUploadPath(root: string, url: string, subdir = 'animals'): string | null {
  const prefix = `/uploads/${subdir}/`;
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null;
  if (url.includes('\0') || url.includes('\\')) return null;
  const base = path.resolve(root);
  const full = path.resolve(base, url.slice('/uploads/'.length));
  return full.startsWith(base + path.sep) ? full : null;
}

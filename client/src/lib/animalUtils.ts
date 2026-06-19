// ─── Animal utility helpers ───────────────────────────────────────────────
// All derived from dateOfBirth + gender — no DB column needed.

export type AnimalCategory = 'Calf' | 'Heifer' | 'Bull' | 'Cow';

/**
 * Returns age in whole months from a date-of-birth string.
 */
export function getAgeMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 +
    (now.getMonth() - dob.getMonth());
  // Subtract 1 if we haven't yet reached the day-of-month anniversary
  return now.getDate() < dob.getDate() ? Math.max(0, months - 1) : Math.max(0, months);
}

/**
 * Returns a human-readable age string, e.g. "3 months" or "2 yrs 4 mo".
 */
export function formatAge(dateOfBirth: string): string {
  const months = getAgeMonths(dateOfBirth);
  if (months < 12) return `${months} mo`;
  const yrs = Math.floor(months / 12);
  const mo  = months % 12;
  return mo > 0 ? `${yrs} yr ${mo} mo` : `${yrs} yr`;
}

/**
 * Classifies an animal into a management category.
 *  - Calf   : 0–11 months (either gender)
 *  - Heifer : 12–35 months, female, not flagged as having calved
 *  - Bull   : male, 12+ months
 *  - Cow    : female, 36+ months OR has calved
 */
export function getAnimalCategory(
  dateOfBirth: string,
  gender: 'male' | 'female',
  hasCalved = false,
): AnimalCategory {
  const months = getAgeMonths(dateOfBirth);
  if (months < 12) return 'Calf';
  if (gender === 'male') return 'Bull';
  if (hasCalved || months >= 36) return 'Cow';
  return 'Heifer';
}

// ─── Calf feeding ─────────────────────────────────────────────────────────

export interface CalfFeedingStage {
  label: string;       // short label for badge
  recommendation: string; // full recommendation text
  color: string;
  glowColor: string;
  eligibleForBreeding: boolean;
}

/**
 * Returns feeding guidance for calves (animals < 18 months).
 * Returns null for animals that are no longer in the calf/heifer feeding stage.
 */
export function getCalfFeedingStage(dateOfBirth: string): CalfFeedingStage | null {
  const months = getAgeMonths(dateOfBirth);

  if (months < 3) {
    return {
      label: '6 L/day',
      recommendation: `0–3 months: 6 litres of milk per day`,
      color: '#3b82f6',
      glowColor: 'rgba(59,130,246,.2)',
      eligibleForBreeding: false,
    };
  }
  if (months < 6) {
    return {
      label: '5 L/day',
      recommendation: `3–6 months: 5 litres of milk per day`,
      color: '#6366f1',
      glowColor: 'rgba(99,102,241,.2)',
      eligibleForBreeding: false,
    };
  }
  if (months < 9) {
    return {
      label: 'Weaning',
      recommendation: `6–9 months: Weaning stage — reduce milk gradually`,
      color: '#f59e0b',
      glowColor: 'rgba(245,158,11,.2)',
      eligibleForBreeding: false,
    };
  }
  if (months < 18) {
    return {
      label: 'Post-wean',
      recommendation: `9–18 months: Post-weaning monitoring — solid feed focus`,
      color: '#10b981',
      glowColor: 'rgba(16,185,129,.2)',
      eligibleForBreeding: false,
    };
  }
  // 18+ months — eligible for service, no feeding stage badge
  return null;
}

/**
 * Returns true if an animal meets the minimum breeding age (18 months).
 */
export function isBreedingEligible(dateOfBirth: string): boolean {
  return getAgeMonths(dateOfBirth) >= 18;
}

/**
 * Returns how many months remain until breeding eligibility, or 0 if already eligible.
 */
export function monthsToBreedingEligibility(dateOfBirth: string): number {
  return Math.max(0, 18 - getAgeMonths(dateOfBirth));
}

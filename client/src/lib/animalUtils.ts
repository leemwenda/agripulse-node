import { AnimalCategory } from '../types';

export function getAgeMonths(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  return (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
}

export function formatAge(dateOfBirth: string): string {
  const m = getAgeMonths(dateOfBirth);
  if (m < 1) return '< 1 month';
  if (m < 12) return `${m} month${m !== 1 ? 's' : ''}`;
  const y = Math.floor(m / 12), mo = m % 12;
  if (mo === 0) return `${y} year${y !== 1 ? 's' : ''}`;
  return `${y} yr ${mo} mo`;
}

/**
 * 3-arg version: getAnimalCategory(dob, gender, hasCalved)
 * hasCalved = latestBreeding?.pregnancyStatus === 'gave_birth'
 *
 * Calf   : < 12 months (either sex)
 * Heifer : female, >= 12 months, not yet calved
 * Cow    : female, >= 12 months, has calved OR >= 36 months
 * Bull   : male, >= 12 months
 */
export function getAnimalCategory(
  dateOfBirth: string,
  gender: string,
  hasCalved = false,
): AnimalCategory {
  const m = getAgeMonths(dateOfBirth);
  if (m < 12) return 'Calf';
  if (gender === 'male') return 'Bull';
  if (hasCalved || m >= 36) return 'Cow';
  return 'Heifer';
}

export interface CalfFeedingStage {
  label: string;
  recommendation: string;
  color: string;
  glowColor: string;
}

export function getCalfFeedingStage(dateOfBirth: string): CalfFeedingStage | null {
  const m = getAgeMonths(dateOfBirth);
  if (m >= 12) return null;
  if (m < 2) return {
    label: 'Colostrum / Milk',
    recommendation: '0–2 months: Feed colostrum for the first 3–4 days, then whole milk 4–6 L/day.',
    color: '#2563eb',
    glowColor: '#eff6ff',
  };
  if (m < 4) return {
    label: 'Milk + Starter',
    recommendation: '2–4 months: Gradually reduce milk; introduce calf starter pellets and fresh water.',
    color: '#7c3aed',
    glowColor: '#f5f3ff',
  };
  if (m < 7) return {
    label: 'Weaning',
    recommendation: '4–7 months: Wean off milk; increase concentrate and good-quality hay.',
    color: '#d97706',
    glowColor: '#fffbeb',
  };
  return {
    label: 'Grower Ration',
    recommendation: '7–12 months: Forage-based diet with grower concentrate; monitor body condition.',
    color: '#16a34a',
    glowColor: '#f0fdf4',
  };
}

/**
 * 1-arg version — gender check is done by the caller (breeding page only shows females).
 */
export function isBreedingEligible(dateOfBirth: string): boolean {
  return getAgeMonths(dateOfBirth) >= 18;
}

export function monthsToBreedingEligibility(dateOfBirth: string): number {
  return Math.max(0, 18 - getAgeMonths(dateOfBirth));
}

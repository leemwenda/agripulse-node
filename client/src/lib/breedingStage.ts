export interface BreedingStageInfo {
  stage: string;
  detail: string;
  daysElapsed: number;
  color: string;
  glowColor: string;
  urgent: boolean;
}

export function getBreedingStage(
  latestBreeding: {
    serviceDate: string;
    pregnancyStatus: string;
    actualBirthDate?: string | null;
    expectedBirthDate?: string | null;
  } | null,
  dateOfBirth: string,
  gender: string
): BreedingStageInfo | null {
  if (gender === 'male') return null;

  const now = new Date();

  // Has a breeding record
  if (latestBreeding) {
    const serviceDate = new Date(latestBreeding.serviceDate);
    const daysElapsed = Math.floor((now.getTime() - serviceDate.getTime()) / 86400000);
    const status = latestBreeding.pregnancyStatus;

    if (status === 'gave_birth') {
      const birthDate = latestBreeding.actualBirthDate
        ? new Date(latestBreeding.actualBirthDate)
        : serviceDate;
      const daysSinceBirth = Math.floor((now.getTime() - birthDate.getTime()) / 86400000);
      const daysToReady = Math.max(0, 60 - daysSinceBirth);
      if (daysToReady > 0) {
        return { stage: 'Recovery', detail: `Ready in ${daysToReady}d`, daysElapsed: daysSinceBirth, color: '#8b5cf6', glowColor: 'rgba(139,92,246,.25)', urgent: false };
      }
      return { stage: 'Ready', detail: 'Ready for next service', daysElapsed: daysSinceBirth, color: '#10b981', glowColor: 'rgba(16,185,129,.25)', urgent: false };
    }

    if (status === 'failed') {
      return { stage: 'Failed', detail: 'Ready for retry', daysElapsed, color: '#ef4444', glowColor: 'rgba(239,68,68,.25)', urgent: false };
    }

    if (status === 'pregnant' || (status === 'pending' && daysElapsed > 60)) {
      if (daysElapsed >= 283) {
        return { stage: 'Birth Expected', detail: `Day ${daysElapsed} — birth due`, daysElapsed, color: '#f59e0b', glowColor: 'rgba(245,158,11,.35)', urgent: true };
      }
      if (daysElapsed >= 260) {
        const daysLeft = 283 - daysElapsed;
        return { stage: 'Calving Alert', detail: `Birth in ~${daysLeft}d`, daysElapsed, color: '#f59e0b', glowColor: 'rgba(245,158,11,.3)', urgent: true };
      }
      const daysLeft = 283 - daysElapsed;
      return { stage: 'Pregnant', detail: `Day ${daysElapsed} · ${daysLeft}d to calving`, daysElapsed, color: '#6366f1', glowColor: 'rgba(99,102,241,.25)', urgent: false };
    }

    if (status === 'pending' && daysElapsed >= 30 && daysElapsed <= 60) {
      return { stage: 'Check Due', detail: 'Pregnancy check needed', daysElapsed, color: '#f59e0b', glowColor: 'rgba(245,158,11,.25)', urgent: true };
    }

    return { stage: 'Inseminated', detail: `Day ${daysElapsed} · Check at day 30`, daysElapsed, color: '#818cf8', glowColor: 'rgba(129,140,248,.2)', urgent: false };
  }

  // No breeding record — calculate readiness from DOB
  const dob = new Date(dateOfBirth);
  const ageMonths = Math.floor((now.getTime() - dob.getTime()) / (86400000 * 30.44));

  if (ageMonths < 15) {
    const monthsLeft = 15 - ageMonths;
    return { stage: 'Too Young', detail: `Ready in ~${monthsLeft} months`, daysElapsed: 0, color: '#6b7280', glowColor: 'rgba(107,114,128,.15)', urgent: false };
  }

  return { stage: 'Ready', detail: 'Ready for first service', daysElapsed: 0, color: '#10b981', glowColor: 'rgba(16,185,129,.25)', urgent: false };
}

export function getStageProgress(daysElapsed: number): number {
  return Math.min(100, Math.round((daysElapsed / 283) * 100));
}

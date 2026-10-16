import { FormEvent, useState } from 'react';
import { MIN_REASON_LENGTH, REVIEW_DECISIONS } from './constants';
import { describeError } from './errors';
import type { ReviewDecision } from './types';

interface Props {
  /** Should reject (throw) on failure. Success resolves. */
  onSubmit: (decision: ReviewDecision, reason: string) => Promise<void>;
}

export function ReviewForm({ onSubmit }: Props) {
  const [decision, setDecision] = useState<ReviewDecision | ''>('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const trimmed = reason.trim();
  const reasonError = trimmed.length < MIN_REASON_LENGTH
    ? `Enter a reason of at least ${MIN_REASON_LENGTH} characters (${trimmed.length}/${MIN_REASON_LENGTH}).`
    : fieldErrors.reason;
  const decisionError = !decision ? 'Choose a decision.' : fieldErrors.decision;

  async function handle(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (!decision || trimmed.length < MIN_REASON_LENGTH) return;
    setBusy(true);
    setFieldErrors({});
    try {
      await onSubmit(decision, trimmed);
      setDecision('');
      setReason('');
      setTouched(false);
    } catch (err) {
      const info = describeError(err, 'Could not save the review.');
      setServerError(info.message);
      setFieldErrors(info.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} noValidate aria-label="Record a review decision" className="ii-root" style={{ gap: 10 }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <legend className="ii-muted" style={{ marginBottom: 6 }}>Decision</legend>
        {REVIEW_DECISIONS.map(d => (
          <label key={d.value} className="ii-radio">
            <input type="radio" name="decision" value={d.value} checked={decision === d.value} onChange={() => setDecision(d.value)} />
            <span>{d.label}<small>{d.hint}</small></span>
          </label>
        ))}
        {touched && decisionError && <div className="ii-error" role="alert">{decisionError}</div>}
      </fieldset>
      <div className="ii-field">
        <label htmlFor="ii-reason">Reason (required, at least {MIN_REASON_LENGTH} characters)</label>
        <textarea
          id="ii-reason"
          className="ii-input"
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          aria-invalid={touched && !!reasonError}
          aria-describedby={touched && reasonError ? 'ii-reason-err' : undefined}
        />
        {touched && reasonError && <div id="ii-reason-err" className="ii-error" role="alert">{reasonError}</div>}
      </div>
      {serverError && <div className="ii-error" role="alert">{serverError}</div>}
      <div className="ii-row">
        <button type="submit" className="ii-btn primary" disabled={busy}>{busy ? 'Saving...' : 'Save review'}</button>
      </div>
    </form>
  );
}

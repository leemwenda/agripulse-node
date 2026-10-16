import { humanize } from './format';
import type { FlagSeverity, ImageFlag } from './types';

const REVIEW_COLORS: Record<string, string> = {
  pending: 'amber', needs_review: 'amber', reviewed: 'green', confirmed_issue: 'red', inconclusive: 'blue',
  legitimate: 'green', suspicious: 'amber', confirmed: 'red',
};
const SEVERITY_COLORS: Record<FlagSeverity, string> = { info: 'blue', warning: 'amber', critical: 'red' };

export function ReviewBadge({ status }: { status: string }) {
  return <span className={`ii-badge ${REVIEW_COLORS[status] ?? ''}`}>{humanize(status)}</span>;
}

export function FlagBadge({ flag }: { flag: ImageFlag }) {
  return <span className={`ii-badge ${SEVERITY_COLORS[flag.severity]}`} title={flag.detail}>{flag.label}</span>;
}

export function MetadataBadge({ status }: { status: string }) {
  return <span className="ii-badge purple">Metadata: {humanize(status)}</span>;
}

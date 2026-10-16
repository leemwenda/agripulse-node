import { REVIEW_FILTER_OPTIONS } from './constants';
import { humanize } from './format';
import type { ImageFilters } from './types';

export interface FilterOptions { sources: string[]; metadata: string[]; flags: string[] }

interface Props {
  filters: ImageFilters;
  options: FilterOptions;
  onChange: (patch: Partial<ImageFilters>) => void;
  onReset: () => void;
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select className="ii-input" aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{label}: all</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const toOptions = (vals: string[]) => vals.map(v => ({ value: v, label: humanize(v) }));

export function FilterBar({ filters, options, onChange, onReset }: Props) {
  const active = filters.search || filters.source || filters.review || filters.metadata || filters.flag || filters.unresolvedOnly;
  return (
    <div className="ii-row" role="search">
      <input
        className="ii-input ii-search"
        type="search"
        aria-label="Search images"
        placeholder="Search by image, animal, listing or farm ID"
        value={filters.search}
        onChange={e => onChange({ search: e.target.value })}
      />
      <Select label="Source" value={filters.source} onChange={v => onChange({ source: v })} options={toOptions(options.sources)} />
      <Select label="Review" value={filters.review} onChange={v => onChange({ review: v })} options={REVIEW_FILTER_OPTIONS} />
      <Select label="Metadata" value={filters.metadata} onChange={v => onChange({ metadata: v })} options={toOptions(options.metadata)} />
      <Select label="Flag" value={filters.flag} onChange={v => onChange({ flag: v })} options={toOptions(options.flags)} />
      <label className="ii-check">
        <input type="checkbox" checked={filters.unresolvedOnly} onChange={e => onChange({ unresolvedOnly: e.target.checked })} />
        Unresolved only
      </label>
      {active && <button type="button" className="ii-btn" onClick={onReset}>Clear filters</button>}
    </div>
  );
}

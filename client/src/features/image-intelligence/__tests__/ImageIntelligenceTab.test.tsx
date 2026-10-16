import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { DETAIL, LIST, STATS } from './fixtures';

vi.mock('../../../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import api from '../../../lib/api';
import { ImageIntelligenceTab } from '../ImageIntelligenceTab';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const post = api.post as unknown as ReturnType<typeof vi.fn>;
const blob = () => ({ data: new Blob(['x'], { type: 'image/jpeg' }) });
const httpError = (status: number, data: unknown = {}) => new AxiosError('x', 'ERR', undefined, undefined, {
  status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data,
});

function route(overrides: Record<string, unknown> = {}) {
  get.mockImplementation((url: string, cfg?: unknown) => {
    if (url in overrides) { const v = overrides[url]; return v instanceof Error ? Promise.reject(v) : Promise.resolve({ data: v }); }
    if (url.endsWith('/file')) return Promise.resolve(blob());
    if (url === '/admin/images/stats') return Promise.resolve({ data: STATS });
    if (url === '/admin/images') return Promise.resolve({ data: LIST });
    if (/^\/admin\/images\/\d+$/.test(url)) return Promise.resolve({ data: DETAIL });
    return Promise.reject(new Error(`unexpected ${url} ${JSON.stringify(cfg)}`));
  });
}
const lastListCall = () => { const c = get.mock.calls.filter(x => x[0] === '/admin/images'); return c[c.length - 1]; };
const openFirst = async () => { await userEvent.click(await screen.findByRole('button', { name: 'Animal photo #1' })); return screen.findByRole('dialog'); };

beforeEach(() => { get.mockReset(); post.mockReset(); });

describe('ImageIntelligenceTab', () => {
  it('renders backend statistics and an honest inactive AI detector state', async () => {
    route();
    render(<ImageIntelligenceTab />);
    expect(await screen.findByText('Total images')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Unresolved')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.queryByText('AI flagged (advisory)')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Animal photo #1' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no images', async () => {
    route({ '/admin/images': { items: [], page: 1, limit: 24, total: 0, pages: 0 } });
    render(<ImageIntelligenceTab />);
    expect(await screen.findByText('No images have been recorded yet.')).toBeInTheDocument();
  });

  it('shows 403 as a permission error', async () => {
    route({ '/admin/images': httpError(403, { error: 'Forbidden' }) });
    render(<ImageIntelligenceTab />);
    expect(await screen.findByText(/Super Admin access is required/)).toBeInTheDocument();
  });

  it('sends backend filter params, resets to page 1, and supports unresolved-only', async () => {
    route();
    render(<ImageIntelligenceTab />);
    await screen.findByRole('button', { name: 'Animal photo #1' });
    await userEvent.selectOptions(screen.getByLabelText('Review'), 'needs_review');
    await userEvent.selectOptions(screen.getByLabelText('Source'), 'market_photo');
    await userEvent.click(screen.getByLabelText('Unresolved only'));
    await waitFor(() => expect(lastListCall()[1].params).toMatchObject({ page: 1, reviewStatus: 'needs_review', source: 'market_photo', unresolved: 'true' }));
  });

  it('sends the search text as q after a debounce', async () => {
    route();
    render(<ImageIntelligenceTab />);
    await screen.findByRole('button', { name: 'Animal photo #1' });
    await userEvent.type(screen.getByLabelText('Search images'), '42');
    await waitFor(() => expect(lastListCall()[1].params.q).toBe('42'));
  });

  it('paginates', async () => {
    route();
    render(<ImageIntelligenceTab />);
    await screen.findByRole('button', { name: 'Animal photo #1' });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(lastListCall()[1].params.page).toBe(2));
  });

  it('opens the detail drawer with flags, metadata, comparison, AI state and limitations', async () => {
    route();
    render(<ImageIntelligenceTab />);
    const dialog = await openFirst();
    expect(await within(dialog).findByText('Score 0.93')).toBeInTheDocument();
    expect(within(dialog).getByText('Different farm (#4)')).toBeInTheDocument();
    expect(within(dialog).getByText('Earlier image this one resembles: Market photo #2')).toBeInTheDocument();
    expect(within(dialog).getByText('AI assessment not run.')).toBeInTheDocument();
    expect(within(dialog).getByText('No EXIF block found')).toBeInTheDocument();
    expect(within(dialog).getByText(/Missing metadata does not prove/)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/not proof of fraud/).length).toBeGreaterThan(0);
  });

  it('shows a 404 in the drawer when the image no longer exists', async () => {
    route({ '/admin/images/1': httpError(404, { error: 'Not found' }) });
    render(<ImageIntelligenceTab />);
    await userEvent.click(await screen.findByRole('button', { name: 'Animal photo #1' }));
    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  it('posts a review with the decision and trimmed reason, then refreshes', async () => {
    route();
    post.mockResolvedValue({ data: { reviewStatus: 'inconclusive' } });
    render(<ImageIntelligenceTab />);
    const dialog = await openFirst();
    await userEvent.click(await within(dialog).findByLabelText(/Inconclusive/));
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Photo cropped, cannot tell');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/admin/images/1/review', { decision: 'inconclusive', reason: 'Photo cropped, cannot tell' }));
    expect(await screen.findByText('Review saved.')).toBeInTheDocument();
  });

  it('shows the backend 409 for confirming without evidence', async () => {
    route();
    post.mockRejectedValue(httpError(409, { error: 'Cannot confirm an issue when no evidence flags exist for this image.' }));
    render(<ImageIntelligenceTab />);
    const dialog = await openFirst();
    await userEvent.click(await within(dialog).findByLabelText(/Confirmed/));
    await userEvent.type(within(dialog).getByLabelText(/Reason/), 'Looks reused from a listing');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save review' }));
    expect(await within(dialog).findByText(/Cannot confirm an issue/)).toBeInTheDocument();
  });

  it('requires confirmation before the backfill, then reports the result', async () => {
    route();
    post.mockResolvedValue({ data: { processed: 12 } });
    render(<ImageIntelligenceTab />);
    await screen.findByRole('button', { name: 'Animal photo #1' });
    await userEvent.click(screen.getByRole('button', { name: 'Run backfill' }));
    expect(post).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm backfill' }));
    expect(await screen.findByText('Backfill finished (processed: 12).')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/admin/images/backfill');
  });

  it('surfaces a backfill failure', async () => {
    route();
    post.mockRejectedValue(httpError(409, { error: 'A backfill is already running' }));
    render(<ImageIntelligenceTab />);
    await screen.findByRole('button', { name: 'Animal photo #1' });
    await userEvent.click(screen.getByRole('button', { name: 'Run backfill' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm backfill' }));
    expect(await screen.findByText('A backfill is already running')).toBeInTheDocument();
  });

  it('re-runs analysis and shows a 409 conflict inline', async () => {
    route();
    post.mockRejectedValue(httpError(409, { error: 'Analysis already in progress' }));
    render(<ImageIntelligenceTab />);
    const dialog = await openFirst();
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Re-run analysis' }));
    expect(await within(dialog).findByText('Analysis already in progress')).toBeInTheDocument();
  });
});

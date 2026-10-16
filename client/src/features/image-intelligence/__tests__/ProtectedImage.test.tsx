import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('../../../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
import api from '../../../lib/api';
import { ProtectedImage } from '../ProtectedImage';

const get = api.get as unknown as ReturnType<typeof vi.fn>;
const httpError = (status: number) => new AxiosError('x', 'ERR', undefined, undefined, {
  status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: new Blob(['{}']),
});

describe('ProtectedImage', () => {
  it('fetches the file through the API client as a blob and renders an object URL', async () => {
    get.mockResolvedValue({ data: new Blob(['x'], { type: 'image/jpeg' }) });
    render(<ProtectedImage id="12" alt="cow" />);
    const img = await screen.findByRole('img', { name: 'cow' });
    expect(img.getAttribute('src')).toMatch(/^blob:/);
    expect(get).toHaveBeenCalledWith('/admin/images/12/file', expect.objectContaining({ responseType: 'blob' }));
  });

  it.each([
    [404, 'Image file not found.'],
    [403, 'No permission to view this image.'],
    [500, 'Preview unavailable.'],
  ])('shows a specific message for HTTP %i', async (status, text) => {
    get.mockRejectedValue(httpError(status));
    render(<ProtectedImage id="12" alt="cow" />);
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('offers a retry for transient failures', async () => {
    get.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce({ data: new Blob(['x'], { type: 'image/png' }) });
    render(<ProtectedImage id="12" alt="cow" />);
    (await screen.findByRole('button', { name: 'Retry' })).click();
    expect(await screen.findByRole('img', { name: 'cow' })).toBeInTheDocument();
  });
});

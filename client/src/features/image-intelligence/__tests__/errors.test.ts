import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { describeError } from '../errors';

function axiosErr(status: number | null, data?: unknown) {
  const err = new AxiosError('fail', 'ERR', undefined, undefined, status === null ? undefined : {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data,
  });
  return err;
}

describe('describeError', () => {
  it('maps 401, 403 and 404 to distinct kinds', () => {
    expect(describeError(axiosErr(401)).kind).toBe('auth');
    expect(describeError(axiosErr(403)).kind).toBe('forbidden');
    expect(describeError(axiosErr(404)).kind).toBe('not_found');
  });
  it('uses the backend message for 409 conflicts', () => {
    const e = describeError(axiosErr(409, { message: 'Image already reviewed' }));
    expect(e.kind).toBe('conflict');
    expect(e.message).toBe('Image already reviewed');
  });
  it('extracts field errors from validation responses', () => {
    const e = describeError(axiosErr(422, { errors: [{ field: 'reason', message: 'Reason is too short' }] }));
    expect(e.kind).toBe('validation');
    expect(e.fieldErrors.reason).toBe('Reason is too short');
    expect(e.message).toBe('Reason is too short');
  });
  it('prefers the field message from a zod-style details object over the generic error', () => {
    const e = describeError(axiosErr(400, { error: 'Invalid review', details: { reason: ['Please give a reason of at least 10 characters'] } }));
    expect(e.message).toBe('Please give a reason of at least 10 characters');
    expect(e.fieldErrors.reason).toBe('Please give a reason of at least 10 characters');
  });
  it('uses the backend error text for a 409', () => {
    expect(describeError(axiosErr(409, { error: 'Cannot confirm an issue when no evidence flags exist for this image.' })).message)
      .toBe('Cannot confirm an issue when no evidence flags exist for this image.');
  });
  it('reports network failures when there is no response', () => {
    expect(describeError(axiosErr(null)).kind).toBe('network');
  });
  it('does not leak raw HTML error pages', () => {
    expect(describeError(axiosErr(400, '<html>bad</html>')).message).not.toContain('<html>');
  });
});

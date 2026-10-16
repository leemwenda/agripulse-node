import axios from 'axios';

export type ErrorKind = 'auth' | 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'network' | 'server' | 'unknown';

export interface ApiErrorInfo {
  status: number | null;
  kind: ErrorKind;
  message: string;
  fieldErrors: Record<string, string>;
}

export class UnexpectedResponseError extends Error {
  constructor(message = 'The server returned an unexpected response.') {
    super(message);
    this.name = 'UnexpectedResponseError';
  }
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Pulls a human message and per-field errors out of common backend error shapes. */
function readBody(data: unknown): { message?: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  if (typeof data === 'string' && data.trim() && data.length < 300 && !data.trimStart().startsWith('<')) {
    return { message: data.trim(), fields };
  }
  if (!isRec(data)) return { fields };
  const parts: string[] = [];
  const add = (field: string | undefined, msg: unknown) => {
    if (typeof msg !== 'string' || !msg.trim()) return;
    parts.push(msg.trim());
    if (field && !fields[field]) fields[field] = msg.trim();
  };
  const errs = data.errors ?? data.details;
  if (Array.isArray(errs)) {
    for (const e of errs) {
      if (typeof e === 'string') add(undefined, e);
      else if (isRec(e)) add(
        typeof e.field === 'string' ? e.field : typeof e.path === 'string' ? e.path : typeof e.param === 'string' ? e.param : undefined,
        e.message ?? e.msg,
      );
    }
  } else if (isRec(errs)) {
    for (const [k, v] of Object.entries(errs)) add(k, Array.isArray(v) ? v[0] : v);
  }
  const top = typeof data.message === 'string' ? data.message : typeof data.error === 'string' ? data.error : undefined;
  const message = parts.length ? parts.join(' ') : top?.trim() || undefined;
  return { message, fields };
}

export function describeError(err: unknown, fallback = 'Something went wrong. Try again.'): ApiErrorInfo {
  if (!axios.isAxiosError(err)) {
    return { status: null, kind: 'unknown', message: err instanceof Error && err.message ? err.message : fallback, fieldErrors: {} };
  }
  const status = err.response?.status ?? null;
  // With responseType 'blob' the body is a Blob, so only the status is usable.
  const body = readBody(typeof Blob !== 'undefined' && err.response?.data instanceof Blob ? undefined : err.response?.data);

  if (status === null) {
    return { status, kind: 'network', message: 'Cannot reach the server. Check your connection and try again.', fieldErrors: {} };
  }
  if (status === 401) return { status, kind: 'auth', message: 'Your session has expired. Sign in again to continue.', fieldErrors: {} };
  if (status === 403) return { status, kind: 'forbidden', message: 'You do not have permission to do this. Super Admin access is required.', fieldErrors: {} };
  if (status === 404) return { status, kind: 'not_found', message: body.message || 'This image could not be found. It may have been removed.', fieldErrors: {} };
  if (status === 409) {
    return { status, kind: 'conflict', message: body.message || 'This image was changed or is being processed by someone else. Refresh and try again.', fieldErrors: body.fields };
  }
  if (status === 400 || status === 422) {
    return { status, kind: 'validation', message: body.message || 'The server rejected this request. Check the values and try again.', fieldErrors: body.fields };
  }
  if (status >= 500) return { status, kind: 'server', message: 'The server had a problem handling this request. Try again shortly.', fieldErrors: {} };
  return { status, kind: 'unknown', message: body.message || fallback, fieldErrors: body.fields };
}

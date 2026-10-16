import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { fetchImageDetail, fetchImageFile, fetchImages, fetchStats } from './api';
import { ApiErrorInfo, describeError } from './errors';
import { normalizeDetail, normalizeList, normalizeStats } from './normalize';
import type { ImageDetail, ImageFilters, ImageListResult, ImageStats } from './types';

export type LoadState<T> =
  | { status: 'loading'; data?: T }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: ApiErrorInfo; data?: T };

/** Generic abortable loader that keeps the previous data visible while reloading. */
function useLoader<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState(s => ({ status: 'loading', data: s.data }));
    load(ctrl.signal)
      .then(data => { if (!ctrl.signal.aborted) setState({ status: 'ready', data }); })
      .catch(err => {
        if (axios.isCancel(err) || ctrl.signal.aborted) return;
        setState(s => ({ status: 'error', error: describeError(err), data: s.data }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  return { state, reload };
}

export function useImageStats() {
  return useLoader<ImageStats>(async s => normalizeStats((await fetchStats(s)).data), []);
}

export function useImageList(filters: ImageFilters) {
  return useLoader<ImageListResult>(async s => normalizeList((await fetchImages(filters, s)).data), [filters]);
}

export function useImageDetail(id: string | null) {
  const loader = useLoader<ImageDetail | null>(
    async s => (id ? normalizeDetail((await fetchImageDetail(id, s)).data) : null),
    [id],
  );
  return loader;
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export type ProtectedImageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error'; error: ApiErrorInfo };

/**
 * Loads a protected image through the authenticated API client and exposes it as an object URL.
 * The object URL is revoked on unmount, id change, or retry.
 */
export function useProtectedImage(id: string | null, enabled = true) {
  const [state, setState] = useState<ProtectedImageState>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id || !enabled) { setState({ status: 'idle' }); return; }
    const ctrl = new AbortController();
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: 'loading' });
    fetchImageFile(id, ctrl.signal)
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', url: objectUrl });
      })
      .catch(err => {
        if (cancelled || axios.isCancel(err)) return;
        setState({ status: 'error', error: describeError(err, 'Could not load the image.') });
      });
    return () => {
      cancelled = true;
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, enabled, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { state, retry };
}

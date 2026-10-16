import api from '../../lib/api';
import type { ImageFilters, ReviewDecision } from './types';

/**
 * Query parameters for GET /api/admin/images, matching the backend's zod schema
 * (page, limit, source, reviewStatus, flag, metadata, unresolved, q).
 */
export function buildListParams(f: ImageFilters): Record<string, string | number> {
  const p: Record<string, string | number> = { page: f.page, limit: f.pageSize };
  const search = f.search.trim();
  if (search) p.q = search;
  if (f.source) p.source = f.source;
  if (f.review) p.reviewStatus = f.review;
  if (f.metadata) p.metadata = f.metadata;
  if (f.flag) p.flag = f.flag;
  if (f.unresolvedOnly) p.unresolved = 'true';
  return p;
}

const imagePath = (id: string) => `/admin/images/${encodeURIComponent(id)}`;

export const fetchStats = (signal?: AbortSignal) => api.get('/admin/images/stats', { signal });

export const fetchImages = (filters: ImageFilters, signal?: AbortSignal) =>
  api.get('/admin/images', { params: buildListParams(filters), signal });

export const fetchImageDetail = (id: string, signal?: AbortSignal) => api.get(imagePath(id), { signal });

/** Protected file: sent through the shared axios client so session cookies and 401 handling apply. */
export async function fetchImageFile(id: string, signal?: AbortSignal): Promise<Blob> {
  const res = await api.get<Blob>(`${imagePath(id)}/file`, { responseType: 'blob', signal });
  return res.data;
}

export const reanalyzeImage = (id: string) => api.post(`${imagePath(id)}/reanalyze`);

export const submitReview = (id: string, decision: ReviewDecision, reason: string) =>
  api.post(`${imagePath(id)}/review`, { decision, reason: reason.trim() });

export const startBackfill = () => api.post('/admin/images/backfill');

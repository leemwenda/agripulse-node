// Super Admin cow re-identification API. Mounted at /api/admin/reid.
// Candidate matches only. Nothing here changes animals, image records or fraud review status.
import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import { animalKey, animalIdFromKey, SIMILARITY_NOTE, resolveUploadPath } from '../services/reid.logic';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

const SVC = process.env.REID_SERVICE_URL || 'http://127.0.0.1:7861';
const TOKEN = process.env.REID_TOKEN || '';
const QUERY_DIR = path.resolve(__dirname, '../../uploads/cow-reid');

class ServiceOffline extends Error {}

async function upstream(method: 'GET' | 'POST', urlPath: string, body?: FormData): Promise<globalThis.Response> {
  if (!TOKEN) throw new ServiceOffline('REID_TOKEN not set');
  try {
    return await fetch(`${SVC}${urlPath}`, {
      method,
      headers: { 'X-Service-Token': TOKEN },
      body,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new ServiceOffline('unreachable');
  }
}

async function callJson(method: 'GET' | 'POST', urlPath: string, body?: FormData) {
  const r = await upstream(method, urlPath, body);
  const data: any = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

function fail(res: Response, e: unknown) {
  if (e instanceof ServiceOffline) {
    res.status(503).json({ error: 'Cow re-identification service is offline.' });
    return;
  }
  console.error('[ReID]', (e as Error)?.message);
  res.status(500).json({ error: 'Cow re-identification request failed.' });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 100 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

const toBlob = (f: any) => new Blob([f.buffer], { type: f.mimetype });
const parseId = (v: unknown) => {
  const n = parseInt(String(v), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};
const ANIMAL_SELECT = { id: true, name: true, tagNumber: true, agripulseId: true, status: true } as const;

async function shapeCandidates(queryId: number) {
  const rows = await prisma.cowIdentityCandidate.findMany({ where: { queryId }, orderBy: { rank: 'asc' } });
  const animals = await prisma.animal.findMany({
    where: { id: { in: rows.map(r => r.animalId) } },
    select: ANIMAL_SELECT,
  });
  const am = new Map(animals.map(a => [a.id, a]));
  const reviews = await prisma.cowIdentityReview.findMany({
    where: { candidateId: { in: rows.map(r => r.id) } },
    orderBy: { createdAt: 'desc' },
  });
  const reviewerIds = Array.from(new Set(reviews.map(r => r.reviewerId)));
  const users = reviewerIds.length
    ? await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true } })
    : [];
  const um = new Map(users.map(u => [u.id, u.name]));
  return rows.map(r => ({
    id: r.id,
    rank: r.rank,
    similarity: r.similarity,
    referenceIndex: r.referenceIndex,
    animal: am.get(r.animalId) ?? null,
    previewUrl: r.referenceIndex !== null ? `/api/admin/reid/candidates/${r.id}/photo` : null,
    reviews: reviews
      .filter(v => v.candidateId === r.id)
      .map(v => ({
        id: v.id,
        decision: v.decision,
        reason: v.reason,
        createdAt: v.createdAt,
        reviewerName: um.get(v.reviewerId) ?? null,
      })),
  }));
}

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const { status, data } = await callJson('GET', '/health');
    res.status(status).json(data);
  } catch (e) {
    fail(res, e);
  }
});

router.get('/animals', async (_req: Request, res: Response) => {
  try {
    const animals = await prisma.animal.findMany({
      select: { ...ANIMAL_SELECT, farm: { select: { name: true } } },
      orderBy: { tagNumber: 'asc' },
      take: 2000,
    });
    res.json({ animals });
  } catch (e) {
    fail(res, e);
  }
});

// Upload a query photo, store it on the server, and record the candidate matches.
router.post('/identify', upload.single('photo'), async (req: Request, res: Response) => {
  const file = (req as any).file;
  if (!file) {
    res.status(400).json({ error: 'Upload one photo.' });
    return;
  }
  try {
    const form = new FormData();
    form.append('photo', toBlob(file), 'query.jpg');
    form.append('top_k', '5');
    const { status, data } = await callJson('POST', '/identify', form);
    if (status !== 200) {
      res.status(502).json({ error: 'Re-ID service rejected the photo.' });
      return;
    }
    if (data.status !== 'ok') {
      res.json({ status: data.status, label: data.label ?? null, queryId: null, candidates: [], note: SIMILARITY_NOTE });
      return;
    }

    const ranked = (data.candidates as any[])
      .map(c => ({ c, id: animalIdFromKey(c.key) }))
      .filter((x): x is { c: any; id: number } => x.id !== null);
    const animals = await prisma.animal.findMany({
      where: { id: { in: ranked.map(x => x.id) } },
      select: { id: true },
    });
    const existing = new Set(animals.map(a => a.id));

    fs.mkdirSync(QUERY_DIR, { recursive: true });
    const photoFile = `${crypto.randomUUID()}.jpg`;
    fs.writeFileSync(path.join(QUERY_DIR, photoFile), file.buffer);
    const query = await prisma.cowIdentityQuery.create({
      data: { requestedBy: req.user!.id, photoPath: photoFile },
    });

    let rank = 0;
    for (const { c, id } of ranked) {
      if (!existing.has(id)) continue; // animal deleted since registration: skip, never invent one
      rank++;
      await prisma.cowIdentityCandidate.create({
        data: {
          queryId: query.id,
          animalId: id,
          rank,
          similarity: c.similarity,
          referenceIndex: c.referenceIndex ?? null,
        },
      });
    }

    res.json({
      status: data.status,
      queryId: query.id,
      threshold: data.threshold,
      note: SIMILARITY_NOTE,
      candidates: await shapeCandidates(query.id),
    });
  } catch (e) {
    fail(res, e);
  }
});

// Register photos to one real animal record. Requires an explicit confirmation flag.
const registerBody = z.object({
  animalId: z.coerce.number().int().positive(),
  confirmed: z.literal('true'),
});

router.post('/register', upload.array('photos', 100), async (req: Request, res: Response) => {
  const b = registerBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: 'Choose an animal record and confirm the photos show that animal.' });
    return;
  }
  const files = ((req as any).files || []) as any[];
  if (!files.length) {
    res.status(400).json({ error: 'Upload at least one photo.' });
    return;
  }
  try {
    const animal = await prisma.animal.findUnique({ where: { id: b.data.animalId }, select: ANIMAL_SELECT });
    if (!animal) {
      res.status(404).json({ error: 'Animal record not found.' });
      return;
    }
    const form = new FormData();
    form.append('animalKey', animalKey(animal.id));
    files.forEach(f => form.append('photos', toBlob(f), f.originalname || 'photo.jpg'));
    const { status, data } = await callJson('POST', '/register', form);
    if (status !== 200) {
      res.status(502).json({ error: 'Re-ID service rejected the photos.' });
      return;
    }
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'reid_register_photos', entity: 'animals', entityId: animal.id },
    });
    res.json({ ...data, animal });
  } catch (e) {
    fail(res, e);
  }
});

// Propose groups only. Assignment happens by calling /register once per group.
router.post('/group', upload.array('photos', 100), async (req: Request, res: Response) => {
  const files = ((req as any).files || []) as any[];
  if (!files.length) {
    res.status(400).json({ error: 'Upload at least one photo.' });
    return;
  }
  const threshold = Number(req.body?.threshold ?? 0.5);
  if (!Number.isFinite(threshold) || threshold < 0.1 || threshold > 0.9) {
    res.status(400).json({ error: 'Threshold must be between 0.1 and 0.9.' });
    return;
  }
  try {
    const form = new FormData();
    form.append('threshold', String(threshold));
    files.forEach(f => form.append('photos', toBlob(f), f.originalname || 'photo.jpg'));
    const { status, data } = await callJson('POST', '/group', form);
    if (status !== 200) {
      res.status(502).json({ error: 'Re-ID service rejected the photos.' });
      return;
    }
    res.json({ ...data, note: SIMILARITY_NOTE });
  } catch (e) {
    fail(res, e);
  }
});

router.get('/queries/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  try {
    const query = await prisma.cowIdentityQuery.findUnique({ where: { id } });
    if (!query) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    res.json({
      query: { id: query.id, createdAt: query.createdAt, photoUrl: `/api/admin/reid/queries/${id}/photo` },
      candidates: await shapeCandidates(id),
      note: SIMILARITY_NOTE,
    });
  } catch (e) {
    fail(res, e);
  }
});

router.get('/queries/:id/photo', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  try {
    const query = await prisma.cowIdentityQuery.findUnique({ where: { id }, select: { photoPath: true } });
    if (!query) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const file = path.join(QUERY_DIR, path.basename(query.photoPath));
    if (!fs.existsSync(file)) {
      res.status(404).json({ error: 'Photo not available.' });
      return;
    }
    res.type('jpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(file, { dotfiles: 'deny' });
  } catch (e) {
    fail(res, e);
  }
});

// Serves the matched reference photo, fetched from the laptop service.
router.get('/candidates/:id/photo', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  try {
    const c = await prisma.cowIdentityCandidate.findUnique({ where: { id } });
    if (!c || c.referenceIndex === null) {
      res.status(404).json({ error: 'No preview for this candidate.' });
      return;
    }
    const up = await upstream('GET', `/photo/${animalKey(c.animalId)}/${c.referenceIndex}`);
    if (up.status !== 200) {
      res.status(404).json({ error: 'Preview not available.' });
      return;
    }
    const buf = Buffer.from(await up.arrayBuffer());
    res.type(up.headers.get('content-type') || 'image/jpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buf);
  } catch (e) {
    fail(res, e);
  }
});

// Human decision on one candidate. Appended as history. Never changes the animal or any fraud record.
const reviewBody = z.object({
  decision: z.enum(['same_animal', 'different_animals', 'inconclusive']),
  reason: z.string().trim().min(10, 'Give a reason of at least 10 characters').max(1000),
});

router.post('/candidates/:id/review', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Invalid id.' });
    return;
  }
  const b = reviewBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: 'Invalid review', details: b.error.flatten().fieldErrors });
    return;
  }
  try {
    const cand = await prisma.cowIdentityCandidate.findUnique({ where: { id }, select: { id: true } });
    if (!cand) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }
    const review = await prisma.cowIdentityReview.create({
      data: { candidateId: id, reviewerId: req.user!.id, decision: b.data.decision, reason: b.data.reason },
    });
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: `cow_candidate_${b.data.decision}`, entity: 'cow_identity_candidates', entityId: id },
    });
    res.status(201).json({ review });
  } catch (e) {
    fail(res, e);
  }
});


// Workspace summary: real model status, recent queries, review counts. Read-only.
router.get('/workspace', async (_req: Request, res: Response) => {
  try {
    let model: { connected: boolean; device?: string; threshold?: number; model?: string } = { connected: false };
    try {
      const { status, data } = await callJson('GET', '/health');
      if (status === 200) model = { connected: true, device: data.device, threshold: data.threshold, model: data.model };
    } catch {
      // service offline: connected stays false
    }
    const queries = await prisma.cowIdentityQuery.findMany({
      orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, createdAt: true },
    });
    const candidates = await prisma.cowIdentityCandidate.findMany({ select: { id: true, queryId: true } });
    const reviewed = new Set(
      (await prisma.cowIdentityReview.findMany({ select: { candidateId: true } })).map(r => r.candidateId),
    );
    const perQuery = new Map<number, { total: number; awaiting: number }>();
    for (const c of candidates) {
      const e = perQuery.get(c.queryId) ?? { total: 0, awaiting: 0 };
      e.total++;
      if (!reviewed.has(c.id)) e.awaiting++;
      perQuery.set(c.queryId, e);
    }
    res.json({
      model,
      candidates: candidates.length,
      awaitingReview: candidates.filter(c => !reviewed.has(c.id)).length,
      queries: queries.map(q => ({
        id: q.id,
        createdAt: q.createdAt,
        candidateCount: perQuery.get(q.id)?.total ?? 0,
        awaitingReview: perQuery.get(q.id)?.awaiting ?? 0,
      })),
    });
  } catch (e) {
    fail(res, e);
  }
});


// ─── Database-backed workflows: Super Admin selects stored AgriPulse photos. No local uploads. ───
const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const PHOTO_LIMIT = 100;
const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const mimeFor = (file: string) => MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
const idList = z.array(z.number().int().positive()).min(1).max(PHOTO_LIMIT);

// Only files reached through a stored AnimalPhoto row, and only inside the upload root, are ever read.
function storedPhotoFile(url: string): string | null {
  const full = resolveUploadPath(UPLOADS_ROOT, url);
  if (!full) return null;
  try {
    return fs.statSync(full).isFile() ? full : null;
  } catch {
    return null;
  }
}

interface StoredPhoto { id: number; animalId: number; buf: Buffer; name: string; mime: string }

async function loadStoredPhotos(ids: number[], animalId?: number): Promise<{ photos: StoredPhoto[] } | { error: string }> {
  if (new Set(ids).size !== ids.length) return { error: 'Each photo can be selected only once.' };
  const rows = await prisma.animalPhoto.findMany({
    where: { id: { in: ids }, ...(animalId !== undefined ? { animalId } : {}) },
    select: { id: true, animalId: true, url: true },
  });
  const byId = new Map(rows.map(r => [r.id, r]));
  const photos: StoredPhoto[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) return { error: `Photo ${id} was not found for this animal record.` };
    const file = storedPhotoFile(row.url);
    if (!file) return { error: `Photo ${id} is missing from storage.` };
    photos.push({ id, animalId: row.animalId, buf: fs.readFileSync(file), name: `photo-${id}${path.extname(file)}`, mime: mimeFor(file) });
  }
  return { photos };
}

// Animals that have at least one stored photo. Primary photo first. Upload paths are never returned.
router.get('/animals-with-photos', async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim().slice(0, 80);
  try {
    const where: any = { photos: { some: {} } };
    if (q) where.OR = [{ name: { contains: q } }, { tagNumber: { contains: q } }, { agripulseId: { contains: q } }];
    const animals = await prisma.animal.findMany({
      where,
      select: {
        ...ANIMAL_SELECT,
        photos: { select: { id: true, isPrimary: true }, orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
      },
      orderBy: { tagNumber: 'asc' },
      take: 300,
    });
    res.json({
      animals: animals.map(a => ({
        ...a,
        photos: a.photos.map(p => ({ ...p, fileUrl: `/api/admin/reid/animal-photos/${p.id}/file` })),
      })),
    });
  } catch (e) {
    fail(res, e);
  }
});

// Serves one stored animal photo to the browser, through the authenticated API only.
router.get('/animal-photos/:id/file', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Invalid id.' }); return; }
  try {
    const row = await prisma.animalPhoto.findUnique({ where: { id }, select: { url: true } });
    const file = row ? storedPhotoFile(row.url) : null;
    if (!file) { res.status(404).json({ error: 'Photo not available.' }); return; }
    res.type(mimeFor(file));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(file, { dotfiles: 'deny' });
  } catch (e) {
    fail(res, e);
  }
});

// Identify one stored photo. Compares it against every OTHER animal record's reference photos.
router.post('/identify-from-db', async (req: Request, res: Response) => {
  const b = z.object({ photoId: z.coerce.number().int().positive() }).safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Choose one stored photo.' }); return; }
  try {
    const loaded = await loadStoredPhotos([b.data.photoId]);
    if ('error' in loaded) { res.status(400).json({ error: loaded.error }); return; }
    const src = loaded.photos[0];
    const form = new FormData();
    form.append('photo', new Blob([src.buf], { type: src.mime }), src.name);
    form.append('top_k', '10');
    const { status, data } = await callJson('POST', '/identify', form);
    if (status !== 200) { res.status(502).json({ error: 'Re-ID service rejected the photo.' }); return; }
    if (data.status !== 'ok') {
      res.json({ status: data.status, label: data.label ?? null, queryId: null, candidates: [], note: SIMILARITY_NOTE });
      return;
    }

    const others = (data.candidates as any[])
      .map(c => ({ c, id: animalIdFromKey(c.key) }))
      .filter((x): x is { c: any; id: number } => x.id !== null && x.id !== src.animalId);
    const existing = new Set(
      (await prisma.animal.findMany({ where: { id: { in: others.map(x => x.id) } }, select: { id: true } })).map(a => a.id),
    );

    fs.mkdirSync(QUERY_DIR, { recursive: true });
    const photoFile = `${crypto.randomUUID()}.jpg`;
    fs.writeFileSync(path.join(QUERY_DIR, photoFile), src.buf);
    const query = await prisma.cowIdentityQuery.create({ data: { requestedBy: req.user!.id, photoPath: photoFile } });

    let rank = 0;
    for (const { c, id } of others) {
      if (!existing.has(id)) continue;
      rank++;
      await prisma.cowIdentityCandidate.create({
        data: { queryId: query.id, animalId: id, rank, similarity: c.similarity, referenceIndex: c.referenceIndex ?? null },
      });
    }
    res.json({
      status: 'ok',
      queryId: query.id,
      threshold: data.threshold,
      sourceAnimalExcluded: true,
      note: SIMILARITY_NOTE,
      candidates: await shapeCandidates(query.id),
    });
  } catch (e) {
    fail(res, e);
  }
});

// Adds selected stored photos as reference views for ONE animal record. Never changes the animal.
const registerDbBody = z.object({
  animalId: z.coerce.number().int().positive(),
  photoIds: idList,
  confirmed: z.literal(true),
});

router.post('/register-from-db', async (req: Request, res: Response) => {
  const b = registerDbBody.safeParse(req.body);
  if (!b.success) {
    res.status(400).json({ error: 'Choose an animal, at least one stored photo, and confirm the photos show that animal.' });
    return;
  }
  try {
    const animal = await prisma.animal.findUnique({ where: { id: b.data.animalId }, select: ANIMAL_SELECT });
    if (!animal) { res.status(404).json({ error: 'Animal record not found.' }); return; }
    const loaded = await loadStoredPhotos(b.data.photoIds, animal.id);
    if ('error' in loaded) { res.status(400).json({ error: loaded.error }); return; }
    const form = new FormData();
    form.append('animalKey', animalKey(animal.id));
    for (const p of loaded.photos) form.append('photos', new Blob([p.buf], { type: p.mime }), p.name);
    const { status, data } = await callJson('POST', '/register', form);
    if (status !== 200) { res.status(502).json({ error: 'Re-ID service rejected the photos.' }); return; }
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'reid_register_stored_photos', entity: 'animals', entityId: animal.id },
    });
    res.json({ ...data, animal, photoIds: b.data.photoIds });
  } catch (e) {
    fail(res, e);
  }
});

// Proposes groups among stored photos. Read-only: nothing is saved. Groups spanning several records are flagged.
const groupDbBody = z.object({
  photoIds: idList,
  threshold: z.coerce.number().min(0.1).max(0.9).default(0.5),
});

router.post('/group-from-db', async (req: Request, res: Response) => {
  const b = groupDbBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Select 1 to 100 stored photos. Threshold must be 0.1 to 0.9.' }); return; }
  try {
    const loaded = await loadStoredPhotos(b.data.photoIds);
    if ('error' in loaded) { res.status(400).json({ error: loaded.error }); return; }
    const form = new FormData();
    form.append('threshold', String(b.data.threshold));
    for (const p of loaded.photos) form.append('photos', new Blob([p.buf], { type: p.mime }), p.name);
    const { status, data } = await callJson('POST', '/group', form);
    if (status !== 200) { res.status(502).json({ error: 'Re-ID service rejected the photos.' }); return; }

    const ownerIds = Array.from(new Set(loaded.photos.map(p => p.animalId)));
    const owners = await prisma.animal.findMany({ where: { id: { in: ownerIds } }, select: { id: true, name: true, tagNumber: true } });
    const om = new Map(owners.map(a => [a.id, a]));
    const groups = (data.groups as { group: number; photoIndexes: number[] }[]).map(g => {
      const photos = g.photoIndexes
        .map(i => loaded.photos[i])
        .filter((p): p is StoredPhoto => !!p)
        .map(p => {
          const a = om.get(p.animalId);
          return {
            photoId: p.id,
            animalId: p.animalId,
            animalName: a?.name ?? null,
            tagNumber: a?.tagNumber ?? null,
            fileUrl: `/api/admin/reid/animal-photos/${p.id}/file`,
          };
        });
      return { group: g.group, crossRecord: new Set(photos.map(p => p.animalId)).size > 1, photos };
    });
    res.json({ groups, rejected: data.rejected ?? [], errors: data.errors ?? [], note: SIMILARITY_NOTE });
  } catch (e) {
    fail(res, e);
  }
});

export default router;

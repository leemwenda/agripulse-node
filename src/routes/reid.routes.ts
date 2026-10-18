// SuperAdmin proxy to the internal cattle re-ID service. Mounted at /api/admin/reid.
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

const SVC = process.env.REID_SERVICE_URL || 'http://127.0.0.1:7861';
const TOKEN = process.env.REID_TOKEN || '';
const COW_ID = /^[A-Za-z0-9_-]{1,40}$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 100 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

function appendFile(form: FormData, field: string, file: any) {
  form.append(field, new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'photo.jpg');
}

async function forward(method: 'GET' | 'POST', path: string, res: Response, form?: FormData) {
  if (!TOKEN) { res.status(503).json({ error: 'Re-ID service is not configured.' }); return; }
  try {
    const r = await fetch(`${SVC}${path}`, {
      method,
      headers: { 'X-Service-Token': TOKEN },
      body: method === 'POST' ? form : undefined,
      signal: AbortSignal.timeout(120000),
    });
    const data = await r.json().catch(() => ({}));
    res.status(r.status).json(data);
  } catch {
    res.status(503).json({ error: 'Cow re-identification service is offline.' });
  }
}

router.get('/animals', async (_req: Request, res: Response) => {
  try {
    const animals = await prisma.animal.findMany({
      select: { id: true, name: true, tagNumber: true, agripulseId: true, status: true, farm: { select: { name: true } } },
      orderBy: { tagNumber: 'asc' },
      take: 2000,
    });
    res.json({ animals });
  } catch {
    res.status(500).json({ error: 'Could not load animal records.' });
  }
});
router.get('/health', (_req: Request, res: Response) => forward('GET', '/health', res));
router.get('/cows', (_req: Request, res: Response) => forward('GET', '/cows', res));

router.post('/identify', upload.single('photo'), (req: Request, res: Response) => {
  const file = (req as any).file;
  if (!file) { res.status(400).json({ error: 'Upload one photo.' }); return; }
  const form = new FormData();
  appendFile(form, 'photo', file);
  forward('POST', '/identify', res, form);
});

router.post('/register', upload.array('photos', 100), (req: Request, res: Response) => {
  const cowId = String(req.body?.cowId || '').trim();
  const files = ((req as any).files || []) as any[];
  if (!COW_ID.test(cowId)) { res.status(400).json({ error: 'Cow ID must be 1-40 letters, digits, dashes or underscores.' }); return; }
  if (!files.length) { res.status(400).json({ error: 'Upload at least one photo.' }); return; }
  const form = new FormData();
  form.append('cowId', cowId);
  files.forEach(f => appendFile(form, 'photos', f));
  forward('POST', '/register', res, form);
});

router.post('/confirm', upload.single('photo'), (req: Request, res: Response) => {
  const cowId = String(req.body?.cowId || '').trim();
  const file = (req as any).file;
  if (!COW_ID.test(cowId) || !file) { res.status(400).json({ error: 'Cow ID and one photo are required.' }); return; }
  const form = new FormData();
  form.append('cowId', cowId);
  appendFile(form, 'photo', file);
  forward('POST', '/confirm', res, form);
});

router.post('/group', upload.array('photos', 100), (req: Request, res: Response) => {
  const files = ((req as any).files || []) as any[];
  if (!files.length) { res.status(400).json({ error: 'Upload at least one photo.' }); return; }
  const form = new FormData();
  form.append('threshold', String(req.body?.threshold ?? '0.5'));
  files.forEach(f => appendFile(form, 'photos', f));
  forward('POST', '/group', res, form);
});

router.post('/group/save', (req: Request, res: Response) => {
  const form = new FormData();
  form.append('session', String(req.body?.session || ''));
  form.append('assignments', typeof req.body?.assignments === 'string' ? req.body.assignments : JSON.stringify(req.body?.assignments || {}));
  forward('POST', '/group/save', res, form);
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

export default router;

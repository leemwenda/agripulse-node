// Super Admin Image Intelligence API. Mounted at /api/admin/images. Every route requires superadmin.
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import { analyzeImage, backfillImages, resolveImagePath } from '../services/imageAnalysis.service';
import { decodeFlags, REVIEW_MAP } from '../services/imageAnalysis.logic';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

const NOTE = 'Automated estimate based on technical evidence. Not proof of fraud or of origin; human review required.';
const parseId = (v: unknown): number | null => { const n = parseInt(String(v), 10); return Number.isInteger(n) && n > 0 ? n : null; };
const fail = (res: Response, e: any) => { console.error('[ImageIntel]', e?.message); res.status(500).json({ error: 'Image intelligence request failed.' }); };

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  source: z.enum(['animal_photo', 'market_photo']).optional(),
  reviewStatus: z.enum(['pending', 'needs_review', 'reviewed', 'confirmed_issue', 'inconclusive']).optional(),
  flag: z.string().regex(/^[a-z_0-9]+$/).max(40).optional(),
  metadata: z.enum(['present', 'absent', 'invalid', 'inconsistent']).optional(),
  unresolved: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(100).optional(),
});

const view = (r: any) => ({ ...r, flags: decodeFlags(r.flags), fileUrl: `/api/admin/images/${r.id}/file` });

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [total, byReview, byAnalysis, exact, near, noMeta, c2pa, quality, ai, animalPhotos, marketPhotos] = await Promise.all([
      prisma.imageRecord.count(),
      prisma.imageRecord.groupBy({ by: ['reviewStatus'], _count: { _all: true } }),
      prisma.imageRecord.groupBy({ by: ['analysisStatus'], _count: { _all: true } }),
      prisma.imageRecord.count({ where: { flags: { contains: ',exact_duplicate,' } } }),
      prisma.imageRecord.count({ where: { flags: { contains: ',near_duplicate,' } } }),
      prisma.imageRecord.count({ where: { metadataStatus: 'absent' } }),
      prisma.imageRecord.count({ where: { c2paPresent: true } }),
      prisma.imageRecord.count({ where: { flags: { contains: ',quality_warning,' } } }),
      prisma.imageRecord.count({ where: { aiStatus: 'flagged' } }),
      prisma.animalPhoto.count(),
      prisma.marketPhoto.count(),
    ]);
    res.json({
      total, exactDuplicates: exact, nearDuplicates: near, missingMetadata: noMeta, c2pa, qualityWarnings: quality, aiFlagged: ai,
      aiDetectorActive: false, notAnalyzed: Math.max(0, animalPhotos + marketPhotos - total),
      byReview: Object.fromEntries(byReview.map((g: any) => [g.reviewStatus, g._count._all])),
      byAnalysis: Object.fromEntries(byAnalysis.map((g: any) => [g.analysisStatus, g._count._all])),
      note: NOTE,
    });
  } catch (e) { fail(res, e); }
});

router.get('/', async (req: Request, res: Response) => {
  const p = listQuery.safeParse(req.query);
  if (!p.success) { res.status(400).json({ error: 'Invalid filters', details: p.error.flatten().fieldErrors }); return; }
  const { page, limit, source, reviewStatus, flag, metadata, unresolved, q } = p.data;
  try {
    const where: any = {};
    if (source) where.source = source;
    if (reviewStatus) where.reviewStatus = reviewStatus;
    if (metadata) where.metadataStatus = metadata;
    if (flag) where.flags = { contains: `,${flag},` };
    if (unresolved === 'true') where.reviewStatus = { in: ['pending', 'needs_review'] };
    if (q) {
      const n = parseId(q);
      where.OR = n ? [{ sourceId: n }, { animalId: n }, { listingId: n }, { farmId: n }, { id: n }] : [{ url: { contains: q } }];
    }
    const [total, rows] = await Promise.all([
      prisma.imageRecord.count({ where }),
      prisma.imageRecord.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        select: { id: true, source: true, sourceId: true, animalId: true, listingId: true, farmId: true, width: true, height: true, metadataStatus: true, cameraMake: true, cameraModel: true, c2paPresent: true, aiStatus: true, flags: true, analysisStatus: true, analyzedAt: true, reviewStatus: true, createdAt: true, _count: { select: { matches: true, matchedBy: true } } },
      }),
    ]);
    const farmIds = Array.from(new Set(rows.map((r: any) => r.farmId).filter(Boolean))) as number[];
    const farms = farmIds.length ? await prisma.user.findMany({ where: { id: { in: farmIds } }, select: { id: true, name: true } }) : [];
    const fm = new Map(farms.map((f: any) => [f.id, f.name]));
    res.json({ items: rows.map((r: any) => ({ ...view(r), farmName: fm.get(r.farmId) ?? null })), page, limit, total, pages: Math.ceil(total / limit), note: NOTE });
  } catch (e) { fail(res, e); }
});

router.post('/backfill', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.body?.limit ?? '100'), 10) || 100, 1), 200);
    res.json(await backfillImages(limit));
  } catch (e) { fail(res, e); }
});

router.get('/:id/file', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    const r = await prisma.imageRecord.findUnique({ where: { id }, select: { url: true, mimeType: true } });
    const file = r ? resolveImagePath(r.url) : null;
    if (!r || !file) { res.status(404).json({ error: 'Image file not available' }); return; }
    const mt = r.mimeType && /^image\/(jpeg|png|webp|heif)$/.test(r.mimeType) ? r.mimeType : 'application/octet-stream';
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.type(mt);
    res.sendFile(file, { dotfiles: 'deny' });
  } catch (e) { fail(res, e); }
});

router.post('/:id/reanalyze', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    const r = await prisma.imageRecord.findUnique({ where: { id }, select: { source: true, sourceId: true } });
    if (!r) { res.status(404).json({ error: 'Not found' }); return; }
    const out = await analyzeImage(r.source as any, r.sourceId);
    res.json({ image: out ? view(out) : null });
  } catch (e) { fail(res, e); }
});

const reviewBody = z.object({
  decision: z.enum(['legitimate', 'suspicious', 'confirmed', 'inconclusive']),
  reason: z.string().trim().min(10, 'Please give a reason of at least 10 characters').max(1000),
});

router.post('/:id/review', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Invalid id' }); return; }
  const b = reviewBody.safeParse(req.body);
  if (!b.success) { res.status(400).json({ error: 'Invalid review', details: b.error.flatten().fieldErrors }); return; }
  try {
    const rec = await prisma.imageRecord.findUnique({ where: { id } });
    if (!rec) { res.status(404).json({ error: 'Not found' }); return; }
    const toStatus = REVIEW_MAP[b.data.decision];
    if (b.data.decision === 'confirmed' && decodeFlags(rec.flags).length === 0) {
      res.status(409).json({ error: 'Cannot confirm an issue when no evidence flags exist for this image.' }); return;
    }
    const [review] = await prisma.$transaction([
      prisma.imageReview.create({ data: { imageId: id, reviewerId: req.user!.id, decision: b.data.decision, fromStatus: rec.reviewStatus, toStatus, reason: b.data.reason } }),
      prisma.imageRecord.update({ where: { id }, data: { reviewStatus: toStatus } }),
      prisma.activityLog.create({ data: { userId: req.user!.id, action: `image_review_${b.data.decision}`, entity: 'image_records', entityId: id } }),
    ]);
    res.json({ review, reviewStatus: toStatus });
  } catch (e) { fail(res, e); }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    const rec = await prisma.imageRecord.findUnique({
      where: { id },
      include: {
        matches: { include: { matchedImage: { select: { id: true, source: true, sourceId: true, animalId: true, listingId: true, farmId: true, createdAt: true } } } },
        matchedBy: { include: { image: { select: { id: true, source: true, sourceId: true, animalId: true, listingId: true, farmId: true, createdAt: true } } } },
        reviews: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!rec) { res.status(404).json({ error: 'Not found' }); return; }
    const animal = rec.animalId ? await prisma.animal.findUnique({ where: { id: rec.animalId }, select: { id: true, name: true, tagNumber: true } }) : null;
    const ids = Array.from(new Set([rec.farmId, ...rec.reviews.map((r: any) => r.reviewerId)].filter(Boolean))) as number[];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    const um = new Map(users.map((u: any) => [u.id, u.name]));
    res.json({
      image: { ...view(rec), farmName: um.get(rec.farmId as number) ?? null, animal },
      matches: [
        ...rec.matches.map((m: any) => ({ id: m.id, direction: 'this_matches_earlier', type: m.matchType, method: m.method, score: m.score, evidence: m.evidence, other: { ...m.matchedImage, fileUrl: `/api/admin/images/${m.matchedImage.id}/file` } })),
        ...rec.matchedBy.map((m: any) => ({ id: m.id, direction: 'later_matches_this', type: m.matchType, method: m.method, score: m.score, evidence: m.evidence, other: { ...m.image, fileUrl: `/api/admin/images/${m.image.id}/file` } })),
      ],
      reviews: rec.reviews.map((r: any) => ({ ...r, reviewerName: um.get(r.reviewerId) ?? null })),
      limitations: [
        'Missing metadata does not prove an image was downloaded or generated.',
        'Perceptual similarity is a candidate match, not proof of reuse.',
        rec.aiStatus === 'not_run' ? 'AI-generation assessment: not run (no calibrated detector configured).' : 'AI detector output is uncalibrated unless validated on farm images.',
        'No reverse-image-search provider configured: origin unverified.',
      ],
      note: NOTE,
    });
  } catch (e) { fail(res, e); }
});

export default router;

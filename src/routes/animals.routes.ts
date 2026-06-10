import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, getFarmId } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

const animalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tagNumber: z.string().min(1, 'Tag number is required'),
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  color: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'sold', 'deceased']).optional().default('active'),
});

// GET /api/animals
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const { status, gender, search, page = '1', limit = '20' } = req.query;

  // Handle potential array values from query parameters
  const statusValue = Array.isArray(status) ? status[0] : status;
  const genderValue = Array.isArray(gender) ? gender[0] : gender;
  const searchValue = Array.isArray(search) ? search[0] : search;
  const pageValue = Array.isArray(page) ? page[0] : page;
  const limitValue = Array.isArray(limit) ? limit[0] : limit;

  const where: Record<string, unknown> = { farmId };
  if (statusValue) where.status = statusValue;
  if (genderValue) where.gender = genderValue;
  if (searchValue) {
    where.OR = [
      { name: { contains: searchValue as string } },
      { tagNumber: { contains: searchValue as string } },
      { breed: { contains: searchValue as string } },
    ];
  }

  const skip = (parseInt(pageValue as string) - 1) * parseInt(limitValue as string);
  const [total, rawAnimals] = await Promise.all([
    prisma.animal.count({ where }),
    prisma.animal.findMany({
      where, skip, take: parseInt(limitValue as string), orderBy: { createdAt: 'desc' },
      include: {
        breeding: { orderBy: { serviceDate: 'desc' }, take: 1 },
      },
    }),
  ]);

  const animals = rawAnimals.map(a => ({
    ...a,
    latestBreeding: a.breeding[0] || null,
    breeding: undefined,
  }));

  res.json({ animals, total, page: parseInt(pageValue as string), pages: Math.ceil(total / parseInt(limitValue as string)) });
});

// GET /api/animals/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const animal = await prisma.animal.findFirst({
    where: { id: parseInt(idParam), farmId },
    include: {
      milkProduction: { orderBy: { productionDate: 'desc' }, take: 10 },
      healthRecords: { orderBy: { recordDate: 'desc' }, take: 10 },
      breeding: { orderBy: { serviceDate: 'desc' }, take: 5 },
    },
  });

  if (!animal) { res.status(404).json({ error: 'Animal not found' }); return; }
  res.json({ animal });
});

// POST /api/animals
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = animalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const farmId = getFarmId(req.user!);
  try {
    const animal = await prisma.animal.create({
      data: { ...parsed.data, farmId, dateOfBirth: new Date(parsed.data.dateOfBirth) },
    });
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'create_animal', entity: 'animals', entityId: animal.id },
    });
    res.status(201).json({ animal });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      res.status(409).json({ error: `Tag number "${parsed.data.tagNumber}" is already in use.` });
    } else {
      throw err;
    }
  }
});

// PUT /api/animals/:id
router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const existing = await prisma.animal.findFirst({ where: { id: parseInt(idParam), farmId } });
  if (!existing) { res.status(404).json({ error: 'Animal not found' }); return; }

  const parsed = animalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  try {
    const animal = await prisma.animal.update({
      where: { id: existing.id },
      data: { ...parsed.data, dateOfBirth: new Date(parsed.data.dateOfBirth) },
    });
    res.json({ animal });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      res.status(409).json({ error: `Tag number "${parsed.data.tagNumber}" is already in use.` });
    } else {
      throw err;
    }
  }
});

// DELETE /api/animals/:id
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const existing = await prisma.animal.findFirst({ where: { id: parseInt(idParam), farmId } });
  if (!existing) { res.status(404).json({ error: 'Animal not found' }); return; }

  await prisma.animal.delete({ where: { id: existing.id } });
  await prisma.activityLog.create({
    data: { userId: req.user!.id, action: 'delete_animal', entity: 'animals', entityId: existing.id },
  });
  res.json({ message: 'Animal deleted.' });
});

export default router;

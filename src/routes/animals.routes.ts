import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { generateAgripulseId } from '../services/passport.service';
import { mailAnimalRegistered } from '../services/mail.service';
import { requireAuth, requireAdmin, requireFarmer, getFarmId } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireFarmer);

const animalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tagNumber: z.string().min(1, 'Tag number is required'),
  breed: z.string().min(1, 'Breed is required'),
  gender: z.enum(['male', 'female']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  color: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
        photos: { where: { isPrimary: true }, take: 1 },
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
      photos: { orderBy: { isPrimary: 'desc' } },
      weights: { orderBy: { recordedAt: 'desc' }, take: 10 },
      ownershipTransfers: { where: { status: 'completed' }, orderBy: { createdAt: 'asc' }, include: { fromUser: { select: { id: true, name: true } }, toUser: { select: { id: true, name: true } } } },
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
    const agripulseId = await generateAgripulseId();
    const animal = await prisma.animal.create({
      data: { ...parsed.data, farmId, agripulseId, dateOfBirth: new Date(parsed.data.dateOfBirth) },
    });
    await prisma.activityLog.create({
      data: { userId: req.user!.id, action: 'create_animal', entity: 'animals', entityId: animal.id },
    });
    mailAnimalRegistered(req.user!.email, req.user!.name, animal.name, animal.agripulseId || '', animal.tagNumber).catch(() => {});
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

// POST /api/animals/:id/photos — upload animal photo
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads/animals')),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/:id/photos', requireAdmin, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const animalId = parseInt(req.params.id as string);
  const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
  if (!animal) { res.status(404).json({ error: 'Animal not found' }); return; }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const isPrimary = req.body.isPrimary === 'true';
  if (isPrimary) {
    await prisma.animalPhoto.updateMany({ where: { animalId }, data: { isPrimary: false } });
  }

  const url = `/uploads/animals/${req.file.filename}`;
  const photo = await prisma.animalPhoto.create({
    data: { animalId, url, isPrimary },
  });
  res.status(201).json({ photo });
});

router.delete('/:id/photos/:photoId', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const animalId = parseInt(req.params.id as string);
  const photoId = parseInt(req.params.photoId as string);
  const animal = await prisma.animal.findFirst({ where: { id: animalId, farmId } });
  if (!animal) { res.status(404).json({ error: 'Animal not found' }); return; }
  const photo = await prisma.animalPhoto.findFirst({ where: { id: photoId, animalId } });
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return; }
  const filePath = path.join(__dirname, '../../uploads', photo.url.replace('/uploads/', ''));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.animalPhoto.delete({ where: { id: photoId } });
  res.json({ message: 'Photo deleted' });
});

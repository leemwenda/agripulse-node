import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// GET /api/vet/profile/me — own vet profile
router.get('/profile/me', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets have a vet profile.' }); return; }
    const profile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    res.json({ profile });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/vet/profile — create or update own profile
router.post('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can create a vet profile.' }); return; }
    const { licenseNumber, specialization, clinicName, bio, yearsExperience, consultationFee } = req.body;
    if (!licenseNumber) { res.status(400).json({ error: 'License number is required.' }); return; }

    const profile = await prisma.vetProfile.upsert({
      where: { userId: req.user!.id },
      update: { licenseNumber, specialization, clinicName, bio, yearsExperience, consultationFee },
      create: { userId: req.user!.id, licenseNumber, specialization, clinicName, bio, yearsExperience, consultationFee },
    });
    res.json({ profile });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet/search?county=&specialization= — farmer-facing vet directory
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { county, specialization } = req.query as Record<string, string>;
    const where: any = {};
    if (specialization) where.specialization = { contains: specialization };
    if (county) where.user = { county: { contains: county } };

    const vets = await prisma.vetProfile.findMany({
      where,
      include: { user: { select: { id: true, name: true, county: true, phone: true } } },
      orderBy: [{ verificationStatus: 'desc' }, { rating: 'desc' }],
    });
    res.json({ vets });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet/:id — public vet profile view
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const profile = await prisma.vetProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, county: true, phone: true } } },
    });
    if (!profile) { res.status(404).json({ error: 'Vet not found.' }); return; }
    res.json({ profile });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

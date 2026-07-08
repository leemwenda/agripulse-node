import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// POST /api/vet-treatments — vet logs a treatment for an animal
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can log treatments.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(400).json({ error: 'Create your vet profile first.' }); return; }

    const { animalId, farmerId, appointmentId, diagnosis, treatmentGiven, medication, followUpDate, notes } = req.body;
    if (!animalId || !farmerId || !diagnosis || !treatmentGiven) {
      res.status(400).json({ error: 'animalId, farmerId, diagnosis and treatmentGiven are required.' }); return;
    }

    const treatment = await prisma.treatment.create({
      data: {
        animalId: parseInt(animalId), vetId: vetProfile.id, farmerId: parseInt(farmerId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        diagnosis, treatmentGiven, medication: medication || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null, notes: notes || null,
      },
    });
    res.status(201).json({ treatment });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet-treatments/mine — vet sees own logged treatments; farmer sees treatments on their animals
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ treatments: [] }); return; }
      const treatments = await prisma.treatment.findMany({
        where: { vetId: vetProfile.id },
        include: { animal: { select: { id: true, name: true, tagNumber: true } }, farmer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ treatments });
      return;
    }
    const treatments = await prisma.treatment.findMany({
      where: { farmerId: req.user!.id },
      include: { animal: { select: { id: true, name: true, tagNumber: true } }, vet: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ treatments });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet-treatments/animal/:animalId — full treatment history for an animal
router.get('/animal/:animalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const animalId = parseInt(String(req.params.animalId));
    const treatments = await prisma.treatment.findMany({
      where: { animalId },
      include: { vet: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ treatments });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

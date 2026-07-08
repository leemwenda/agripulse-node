import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can issue prescriptions.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(400).json({ error: 'Create your vet profile first.' }); return; }

    const { animalId, farmerId, appointmentId, medicationName, dosage, frequency, durationDays, instructions, issuedDate } = req.body;
    if (!animalId || !farmerId || !medicationName || !dosage || !frequency) {
      res.status(400).json({ error: 'animalId, farmerId, medicationName, dosage and frequency are required.' }); return;
    }

    const prescription = await prisma.prescription.create({
      data: {
        animalId: parseInt(animalId), vetId: vetProfile.id, farmerId: parseInt(farmerId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        medicationName, dosage, frequency,
        durationDays: durationDays ? parseInt(durationDays) : null,
        instructions: instructions || null,
        issuedDate: issuedDate ? new Date(issuedDate) : new Date(),
      },
    });
    res.status(201).json({ prescription });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ prescriptions: [] }); return; }
      const prescriptions = await prisma.prescription.findMany({
        where: { vetId: vetProfile.id },
        include: { animal: { select: { id: true, name: true, tagNumber: true } }, farmer: { select: { id: true, name: true } } },
        orderBy: { issuedDate: 'desc' },
      });
      res.json({ prescriptions });
      return;
    }
    const prescriptions = await prisma.prescription.findMany({
      where: { farmerId: req.user!.id },
      include: { animal: { select: { id: true, name: true, tagNumber: true } }, vet: { include: { user: { select: { name: true } } } } },
      orderBy: { issuedDate: 'desc' },
    });
    res.json({ prescriptions });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/animal/:animalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const animalId = parseInt(String(req.params.animalId));
    const prescriptions = await prisma.prescription.findMany({
      where: { animalId },
      include: { vet: { include: { user: { select: { name: true } } } } },
      orderBy: { issuedDate: 'desc' },
    });
    res.json({ prescriptions });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

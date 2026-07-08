import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can log vaccinations.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(400).json({ error: 'Create your vet profile first.' }); return; }

    const { animalId, farmerId, appointmentId, vaccineName, doseNumber, dateAdministered, nextDueDate, batchNumber, notes } = req.body;
    if (!animalId || !farmerId || !vaccineName || !dateAdministered) {
      res.status(400).json({ error: 'animalId, farmerId, vaccineName and dateAdministered are required.' }); return;
    }

    const vaccination = await prisma.vaccination.create({
      data: {
        animalId: parseInt(animalId), vetId: vetProfile.id, farmerId: parseInt(farmerId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        vaccineName, doseNumber: doseNumber ? parseInt(doseNumber) : null,
        dateAdministered: new Date(dateAdministered),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        batchNumber: batchNumber || null, notes: notes || null,
      },
    });
    res.status(201).json({ vaccination });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ vaccinations: [] }); return; }
      const vaccinations = await prisma.vaccination.findMany({
        where: { vetId: vetProfile.id },
        include: { animal: { select: { id: true, name: true, tagNumber: true } }, farmer: { select: { id: true, name: true } } },
        orderBy: { dateAdministered: 'desc' },
      });
      res.json({ vaccinations });
      return;
    }
    const vaccinations = await prisma.vaccination.findMany({
      where: { farmerId: req.user!.id },
      include: { animal: { select: { id: true, name: true, tagNumber: true } }, vet: { include: { user: { select: { name: true } } } } },
      orderBy: { dateAdministered: 'desc' },
    });
    res.json({ vaccinations });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/animal/:animalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const animalId = parseInt(String(req.params.animalId));
    const vaccinations = await prisma.vaccination.findMany({
      where: { animalId },
      include: { vet: { include: { user: { select: { name: true } } } } },
      orderBy: { dateAdministered: 'desc' },
    });
    res.json({ vaccinations });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

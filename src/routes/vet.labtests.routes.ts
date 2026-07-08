import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can log lab tests.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(400).json({ error: 'Create your vet profile first.' }); return; }

    const { animalId, farmerId, appointmentId, testType, sampleDate, resultDate, results, attachmentUrl } = req.body;
    if (!animalId || !farmerId || !testType || !sampleDate) {
      res.status(400).json({ error: 'animalId, farmerId, testType and sampleDate are required.' }); return;
    }

    const labTest = await prisma.labTest.create({
      data: {
        animalId: parseInt(animalId), vetId: vetProfile.id, farmerId: parseInt(farmerId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        testType, sampleDate: new Date(sampleDate),
        resultDate: resultDate ? new Date(resultDate) : null,
        results: results || null, attachmentUrl: attachmentUrl || null,
      },
    });
    res.status(201).json({ labTest });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/vet-labtests/:id/results — vet adds results once back from the lab
router.patch('/:id/results', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can update lab test results.' }); return; }
    const id = parseInt(String(req.params.id));
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    const existing = await prisma.labTest.findFirst({ where: { id, vetId: vetProfile?.id } });
    if (!existing) { res.status(404).json({ error: 'Lab test not found.' }); return; }

    const { results, resultDate, attachmentUrl } = req.body;
    const updated = await prisma.labTest.update({
      where: { id },
      data: {
        results: results ?? existing.results,
        resultDate: resultDate ? new Date(resultDate) : existing.resultDate,
        attachmentUrl: attachmentUrl ?? existing.attachmentUrl,
      },
    });
    res.json({ labTest: updated });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ labTests: [] }); return; }
      const labTests = await prisma.labTest.findMany({
        where: { vetId: vetProfile.id },
        include: { animal: { select: { id: true, name: true, tagNumber: true } }, farmer: { select: { id: true, name: true } } },
        orderBy: { sampleDate: 'desc' },
      });
      res.json({ labTests });
      return;
    }
    const labTests = await prisma.labTest.findMany({
      where: { farmerId: req.user!.id },
      include: { animal: { select: { id: true, name: true, tagNumber: true } }, vet: { include: { user: { select: { name: true } } } } },
      orderBy: { sampleDate: 'desc' },
    });
    res.json({ labTests });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/animal/:animalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const animalId = parseInt(String(req.params.animalId));
    const labTests = await prisma.labTest.findMany({
      where: { animalId },
      include: { vet: { include: { user: { select: { name: true } } } } },
      orderBy: { sampleDate: 'desc' },
    });
    res.json({ labTests });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

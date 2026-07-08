import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

function generateCertNumber(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AGP-CERT-${Date.now().toString().slice(-6)}-${rand}`;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can issue certificates.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(400).json({ error: 'Create your vet profile first.' }); return; }

    const { animalId, farmerId, appointmentId, certificateType, issueDate, expiryDate } = req.body;
    if (!animalId || !farmerId || !certificateType) {
      res.status(400).json({ error: 'animalId, farmerId and certificateType are required.' }); return;
    }
    if (!['health', 'movement', 'export', 'vaccination'].includes(certificateType)) {
      res.status(400).json({ error: 'Invalid certificateType.' }); return;
    }

    const certificate = await prisma.certificate.create({
      data: {
        animalId: parseInt(animalId), vetId: vetProfile.id, farmerId: parseInt(farmerId),
        appointmentId: appointmentId ? parseInt(appointmentId) : null,
        certificateType, issueDate: issueDate ? new Date(issueDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        certificateNumber: generateCertNumber(),
      },
    });
    res.status(201).json({ certificate });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ certificates: [] }); return; }
      const certificates = await prisma.certificate.findMany({
        where: { vetId: vetProfile.id },
        include: { animal: { select: { id: true, name: true, tagNumber: true } }, farmer: { select: { id: true, name: true } } },
        orderBy: { issueDate: 'desc' },
      });
      res.json({ certificates });
      return;
    }
    const certificates = await prisma.certificate.findMany({
      where: { farmerId: req.user!.id },
      include: { animal: { select: { id: true, name: true, tagNumber: true } }, vet: { include: { user: { select: { name: true } } } } },
      orderBy: { issueDate: 'desc' },
    });
    res.json({ certificates });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/animal/:animalId', async (req: Request, res: Response): Promise<void> => {
  try {
    const animalId = parseInt(String(req.params.animalId));
    const certificates = await prisma.certificate.findMany({
      where: { animalId },
      include: { vet: { include: { user: { select: { name: true } } } } },
      orderBy: { issueDate: 'desc' },
    });
    res.json({ certificates });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

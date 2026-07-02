import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// POST /api/vet/emergency — farmer sends an urgent alert; returns vet's phone for direct contact
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!['admin', 'worker'].includes(req.user!.role)) { res.status(403).json({ error: 'Only farm accounts can send emergency alerts.' }); return; }
    const { vetId, animalId, message } = req.body;
    if (!vetId || !message) { res.status(400).json({ error: 'vetId and message are required.' }); return; }

    const vetProfile = await prisma.vetProfile.findUnique({
      where: { id: parseInt(vetId) },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (!vetProfile) { res.status(404).json({ error: 'Vet not found.' }); return; }

    const alert = await prisma.vetEmergencyAlert.create({
      data: { vetId: vetProfile.id, farmerId: req.user!.id, animalId: animalId ? parseInt(animalId) : null, message },
    });
    res.status(201).json({ alert, vetContact: { name: vetProfile.user.name, phone: vetProfile.user.phone } });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet/emergency/mine — role-aware: vet sees incoming alerts, farmer sees sent alerts
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ alerts: [] }); return; }
      const alerts = await prisma.vetEmergencyAlert.findMany({
        where: { vetId: vetProfile.id },
        include: { farmer: { select: { id: true, name: true, phone: true, county: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ alerts });
      return;
    }

    const alerts = await prisma.vetEmergencyAlert.findMany({
      where: { farmerId: req.user!.id },
      include: { vet: { include: { user: { select: { id: true, name: true, phone: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ alerts });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/vet/emergency/:id/resolve — vet marks alert resolved
router.patch('/:id/resolve', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only the vet can resolve an alert.' }); return; }
    const id = parseInt(String(req.params.id));
    const alert = await prisma.vetEmergencyAlert.findUnique({ where: { id }, include: { vet: true } });
    if (!alert || alert.vet.userId !== req.user!.id) { res.status(404).json({ error: 'Alert not found.' }); return; }

    const updated = await prisma.vetEmergencyAlert.update({ where: { id }, data: { status: 'resolved' } });
    res.json({ alert: updated });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

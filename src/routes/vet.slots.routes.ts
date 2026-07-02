import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// POST /api/vet/slots — create one or more availability slots (vet only)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can create availability slots.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(400).json({ error: 'Create your vet profile first.' }); return; }

    const { date, startTime, endTime } = req.body;
    if (!date || !startTime || !endTime) { res.status(400).json({ error: 'date, startTime and endTime are required.' }); return; }

    const slot = await prisma.vetAvailabilitySlot.create({
      data: { vetId: vetProfile.id, date: new Date(date), startTime, endTime },
    });
    res.status(201).json({ slot });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet/slots/mine — vet's own slots
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets have availability slots.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.json({ slots: [] }); return; }

    const slots = await prisma.vetAvailabilitySlot.findMany({
      where: { vetId: vetProfile.id },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ slots });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet/slots/available/:vetId — farmer-facing open slots for a vet
router.get('/available/:vetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const vetId = parseInt(String(req.params.vetId));
    const slots = await prisma.vetAvailabilitySlot.findMany({
      where: { vetId, isBooked: false, date: { gte: new Date(new Date().toDateString()) } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ slots });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/vet/slots/:id — vet removes own unbooked slot
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only vets can remove slots.' }); return; }
    const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
    if (!vetProfile) { res.status(404).json({ error: 'Vet profile not found.' }); return; }

    const id = parseInt(String(req.params.id));
    const slot = await prisma.vetAvailabilitySlot.findFirst({ where: { id, vetId: vetProfile.id } });
    if (!slot) { res.status(404).json({ error: 'Slot not found.' }); return; }
    if (slot.isBooked) { res.status(400).json({ error: 'Cannot remove a booked slot. Cancel the appointment first.' }); return; }

    await prisma.vetAvailabilitySlot.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { mailVetAppointmentConfirmation } from '../services/mail.service';

const router = Router();
router.use(requireAuth);

// POST /api/vet/appointments — farmer books an open slot
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!['admin', 'worker'].includes(req.user!.role)) { res.status(403).json({ error: 'Only farm accounts can book appointments.' }); return; }
    const { slotId, animalId, serviceType, notes } = req.body;
    if (!slotId || !serviceType) { res.status(400).json({ error: 'slotId and serviceType are required.' }); return; }

    const slot = await prisma.vetAvailabilitySlot.findUnique({ where: { id: parseInt(slotId) } });
    if (!slot) { res.status(404).json({ error: 'Slot not found.' }); return; }
    if (slot.isBooked) { res.status(400).json({ error: 'This slot has already been booked.' }); return; }

    const [appointment] = await prisma.$transaction([
      prisma.vetAppointment.create({
        data: {
          vetId: slot.vetId,
          farmerId: req.user!.id,
          slotId: slot.id,
          animalId: animalId ? parseInt(animalId) : null,
          serviceType,
          notes: notes || null,
        },
      }),
      prisma.vetAvailabilitySlot.update({ where: { id: slot.id }, data: { isBooked: true } }),
    ]);
    const vetWithUser = await prisma.vetProfile.findUnique({ where: { id: slot.vetId }, include: { user: { select: { name: true } } } });
    mailVetAppointmentConfirmation(
      req.user!.email, req.user!.name, vetWithUser?.user?.name || 'your vet',
      serviceType, slot.date.toISOString().slice(0, 10), `${slot.startTime}-${slot.endTime}`
    ).catch(() => {});
    res.status(201).json({ appointment });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet/appointments/mine — role-aware: vet sees incoming, farmer sees own bookings
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role === 'vet') {
      const vetProfile = await prisma.vetProfile.findUnique({ where: { userId: req.user!.id } });
      if (!vetProfile) { res.json({ appointments: [] }); return; }
      const appointments = await prisma.vetAppointment.findMany({
        where: { vetId: vetProfile.id },
        include: { slot: true, farmer: { select: { id: true, name: true, phone: true, county: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ appointments });
      return;
    }

    const appointments = await prisma.vetAppointment.findMany({
      where: { farmerId: req.user!.id },
      include: { slot: true, vet: { include: { user: { select: { id: true, name: true, phone: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ appointments });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/vet/appointments/:id/cancel — either party cancels, slot re-opens
router.patch('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const appointment = await prisma.vetAppointment.findUnique({ where: { id }, include: { vet: true } });
    if (!appointment) { res.status(404).json({ error: 'Appointment not found.' }); return; }

    const isFarmer = appointment.farmerId === req.user!.id;
    const isVet = appointment.vet.userId === req.user!.id;
    if (!isFarmer && !isVet) { res.status(403).json({ error: 'Not your appointment.' }); return; }

    await prisma.$transaction([
      prisma.vetAppointment.update({ where: { id }, data: { status: 'cancelled' } }),
      prisma.vetAvailabilitySlot.update({ where: { id: appointment.slotId }, data: { isBooked: false } }),
    ]);
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/vet/appointments/:id/complete — vet marks visit done
router.patch('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== 'vet') { res.status(403).json({ error: 'Only the vet can mark an appointment complete.' }); return; }
    const id = parseInt(String(req.params.id));
    const appointment = await prisma.vetAppointment.findUnique({ where: { id }, include: { vet: true } });
    if (!appointment || appointment.vet.userId !== req.user!.id) { res.status(404).json({ error: 'Appointment not found.' }); return; }

    const updated = await prisma.vetAppointment.update({ where: { id }, data: { status: 'completed' } });
    res.json({ appointment: updated });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

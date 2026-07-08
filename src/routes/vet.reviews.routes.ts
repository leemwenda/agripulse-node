import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// POST /api/vet-reviews — farmer leaves a review for a completed appointment
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const farmerId = req.user!.id;
    const { appointmentId, rating, comment } = req.body;
    if (!appointmentId || !rating) { res.status(400).json({ error: 'appointmentId and rating are required.' }); return; }
    const numRating = parseInt(rating);
    if (numRating < 1 || numRating > 5) { res.status(400).json({ error: 'Rating must be between 1 and 5.' }); return; }

    const appointment = await prisma.vetAppointment.findUnique({
      where: { id: parseInt(appointmentId) },
      include: { review: true },
    });
    if (!appointment || appointment.farmerId !== farmerId) { res.status(404).json({ error: 'Appointment not found.' }); return; }
    if (appointment.status !== 'completed') { res.status(400).json({ error: 'You can only review completed appointments.' }); return; }
    if (appointment.review) { res.status(400).json({ error: 'You already reviewed this appointment.' }); return; }

    const review = await prisma.vetReview.create({
      data: { appointmentId: appointment.id, vetId: appointment.vetId, farmerId, rating: numRating, comment: comment || null },
    });

    // Recompute the vet's aggregate rating
    const agg = await prisma.vetReview.aggregate({
      where: { vetId: appointment.vetId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.vetProfile.update({
      where: { id: appointment.vetId },
      data: { rating: agg._avg.rating || 0, totalReviews: agg._count.rating },
    });

    res.status(201).json({ review });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet-reviews/vet/:vetId — public list of reviews for a vet (vetId = VetProfile.id)
router.get('/vet/:vetId', async (req: Request, res: Response): Promise<void> => {
  try {
    const vetId = parseInt(String(req.params.vetId));
    const reviews = await prisma.vetReview.findMany({
      where: { vetId },
      include: { farmer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reviews });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet-reviews/reviewable — farmer's completed appointments that don't have a review yet
router.get('/reviewable', async (req: Request, res: Response): Promise<void> => {
  try {
    const farmerId = req.user!.id;
    const appointments = await prisma.vetAppointment.findMany({
      where: { farmerId, status: 'completed', review: null },
      include: { vet: { include: { user: { select: { id: true, name: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ appointments });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

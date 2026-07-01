import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
const router = Router();
router.use(requireAuth);

// GET reviews for a specific user (as reviewee)
router.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const revieweeId = parseInt(req.params.userId as string);
    const reviews = await prisma.marketReview.findMany({
      where: { revieweeId },
      include: { reviewer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    res.json({ reviews, averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST create a review
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const reviewerId = req.user!.id;
    const { revieweeId, listingId, rating, comment } = req.body;
    if (!revieweeId || !listingId || !rating) {
      res.status(400).json({ error: 'revieweeId, listingId and rating are required' }); return;
    }
    if (rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating must be 1-5' }); return; }
    if (parseInt(revieweeId) === reviewerId) { res.status(400).json({ error: 'Cannot review yourself' }); return; }
    const existing = await prisma.marketReview.findFirst({
      where: { reviewerId, revieweeId: parseInt(revieweeId), listingId: parseInt(listingId) },
    });
    if (existing) { res.status(400).json({ error: 'You have already reviewed this transaction' }); return; }
    const review = await prisma.marketReview.create({
      data: {
        reviewerId,
        revieweeId: parseInt(revieweeId),
        listingId: parseInt(listingId),
        rating: parseInt(rating),
        comment: comment || undefined,
      },
      include: { reviewer: { select: { id: true, name: true } } },
    });
    res.status(201).json({ review });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

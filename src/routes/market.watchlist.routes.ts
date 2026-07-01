import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const items = await prisma.marketWatchlist.findMany({
      where: { userId },
      include: { listing: { include: { animal: { include: { photos: { where: { isPrimary: true }, take: 1 } } }, seller: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { listingId, alertOnPriceChange } = req.body;
    const item = await prisma.marketWatchlist.upsert({
      where: { userId_listingId: { userId, listingId: parseInt(listingId) } },
      create: { userId, listingId: parseInt(listingId)},
      update: {},
    });
    res.status(201).json({ item });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete('/:listingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.marketWatchlist.deleteMany({ where: { userId, listingId: parseInt(req.params.listingId as string) } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

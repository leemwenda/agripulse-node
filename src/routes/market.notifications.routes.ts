import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.marketNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.marketNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.marketNotification.updateMany({
      where: { id: parseInt(req.params.id as string), userId },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const count = await prisma.marketNotification.count({ where: { userId, read: false } });
    res.json({ count });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, getFarmId } from '../middleware/auth.middleware';
import { generateAllNotifications } from '../services/notificationCron.service';

const router = Router();
router.use(requireAuth);

// GET /api/notifications
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const farmId = getFarmId(req.user!);

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, OR: [{ farmId }, { farmId: null }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.notification.count({
      where: { userId, isRead: false, OR: [{ farmId }, { farmId: null }] },
    }),
  ]);

  res.json({
    notifications: notifications.map((n) => ({
      id: String(n.id),
      type: n.type,
      category: n.category,
      title: n.title,
      message: n.message,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  });
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const farmId = getFarmId(req.user!);
  const unread = await prisma.notification.count({
    where: { userId, isRead: false, OR: [{ farmId }, { farmId: null }] },
  });
  res.json({ unread });
});

// POST /api/notifications/generate  (admin only — triggers generation manually)
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  try {
    await generateAllNotifications();
    res.json({ ok: true });
  } catch (err) {
    console.error('[Notifications] generate failed:', err);
    res.status(500).json({ error: 'Could not generate notifications.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const farmId = getFarmId(req.user!);
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false, OR: [{ farmId }, { farmId: null }] },
    data: { isRead: true },
  });
  res.json({ ok: true, updated: result.count });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  await prisma.notification.deleteMany({ where: { id, userId } });
  res.json({ ok: true });
});

// DELETE /api/notifications  (delete all)
router.delete('/', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const farmId = getFarmId(req.user!);
  const result = await prisma.notification.deleteMany({
    where: { userId, OR: [{ farmId }, { farmId: null }] },
  });
  res.json({ ok: true, deleted: result.count });
});

export default router;

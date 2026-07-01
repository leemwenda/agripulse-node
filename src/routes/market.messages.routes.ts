import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threads = await prisma.marketThread.findMany({
      where: { OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
      include: {
        listing: { include: { animal: { select: { name: true, breed: true } }, seller: { select: { id: true, name: true } } } },
        buyer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ threads });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threadId = parseInt(req.params.threadId as string);
    const thread = await prisma.marketThread.findFirst({
      where: { id: threadId, OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
    });
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }
    const messages = await prisma.marketMessage.findMany({
      where: { threadId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const { listingId, message, threadId } = req.body;
    let tid: number | null = threadId ? parseInt(threadId as string) : null;
    if (!tid && listingId) {
      const t = await prisma.marketThread.upsert({
        where: { listingId_buyerId: { listingId: parseInt(listingId as string), buyerId: senderId } },
        create: { listingId: parseInt(listingId as string), buyerId: senderId },
        update: {},
      });
      tid = t.id;
    }
    if (!tid) { res.status(400).json({ error: 'threadId or listingId required' }); return; }
    if (!message) { res.status(400).json({ error: 'message required' }); return; }
    const msg = await prisma.marketMessage.create({
      data: { threadId: tid, senderId, body: String(message), type: 'text' },
      include: { sender: { select: { id: true, name: true } } },
    });
    res.status(201).json({ message: msg });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const threadId = parseInt(req.params.threadId as string);
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'message required' }); return; }
    const msg = await prisma.marketMessage.create({
      data: { threadId, senderId, body: String(message), type: 'text' },
      include: { sender: { select: { id: true, name: true } } },
    });
    res.status(201).json({ message: msg });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

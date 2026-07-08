import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

function computeUnread(thread: any, userId: number) {
  const isSeller = thread.listing.sellerId === userId;
  const lastReadAt = isSeller ? thread.sellerLastReadAt : thread.buyerLastReadAt;
  const lastMsg = thread.messages?.[0];
  return !!lastMsg && lastMsg.senderId !== userId && (!lastReadAt || lastMsg.createdAt > lastReadAt);
}

// GET /api/market-messages/unread/count — total unread thread count (for navbar badge)
// Registered BEFORE /:threadId so 'unread' is never swallowed as a threadId param.
router.get('/unread/count', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threads = await prisma.marketThread.findMany({
      where: { OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
      include: {
        listing: { select: { sellerId: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const count = threads.filter(t => computeUnread(t, userId)).length;
    res.json({ count });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/market-messages — list threads with unread flag + last message
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
    const withUnread = threads.map(t => ({ ...t, unread: computeUnread(t, userId) }));
    res.json({ threads: withUnread });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/market-messages/:threadId — fetch messages, mark thread as read for this user
router.get('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threadId = parseInt(req.params.threadId as string);
    const thread = await prisma.marketThread.findFirst({
      where: { id: threadId, OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
      include: { listing: { select: { sellerId: true } } },
    });
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }

    const isSeller = thread.listing.sellerId === userId;
    await prisma.marketThread.update({
      where: { id: threadId },
      data: isSeller ? { sellerLastReadAt: new Date() } : { buyerLastReadAt: new Date() },
    });

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
    await prisma.marketThread.update({ where: { id: tid }, data: { updatedAt: new Date() } });
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
    await prisma.marketThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    res.status(201).json({ message: msg });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

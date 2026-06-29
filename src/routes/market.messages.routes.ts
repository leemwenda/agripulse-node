import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// GET /api/market-messages — all threads for current user
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threads = await prisma.marketThread.findMany({
      where: { OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
      include: {
        listing: { include: { animal: { select: { name: true } }, photos: { where: { isPrimary: true }, take: 1 } } },
        buyer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ threads });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/market-messages/:threadId — messages in thread
router.get('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const threadId = parseInt(req.params.threadId as string);
    const thread = await prisma.marketThread.findFirst({
      where: { id: threadId, OR: [{ buyerId: userId }, { listing: { sellerId: userId } }] },
      include: {
        listing: { include: { animal: { select: { name: true, breed: true, agripulseId: true } }, seller: { select: { id: true, name: true } }, photos: { where: { isPrimary: true }, take: 1 } } },
        buyer: { select: { id: true, name: true } },
        messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }
    res.json({ thread });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/market-messages — start or send to thread
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const { listingId, body } = req.body;
    if (!listingId || !body?.trim()) { res.status(400).json({ error: 'listingId and body required' }); return; }

    const listing = await prisma.marketListing.findUnique({ where: { id: parseInt(listingId) } });
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (listing.sellerId === senderId) { res.status(400).json({ error: 'Cannot message your own listing' }); return; }

    // Upsert thread (buyer is always the non-seller)
    const buyerId = senderId;
    const thread = await prisma.marketThread.upsert({
      where: { listingId_buyerId: { listingId: parseInt(listingId), buyerId } },
      create: { listingId: parseInt(listingId), buyerId },
      update: { updatedAt: new Date() },
    });

    const message = await prisma.marketMessage.create({
      data: { threadId: thread.id, senderId, body: body.trim() },
      include: { sender: { select: { id: true, name: true } } },
    });

    await prisma.marketThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

    res.status(201).json({ message, threadId: thread.id });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/market-messages/:threadId — reply to existing thread
router.post('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const threadId = parseInt(req.params.threadId as string);
    const { body } = req.body;
    if (!body?.trim()) { res.status(400).json({ error: 'body required' }); return; }

    const thread = await prisma.marketThread.findFirst({
      where: { id: threadId, OR: [{ buyerId: senderId }, { listing: { sellerId: senderId } }] },
    });
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }

    const message = await prisma.marketMessage.create({
      data: { threadId, senderId, body: body.trim() },
      include: { sender: { select: { id: true, name: true } } },
    });
    await prisma.marketThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    res.status(201).json({ message });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

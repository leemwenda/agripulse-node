import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

function computeUnread(thread: any, userId: number, isVet: boolean) {
  const lastReadAt = isVet ? thread.vetLastReadAt : thread.farmerLastReadAt;
  const lastMsg = thread.messages?.[0];
  return !!lastMsg && lastMsg.senderId !== userId && (!lastReadAt || lastMsg.createdAt > lastReadAt);
}

// GET /api/vet-messages/unread/count
router.get('/unread/count', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isVet = req.user!.role === 'vet';
    let vetProfileId: number | null = null;
    if (isVet) {
      const vp = await prisma.vetProfile.findUnique({ where: { userId } });
      vetProfileId = vp?.id ?? null;
    }
    const threads = await prisma.vetThread.findMany({
      where: isVet ? { vetId: vetProfileId ?? -1 } : { farmerId: userId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const count = threads.filter(t => computeUnread(t, userId, isVet)).length;
    res.json({ count });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet-messages — list threads for current user (vet or farmer)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isVet = req.user!.role === 'vet';
    let vetProfileId: number | null = null;
    if (isVet) {
      const vp = await prisma.vetProfile.findUnique({ where: { userId } });
      vetProfileId = vp?.id ?? null;
      if (!vetProfileId) { res.json({ threads: [] }); return; }
    }

    const threads = await prisma.vetThread.findMany({
      where: isVet ? { vetId: vetProfileId! } : { farmerId: userId },
      include: {
        vet: { include: { user: { select: { id: true, name: true } } } },
        farmer: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const withUnread = threads.map(t => ({ ...t, unread: computeUnread(t, userId, isVet) }));
    res.json({ threads: withUnread });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/vet-messages/start — farmer starts (or reopens) a thread with a vet
router.post('/start', async (req: Request, res: Response): Promise<void> => {
  try {
    const farmerId = req.user!.id;
    const { vetId } = req.body;
    if (!vetId) { res.status(400).json({ error: 'vetId is required.' }); return; }

    const thread = await prisma.vetThread.upsert({
      where: { vetId_farmerId: { vetId: parseInt(vetId), farmerId } },
      create: { vetId: parseInt(vetId), farmerId },
      update: {},
    });
    res.json({ thread });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/vet-messages/:threadId — fetch messages, mark read
router.get('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const isVet = req.user!.role === 'vet';
    const threadId = parseInt(req.params.threadId as string);

    const thread = await prisma.vetThread.findUnique({ where: { id: threadId }, include: { vet: true } });
    if (!thread) { res.status(404).json({ error: 'Thread not found' }); return; }

    const authorized = isVet ? thread.vet.userId === userId : thread.farmerId === userId;
    if (!authorized) { res.status(403).json({ error: 'Not your conversation.' }); return; }

    await prisma.vetThread.update({
      where: { id: threadId },
      data: isVet ? { vetLastReadAt: new Date() } : { farmerLastReadAt: new Date() },
    });

    const messages = await prisma.vetMessage.findMany({
      where: { threadId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages, thread });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/vet-messages/:threadId — send a message
router.post('/:threadId', async (req: Request, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const threadId = parseInt(req.params.threadId as string);
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'message required' }); return; }

    const msg = await prisma.vetMessage.create({
      data: { threadId, senderId, body: String(message) },
      include: { sender: { select: { id: true, name: true } } },
    });
    await prisma.vetThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    res.status(201).json({ message: msg });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

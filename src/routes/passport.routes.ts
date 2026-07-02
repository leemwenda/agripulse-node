import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';


const router = Router();

// GET /api/passport/:animalId — get animal passport data
router.get('/:agripulseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agripulseId = req.params.agripulseId as string;

    const animal = await prisma.animal.findFirst({
      where: { agripulseId },
      include: {
        photos: { orderBy: { isPrimary: 'desc' } },
        healthRecords: { orderBy: { recordDate: 'desc' } },
        milkProduction: { orderBy: { productionDate: 'desc' }, take: 30 },
        breeding: { orderBy: { serviceDate: 'desc' } },
        weights: { orderBy: { recordedAt: 'desc' } },
        ownershipTransfers: {
          where: { status: 'completed' },
          orderBy: { createdAt: 'asc' },
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!animal) {
      res.status(404).json({ error: 'Animal not found' });
      return;
    }

    const farm = await prisma.user.findUnique({
      where: { id: animal.farmId },
      select: { id: true, name: true, email: true },
    });

    res.json({ passport: { ...animal, farm } });
  } catch (e: any) {
    res.status(404).json({ error: e.message || 'Passport not found' });
  }
});

// POST /api/passport/transfer/initiate — seller starts a transfer
router.post('/transfer/initiate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { animalId, toUserId, price, notes, method } = req.body;
  const userId = req.user!.id;

  const existing = await prisma.ownershipTransfer.findFirst({
    where: { animalId, status: 'pending' },
  });
  if (existing) {
    res.json({ transfer: existing, alreadyPending: true });
    return;
  }

  const transferCode = Math.random().toString(36).slice(2, 10).toUpperCase();

  const transfer = await prisma.ownershipTransfer.create({
    data: {
      animalId,
      fromUserId: userId,
      toUserId: toUserId || null, // null = open transfer, claimable by anyone with the code
      initiatedBy: userId,
      method: method || 'in_app',
      status: 'pending',
      price: price || null,
      notes: notes || null,
      transferCode,
    },
  });

  res.json({ transfer });
});

// POST /api/passport/transfer/:id/refresh-code — regenerate the share code for a pending transfer
router.post('/transfer/:id/refresh-code', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.id;

  const transfer = await prisma.ownershipTransfer.findUnique({ where: { id } });

  if (!transfer) {
    res.status(404).json({ error: 'Transfer not found.' });
    return;
  }
  if (transfer.initiatedBy !== userId) {
    res.status(403).json({ error: 'Only the person who initiated this transfer can refresh the code.' });
    return;
  }
  if (transfer.status !== 'pending') {
    res.status(400).json({ error: 'Only pending transfers can have their code refreshed.' });
    return;
  }

  const newCode = Math.random().toString(36).slice(2, 10).toUpperCase();

  const updated = await prisma.ownershipTransfer.update({
    where: { id },
    data: { transferCode: newCode },
  });

  res.json({ transfer: updated });
});

// GET /api/passport/transfer/:code — get transfer details by transfer code
router.get('/transfer/:code', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = (req.params.code as string).trim().toUpperCase();
  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { transferCode: code },
    include: {
      animal: { select: { id: true, name: true, agripulseId: true, breed: true, tagNumber: true } },
      fromUser: { select: { id: true, name: true, email: true } },
      toUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!transfer) {
    res.status(404).json({ error: 'Transfer not found' });
    return;
  }

  res.json({ transfer });
});

// POST /api/passport/transfer/accept — buyer accepts transfer by code
router.post('/transfer/accept', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = (req.body.transferCode as string || '').trim().toUpperCase();
  const buyerSignature = req.body.buyerSignature as string | undefined;
  const userId = req.user!.id;

  if (!code) {
    res.status(400).json({ error: 'Transfer code is required.' });
    return;
  }

  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { transferCode: code },
    include: { animal: { select: { id: true, name: true, agripulseId: true } } },
  });

  if (!transfer || transfer.status !== 'pending') {
    res.status(404).json({ error: 'Invalid or already processed transfer code.' });
    return;
  }

  if (transfer.toUserId !== null && transfer.toUserId !== userId) {
    res.status(403).json({ error: 'This transfer is not addressed to you.' });
    return;
  }
  if (transfer.fromUserId === userId) {
    res.status(400).json({ error: 'You cannot accept your own transfer.' });
    return;
  }

  await prisma.animal.update({
    where: { id: transfer.animalId },
    data: { farmId: userId },
  });

  await prisma.ownershipTransfer.update({
    where: { id: transfer.id },
    data: {
      toUserId: userId, // claim the transfer for whoever actually accepted it
      status: 'completed',
      transferDate: new Date(),
      notes: buyerSignature ? `${transfer.notes || ''}\n[Buyer signature recorded]`.trim() : transfer.notes,
    },
  });

  res.json({ message: 'Ownership transferred successfully', animal: transfer.animal });
});

// POST /api/passport/transfer/:id/cancel — cancel a pending transfer
router.post('/transfer/:id/cancel', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string);
  const userId = req.user!.id;

  const transfer = await prisma.ownershipTransfer.findUnique({ where: { id } });

  if (!transfer) {
    res.status(404).json({ error: 'Transfer not found' });
    return;
  }

  if (transfer.fromUserId !== userId && transfer.initiatedBy !== userId) {
    res.status(403).json({ error: 'You cannot cancel this transfer.' });
    return;
  }

  if (transfer.status !== 'pending') {
    res.status(400).json({ error: `Cannot cancel a transfer that is already ${transfer.status}.` });
    return;
  }

  await prisma.ownershipTransfer.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  res.json({ message: 'Transfer cancelled.' });
});

// GET /api/passport/transfer/animal/:animalId — transfer history for an animal
router.get('/transfer/animal/:animalId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const animalIdParam = req.params.animalId as string;
  const isNumeric = /^\d+$/.test(animalIdParam);
  const animalId = isNumeric ? parseInt(animalIdParam) : 0;

  const transfers = await prisma.ownershipTransfer.findMany({
    where: { animalId },
    orderBy: { createdAt: 'desc' },
    include: {
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  });

  res.json({ transfers });
});

export default router;

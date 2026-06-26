import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getAnimalPassport } from '../services/passport.service';
import prisma from '../lib/prisma';
import crypto from 'crypto';

const router = Router();

const TRANSFER_EXPIRY_HOURS = 1;

// GET /api/passport/:agripulseId — public animal passport
router.get('/:agripulseId', async (req: Request, res: Response): Promise<void> => {
  const agripulseId = req.params.agripulseId as string;
  const passport = await getAnimalPassport(agripulseId);
  if (!passport) {
    res.status(404).json({ error: 'Animal not found' });
    return;
  }
  res.json({ passport });
});

// POST /api/passport/transfer/initiate — start ownership transfer
router.post('/transfer/initiate', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { animalId, toEmail, method, sellerSignature } = req.body;
  const userId = req.user!.id;

  if (!sellerSignature) {
    res.status(400).json({ error: 'Seller signature is required to initiate transfer.' });
    return;
  }

  const animal = await prisma.animal.findFirst({
    where: { id: animalId, farmId: userId },
  });

  if (!animal) {
    res.status(404).json({ error: 'Animal not found or not yours' });
    return;
  }

  // Guard: block a second pending transfer on the same animal
  const existingPending = await prisma.ownershipTransfer.findFirst({
    where: { animalId, status: 'pending' },
  });

  if (existingPending) {
    res.status(409).json({
      error: `A transfer is already pending for this animal (code ${existingPending.transferCode}). Cancel it before starting a new one.`,
    });
    return;
  }

  const transferCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + TRANSFER_EXPIRY_HOURS * 60 * 60 * 1000);

  const transfer = await prisma.ownershipTransfer.create({
    data: {
      animalId,
      fromFarmId: userId,
      toEmail,
      method: method || 'in_app',
      status: 'pending',
      transferCode,
      initiatedBy: userId,
      sellerSignature,
      sellerSignedAt: new Date(),
      expiresAt,
    },
  });

  res.json({ transfer, transferCode });
});

// GET /api/passport/transfer/:code — get transfer details (for buyer to preview)
router.get('/transfer/:code', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = req.params.code as string;
  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { transferCode: code },
    include: {
      animal: { select: { name: true, agripulseId: true, breed: true, tagNumber: true } },
      fromFarm: { select: { name: true } },
    },
  });

  if (!transfer) {
    res.status(404).json({ error: 'Transfer not found' });
    return;
  }

  if (transfer.status !== 'pending') {
    res.status(400).json({ error: `This transfer is already ${transfer.status}.` });
    return;
  }

  if (transfer.expiresAt && transfer.expiresAt < new Date()) {
    res.status(400).json({ error: 'This transfer code has expired. Ask the seller to start a new one.' });
    return;
  }

  res.json({ transfer });
});

// POST /api/passport/transfer/accept — accept ownership transfer
router.post('/transfer/accept', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { transferCode, buyerSignature } = req.body;
  const userId = req.user!.id;
  const userEmail = req.user!.email;

  if (!buyerSignature) {
    res.status(400).json({ error: 'Buyer signature is required to accept transfer.' });
    return;
  }

  const transfer = await prisma.ownershipTransfer.findUnique({
    where: { transferCode },
    include: { animal: { select: { name: true, agripulseId: true } } },
  });

  if (!transfer || transfer.status !== 'pending') {
    res.status(404).json({ error: 'Invalid or expired transfer code' });
    return;
  }

  if (transfer.expiresAt && transfer.expiresAt < new Date()) {
    res.status(400).json({ error: 'This transfer code has expired. Ask the seller to start a new one.' });
    return;
  }

  if (transfer.toEmail && transfer.toEmail.toLowerCase() !== userEmail.toLowerCase()) {
    res.status(403).json({ error: 'This transfer code was issued to a different email address.' });
    return;
  }

  // Update animal ownership
  await prisma.animal.update({
    where: { id: transfer.animalId },
    data: { farmId: userId },
  });

  // Mark transfer complete with buyer signature
  await prisma.ownershipTransfer.update({
    where: { id: transfer.id },
    data: {
      status: 'completed',
      toFarmId: userId,
      completedAt: new Date(),
      buyerSignature,
      buyerSignedAt: new Date(),
    },
  });

  res.json({ message: 'Ownership transferred successfully', animal: transfer.animal });
});

// POST /api/passport/transfer/:code/cancel — seller cancels a pending transfer
router.post('/transfer/:code/cancel', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = req.params.code as string;
  const userId = req.user!.id;

  const transfer = await prisma.ownershipTransfer.findUnique({ where: { transferCode: code } });

  if (!transfer) {
    res.status(404).json({ error: 'Transfer not found' });
    return;
  }

  if (transfer.fromFarmId !== userId) {
    res.status(403).json({ error: 'You can only cancel transfers you initiated.' });
    return;
  }

  if (transfer.status !== 'pending') {
    res.status(400).json({ error: `Cannot cancel a transfer that is already ${transfer.status}.` });
    return;
  }

  await prisma.ownershipTransfer.update({
    where: { id: transfer.id },
    data: { status: 'cancelled' },
  });

  res.json({ message: 'Transfer cancelled.' });
});

// GET /api/passport/transfer/animal/:animalId — list transfer history + pending for an animal
router.get('/transfer/animal/:animalId', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const animalId = parseInt(req.params.animalId as string);

  const transfers = await prisma.ownershipTransfer.findMany({
    where: { animalId },
    orderBy: { createdAt: 'desc' },
    include: {
      fromFarm: { select: { id: true, name: true } },
      toFarm: { select: { id: true, name: true } },
    },
  });

  res.json({ transfers });
});

export default router;

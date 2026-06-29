import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// ── FAVORITES ──────────────────────────────────────────────────────────────────
router.post('/favorites', async (req: Request, res: Response): Promise<void> => {
  try {
    const { listingId } = req.body;
    const userId = req.user!.id;
    const fav = await prisma.marketFavorite.upsert({
      where: { listingId_userId: { listingId: parseInt(listingId), userId } },
      create: { listingId: parseInt(listingId), userId },
      update: {},
    });
    res.status(201).json({ favorite: fav });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete('/favorites/:listingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.marketFavorite.deleteMany({ where: { listingId: parseInt(req.params.listingId as string), userId } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/favorites', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const favorites = await prisma.marketFavorite.findMany({
      where: { userId },
      include: { listing: { include: { animal: { select: { name: true, breed: true, category: true, dateOfBirth: true } }, photos: { where: { isPrimary: true }, take: 1 }, seller: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ favorites });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ── AGREEMENTS ─────────────────────────────────────────────────────────────────
router.get('/agreements/:listingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const listingId = parseInt(req.params.listingId as string);
    const agreement = await prisma.marketAgreement.findFirst({
      where: { listingId },
      include: { listing: { include: { animal: true, seller: { select: { id: true, name: true } }, photos: { where: { isPrimary: true }, take: 1 } } } },
    });
    if (!agreement) { res.status(404).json({ error: 'No agreement found' }); return; }
    // Verify user is seller or buyer
    const offer = await prisma.marketOffer.findUnique({ where: { id: agreement.offerId } });
    if (!offer || (offer.buyerId !== userId && agreement.listing.sellerId !== userId)) {
      res.status(403).json({ error: 'Unauthorized' }); return;
    }
    res.json({ agreement, offer });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Sign agreement
router.post('/agreements/:id/sign', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const agreementId = parseInt(req.params.id as string);
    const { signature, role } = req.body; // role: 'buyer' | 'seller'
    if (!signature) { res.status(400).json({ error: 'signature required' }); return; }

    const agreement = await prisma.marketAgreement.findUnique({
      where: { id: agreementId },
      include: { listing: { include: { seller: true } } },
    });
    if (!agreement) { res.status(404).json({ error: 'Agreement not found' }); return; }

    const offer = await prisma.marketOffer.findUnique({ where: { id: agreement.offerId } });
    if (!offer) { res.status(404).json({ error: 'Offer not found' }); return; }

    const isSeller = agreement.listing.sellerId === userId;
    const isBuyer = offer.buyerId === userId;
    if (!isSeller && !isBuyer) { res.status(403).json({ error: 'Unauthorized' }); return; }

    let data: any = {};
    if (isBuyer) { data.buyerSignature = signature; data.buyerSignedAt = new Date(); data.status = 'buyer_signed'; }
    if (isSeller) { data.sellerSignature = signature; data.sellerSignedAt = new Date(); data.status = 'seller_signed'; }

    // If both signed → complete
    const updated = await prisma.marketAgreement.update({ where: { id: agreementId }, data });
    const both = updated.buyerSignature && updated.sellerSignature;
    let finalAgreement = updated;

    if (both && updated.status !== 'complete') {
      finalAgreement = await prisma.marketAgreement.update({ where: { id: agreementId }, data: { status: 'complete' } });

      // Trigger ownership transfer
      await prisma.marketListing.update({ where: { id: agreement.listingId }, data: { status: 'sold' } });
      await prisma.ownershipTransfer.create({
        data: {
          animalId: agreement.listing.animalId,
          fromUserId: agreement.listing.sellerId,
          toUserId: offer.buyerId,
          method: 'in_app',
          status: 'completed',
          initiatedBy: agreement.listing.sellerId,
        },
      });
      // Update animal ownership
      await prisma.animal.update({ where: { id: agreement.listing.animalId }, data: { farmId: offer.buyerId } });
    }

    res.json({ agreement: finalAgreement, complete: both });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

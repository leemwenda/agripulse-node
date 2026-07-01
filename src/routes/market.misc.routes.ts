import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// Favorites
router.get('/favorites', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const favorites = await prisma.marketFavorite.findMany({
      where: { userId },
      include: { listing: { include: { animal: true } } },
    });
    res.json({ favorites });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/favorites', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { listingId } = req.body;
    await prisma.marketFavorite.create({ data: { userId, listingId } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete('/favorites/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseInt(String(req.params.id) as string);
    await prisma.marketFavorite.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// Agreements
router.get('/agreements/:listingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const agreement = await prisma.marketAgreement.findUnique({
      where: { listingId: parseInt(String(req.params.listingId) as string) },
    });
    res.json({ agreement });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/agreements/:id/sign', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id) as string);
    const userId = req.user!.id;
    const { signature } = req.body;

    const agreement = await prisma.marketAgreement.findUnique({
      where: { id },
      include: {
        listing: { include: { animal: true, seller: true } },
      },
    });
    if (!agreement) { res.status(404).json({ error: 'Agreement not found' }); return; }

    const offer = await prisma.marketOffer.findUnique({
      where: { id: agreement.offerId },
      include: { buyer: true },
    });
    if (!offer) { res.status(404).json({ error: 'Underlying offer not found' }); return; }

    const isBuyer = userId === offer.buyerId;
    const isSeller = userId === agreement.listing.sellerId;
    if (!isBuyer && !isSeller) {
      res.status(403).json({ error: 'You are not a party to this agreement' });
      return;
    }

    if (isBuyer && agreement.buyerSignedAt) { res.status(400).json({ error: 'You have already signed' }); return; }
    if (isSeller && agreement.sellerSignedAt) { res.status(400).json({ error: 'You have already signed' }); return; }

    const data: any = isBuyer
      ? { buyerSignature: signature, buyerSignedAt: new Date() }
      : { sellerSignature: signature, sellerSignedAt: new Date() };

    const buyerWillBeSigned = isBuyer || !!agreement.buyerSignedAt;
    const sellerWillBeSigned = isSeller || !!agreement.sellerSignedAt;
    const bothSigned = buyerWillBeSigned && sellerWillBeSigned;

    data.status = bothSigned ? 'complete' : (isBuyer ? 'buyer_signed' : 'seller_signed');

    const updated = await prisma.marketAgreement.update({ where: { id }, data });

    if (bothSigned) {
      const transferCode = Math.random().toString(36).slice(2, 10).toUpperCase();
      await prisma.ownershipTransfer.create({
        data: {
          animalId: agreement.listing.animalId,
          fromUserId: agreement.listing.sellerId,
          toUserId: offer.buyerId,
          initiatedBy: agreement.listing.sellerId,
          method: 'in_app',
          status: 'completed',
          price: agreement.agreedPrice,
          transferCode,
          transferDate: new Date(),
        },
      });
      await prisma.animal.update({
        where: { id: agreement.listing.animalId },
        data: { farmId: offer.buyerId },
      });

      try {
        const { mailMarketTransferComplete, mailMarketTransferCompleteToSeller } = require('../services/mail.service');
        await mailMarketTransferComplete(
          offer.buyer.email, offer.buyer.name,
          agreement.listing.seller.name, agreement.listing.animal.name,
          agreement.listing.animal.agripulseId || '', Number(agreement.agreedPrice)
        ).catch(() => {});
        await mailMarketTransferCompleteToSeller(
          agreement.listing.seller.email, agreement.listing.seller.name,
          offer.buyer.name, agreement.listing.animal.name,
          Number(agreement.agreedPrice)
        ).catch(() => {});
      } catch {}
    }

    res.json({ agreement: updated, transferred: bothSigned });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

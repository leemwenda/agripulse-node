import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// POST /api/market-offers — make offer
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const { listingId, amount, note } = req.body;
    if (!listingId || !amount) { res.status(400).json({ error: 'listingId and amount required' }); return; }

    const listing = await prisma.marketListing.findUnique({ where: { id: parseInt(listingId) } });
    if (!listing || listing.status !== 'active') { res.status(404).json({ error: 'Listing not active' }); return; }
    if (listing.sellerId === buyerId) { res.status(400).json({ error: 'Cannot offer on your own listing' }); return; }

    // Expire previous pending offers from this buyer on this listing
    await prisma.marketOffer.updateMany({
      where: { listingId: parseInt(listingId), buyerId, status: 'pending' },
      data: { status: 'withdrawn' },
    });

    const offer = await prisma.marketOffer.create({
      data: { listingId: parseInt(listingId), buyerId, amount: parseFloat(amount), note: note || null },
      include: { buyer: { select: { id: true, name: true } }, listing: { include: { animal: { select: { name: true } } } } },
    });

    // Auto-create message thread if not exists
    await prisma.marketThread.upsert({
      where: { listingId_buyerId: { listingId: parseInt(listingId), buyerId } },
      create: { listingId: parseInt(listingId), buyerId },
      update: {},
    }).then(thread =>
      prisma.marketMessage.create({
        data: { threadId: thread.id, senderId: buyerId, body: `Made an offer of KSh ${parseFloat(amount).toLocaleString()}${note ? ': ' + note : ''}`, type: 'offer' },
      })
    );

    res.status(201).json({ offer });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/market-offers/:id — accept / reject / counter (seller)
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.id;
    const offerId = parseInt(req.params.id as string);
    const { action, counterAmount, note } = req.body; // action: 'accept'|'reject'|'counter'

    const offer = await prisma.marketOffer.findFirst({
      where: { id: offerId, listing: { sellerId } },
      include: { listing: true },
    });
    if (!offer) { res.status(404).json({ error: 'Offer not found' }); return; }
    if (offer.status !== 'pending') { res.status(400).json({ error: 'Offer is no longer pending' }); return; }

    if (action === 'accept') {
      // Accept: update offer, reserve listing, create agreement
      await prisma.marketOffer.update({ where: { id: offerId }, data: { status: 'accepted' } });
      await prisma.marketOffer.updateMany({
        where: { listingId: offer.listingId, id: { not: offerId }, status: 'pending' },
        data: { status: 'withdrawn' },
      });
      await prisma.marketListing.update({ where: { id: offer.listingId }, data: { status: 'reserved' } });

      // Create agreement
      const agreement = await prisma.marketAgreement.create({
        data: { listingId: offer.listingId, offerId, agreedPrice: offer.amount, status: 'draft' },
      });

      // System message in thread
      const thread = await prisma.marketThread.findUnique({ where: { listingId_buyerId: { listingId: offer.listingId, buyerId: offer.buyerId } } });
      if (thread) {
        await prisma.marketMessage.create({
          data: { threadId: thread.id, senderId: sellerId, body: `✅ Offer of KSh ${Number(offer.amount).toLocaleString()} accepted! Please proceed to sign the sale agreement.`, type: 'system' },
        });
      }

      res.json({ offer: { ...offer, status: 'accepted' }, agreement });
    } else if (action === 'reject') {
      await prisma.marketOffer.update({ where: { id: offerId }, data: { status: 'rejected' } });
      res.json({ offer: { ...offer, status: 'rejected' } });
    } else if (action === 'counter') {
      if (!counterAmount) { res.status(400).json({ error: 'counterAmount required' }); return; }
      // Mark original as countered
      await prisma.marketOffer.update({ where: { id: offerId }, data: { status: 'countered' } });
      // Create counter offer from seller perspective (buyerId stays same for tracking)
      const counter = await prisma.marketOffer.create({
        data: { listingId: offer.listingId, buyerId: offer.buyerId, amount: parseFloat(counterAmount), note: note || null, parentId: offerId },
      });
      // Message
      const thread = await prisma.marketThread.findUnique({ where: { listingId_buyerId: { listingId: offer.listingId, buyerId: offer.buyerId } } });
      if (thread) {
        await prisma.marketMessage.create({
          data: { threadId: thread.id, senderId: sellerId, body: `Counter offer: KSh ${parseFloat(counterAmount).toLocaleString()}${note ? '. ' + note : ''}`, type: 'offer' },
        });
      }
      res.json({ counter });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/market-offers/my — buyer's offers
router.get('/my', async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const offers = await prisma.marketOffer.findMany({
      where: { buyerId, parentId: null },
      include: {
        listing: {
          include: {
            animal: { select: { name: true, breed: true, agripulseId: true } },
            seller: { select: { id: true, name: true } },
            photos: { where: { isPrimary: true }, take: 1 },
          },
        },
        counters: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ offers });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/market-offers/:id — withdraw
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const offer = await prisma.marketOffer.findFirst({ where: { id: parseInt(req.params.id as string), buyerId, status: 'pending' } });
    if (!offer) { res.status(404).json({ error: 'Offer not found' }); return; }
    await prisma.marketOffer.update({ where: { id: offer.id }, data: { status: 'withdrawn' } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

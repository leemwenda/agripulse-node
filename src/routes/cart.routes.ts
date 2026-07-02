import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

// GET /api/cart — list current user's cart items
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            animal: { include: { photos: { where: { isPrimary: true }, take: 1 } } },
            seller: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/cart — add a listing to cart
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { listingId } = req.body;
    if (!listingId) { res.status(400).json({ error: 'listingId required' }); return; }

    const listing = await prisma.marketListing.findUnique({ where: { id: parseInt(listingId) } });
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (listing.status !== 'active') { res.status(400).json({ error: 'This listing is no longer available' }); return; }
    if (listing.sellerId === userId) { res.status(400).json({ error: 'Cannot add your own listing to cart' }); return; }

    const item = await prisma.cartItem.upsert({
      where: { userId_listingId: { userId, listingId: parseInt(listingId) } },
      create: { userId, listingId: parseInt(listingId) },
      update: {},
    });
    res.status(201).json({ item });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// DELETE /api/cart/:listingId — remove item from cart
router.delete('/:listingId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const listingId = parseInt(req.params.listingId as string);
    await prisma.cartItem.deleteMany({ where: { userId, listingId } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// POST /api/cart/checkout — convert all cart items into pending agreements
router.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = req.user!.id;
    const items = await prisma.cartItem.findMany({
      where: { userId: buyerId },
      include: { listing: true },
    });

    if (items.length === 0) { res.status(400).json({ error: 'Cart is empty' }); return; }

    const created: any[] = [];
    const skipped: any[] = [];

    for (const item of items) {
      const listing = item.listing;

      if (listing.status !== 'active') {
        skipped.push({ listingId: listing.id, reason: 'No longer active' });
        continue;
      }

      const existing = await prisma.marketOffer.findFirst({
        where: { listingId: listing.id, buyerId, status: { in: ['pending', 'countered'] }, note: 'Buy Now — purchase at asking price' },
      });
      if (existing) {
        skipped.push({ listingId: listing.id, reason: 'You already have an order pending on this listing' });
        continue;
      }

      const offer = await prisma.marketOffer.create({
        data: {
          listingId: listing.id,
          buyerId,
          amount: listing.askingPrice,
          note: 'Buy Now — purchase at asking price',
          status: 'pending',
        },
      });

      const thread = await prisma.marketThread.upsert({
        where: { listingId_buyerId: { listingId: listing.id, buyerId } },
        create: { listingId: listing.id, buyerId },
        update: {},
      });
      await prisma.marketMessage.create({
        data: {
          threadId: thread.id,
          senderId: buyerId,
          body: `Buy Now order placed for KSh ${Number(listing.askingPrice).toLocaleString()}. Awaiting your confirmation.`,
          type: 'system',
        },
      });

      try {
        await prisma.marketNotification.create({
          data: {
            userId: listing.sellerId,
            type: 'new_offer',
            title: 'New Buy Now order',
            body: `${req.user!.name} placed a Buy Now order for KSh ${Number(listing.askingPrice).toLocaleString()}. Confirm to proceed.`,
            link: `/marketplace/listing/${listing.id}`,
          },
        });
      } catch {}

      created.push({ listingId: listing.id, offerId: offer.id });
    }

    const processedListingIds = created.map(c => c.listingId);
    if (processedListingIds.length > 0) {
      await prisma.cartItem.deleteMany({
        where: { userId: buyerId, listingId: { in: processedListingIds } },
      });
    }

    res.json({ created, skipped, message: `${created.length} order(s) placed, awaiting seller confirmation.` });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

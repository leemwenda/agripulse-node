import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/seller', async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.id;
    const [listings, offers, agreements] = await Promise.all([
      prisma.marketListing.findMany({
        where: { sellerId },
        include: { offers: true },
      }),
      prisma.marketOffer.findMany({
        where: { listing: { sellerId } },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.marketAgreement.findMany({
        where: { listing: { sellerId } },
      }),
    ]);

    const totalViews = listings.reduce((s, l) => s + (l.viewCount || 0), 0);
    const totalOffers = offers.length;
    const acceptedOffers = offers.filter(o => o.status === 'accepted').length;
    const completedSales = agreements.filter(a => a.status === 'complete').length;
    const totalRevenue = agreements.filter(a => a.status === 'complete').reduce((s, a) => s + Number(a.agreedPrice), 0);

    const byStatus = {
      active: listings.filter(l => l.status === 'active').length,
      reserved: listings.filter(l => l.status === 'reserved').length,
      sold: listings.filter(l => l.status === 'sold').length,
    };

    // Views per listing for chart
    const listingPerformance = listings.map(l => ({
      id: l.id, title: l.title, views: l.viewCount || 0,
      offers: l.offers.length, askingPrice: Number(l.askingPrice), status: l.status,
    }));

    res.json({ totalViews, totalOffers, acceptedOffers, completedSales, totalRevenue, byStatus, listingPerformance, totalListings: listings.length });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { listingService } from '../services/listing.service';
import { inquiryService } from '../services/inquiry.service';

const router = Router();

// ──────────────────────────────────────
// LISTINGS - Public
// ──────────────────────────────────────

/**
 * Browse marketplace listings (public, no auth required)
 * GET /marketplace/listings
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const {
      status = 'active',
      farmId,
      sellerId,
      category,
      location,
      minPrice,
      maxPrice,
      search,
      page = '1',
      limit = '12',
    } = req.query;

    const listings = await listingService.browseListing({
      status: (status as any) || 'active',
      farmId: farmId ? parseInt(farmId as string) : undefined,
      sellerId: sellerId ? parseInt(sellerId as string) : undefined,
      category: category as string,
      location: location as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json(listings);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get single listing detail (public)
 * GET /marketplace/listings/:id
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const listing = await listingService.getListing(parseInt(req.params.id as string));
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ──────────────────────────────────────
// LISTINGS - Seller Operations (auth required)
// ──────────────────────────────────────

/**
 * Create a new listing (seller)
 * POST /marketplace/listings
 */
router.post('/listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const { animalId, askingPrice, description, location } = req.body;
    const userId = req.user!.id;

    if (!animalId) return res.status(400).json({ error: 'animalId is required' });

    // Get user's farm
    const user = req.user!;
    const farmId = user.farmId ?? userId;

    const listing = await listingService.createListing({
      animalId,
      farmId,
      sellerId: userId,
      askingPrice,
      description,
      location,
    });

    res.status(201).json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get seller's listings
 * GET /marketplace/my-listings
 */
router.get('/my-listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, page = '1', limit = '10' } = req.query;

    const listings = await listingService.getSellerListings(userId, {
      status: (status as any),
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json(listings);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get seller statistics
 * GET /marketplace/seller-stats
 */
router.get('/seller-stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await listingService.getSellerStats(userId);
    res.json(stats);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Update listing
 * PATCH /marketplace/listings/:id
 */
router.patch('/listings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { askingPrice, description, location, status } = req.body;

    const listing = await listingService.updateListing(parseInt(req.params.id as string), userId, {
      askingPrice,
      description,
      location,
      status: (status as any),
    });

    res.json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Delete/cancel listing
 * DELETE /marketplace/listings/:id
 */
router.delete('/listings/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await listingService.deleteListing(parseInt(req.params.id as string), userId);
    res.json({ success: true, message: 'Listing cancelled' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ──────────────────────────────────────
// INQUIRIES & MESSAGES (auth required)
// ──────────────────────────────────────

/**
 * Start inquiry on listing (buyer)
 * POST /marketplace/listings/:id/inquiries
 */
router.post('/listings/:id/inquiries', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const listingId = parseInt(req.params.id as string);
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'message is required' });

    const inquiry = await inquiryService.startInquiry({
      listingId,
      buyerId: userId,
      firstMessage: message,
    });

    res.status(201).json(inquiry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get inquiries for a listing (seller)
 * GET /marketplace/listings/:id/inquiries
 */
router.get('/listings/:id/inquiries', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const listingId = parseInt(req.params.id as string);

    const inquiries = await inquiryService.getListingInquiries(listingId, userId);
    res.json(inquiries);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get buyer's inquiries
 * GET /marketplace/my-inquiries
 */
router.get('/my-inquiries', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '10' } = req.query;

    const result = await inquiryService.getBuyerInquiries(
      userId,
      parseInt(page as string),
      parseInt(limit as string),
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get single inquiry with messages
 * GET /marketplace/inquiries/:id
 */
router.get('/inquiries/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const inquiry = await inquiryService.getInquiry(parseInt(req.params.id as string));
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json(inquiry);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Send message in inquiry
 * POST /marketplace/inquiries/:id/messages
 */
router.post('/inquiries/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'message is required' });

    const msg = await inquiryService.sendMessage({
      inquiryId: parseInt(req.params.id as string),
      senderId: userId,
      message,
    });

    res.status(201).json(msg);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get inquiry messages paginated
 * GET /marketplace/inquiries/:id/messages
 */
router.get('/inquiries/:id/messages', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;

    const result = await inquiryService.getMessages(
      parseInt(req.params.id as string),
      parseInt(page as string),
      parseInt(limit as string),
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

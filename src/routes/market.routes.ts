import { Router, Request, Response } from 'express';
import { requireAuth, requireFarmer, optionalAuth } from '../middleware/auth.middleware';
import { getFarmId } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { mailMarketListingPublished, mailMarketTransferComplete, mailMarketTransferCompleteToSeller } from '../services/mail.service';

const router = Router();

// ─── PUBLIC: Browse listings ─────────────────────────────────────────────────
router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search, county, category, gender, minPrice, maxPrice,
      breed, negotiable, page = '1', limit = '16', sort = 'newest'
    } = req.query as Record<string,string>;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { status: 'active' };
    if (req.user) where.sellerId = { not: req.user.id };
    if (county) where.county = { contains: county };
    if (minPrice || maxPrice) {
      where.askingPrice = {};
      if (minPrice) where.askingPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.askingPrice.lte = parseFloat(maxPrice);
    }
    if (negotiable === 'true') where.negotiable = true;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { animal: { name: { contains: search } } },
        { animal: { breed: { contains: search } } },
      ];
    }
    if (category) where.animal = { ...where.animal, category };
    if (gender) where.animal = { ...where.animal, gender };
    if (breed) where.animal = { ...where.animal, breed: { contains: breed } };

    const orderBy: any = sort === 'price_asc' ? { askingPrice: 'asc' }
      : sort === 'price_desc' ? { askingPrice: 'desc' }
      : sort === 'oldest' ? { createdAt: 'asc' }
      : { createdAt: 'desc' };

    const [listings, total] = await Promise.all([
      prisma.marketListing.findMany({
        where, skip, take: parseInt(limit),
        orderBy: [{ featured: 'desc' }, orderBy],
        include: {
          animal: { select: { name: true, breed: true, gender: true, category: true, dateOfBirth: true, agripulseId: true, photos: { where: { isPrimary: true }, take: 1 } } },
          seller: { select: { id: true, name: true } },
          photos: { where: { isPrimary: true }, take: 1 },
          _count: { select: { offers: true, favorites: true } },
        },
      }),
      prisma.marketListing.count({ where }),
    ]);

    // Track view IP (non-blocking)
    const ip = req.ip || '';
    listings.forEach(l => {
      prisma.marketView.create({ data: { listingId: l.id, ip } }).catch(() => {});
      prisma.marketListing.update({ where: { id: l.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    });

    res.json({ listings, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── PUBLIC: Single listing ───────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(404).json({ error: 'Listing not found' }); return; }
    const listing = await prisma.marketListing.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            photos: { orderBy: { isPrimary: 'desc' } },
            healthRecords: { orderBy: { recordDate: 'desc' }, take: 5 },
            milkProduction: { orderBy: { productionDate: 'desc' }, take: 10 },
            breeding: { orderBy: { serviceDate: 'desc' }, take: 3 },
            weights: { orderBy: { recordedAt: 'desc' }, take: 5 },
            ownershipTransfers: { where: { status: 'completed' }, orderBy: { createdAt: 'asc' }, include: { fromUser: { select: { name: true } }, toUser: { select: { name: true } } } },
          },
        },
        seller: { select: { id: true, name: true, createdAt: true } },
        photos: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
        _count: { select: { offers: true, favorites: true, views: true } },
      },
    });
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }

    // Count completed sales for seller
    const sellerSales = await prisma.marketListing.count({ where: { sellerId: listing.sellerId, status: 'sold' } });

    // Increment view
    await prisma.marketListing.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    await prisma.marketView.create({ data: { listingId: id, ip: req.ip || '', userId: (req as any).user?.id } }).catch(() => {});

    res.json({ listing: { ...listing, sellerSales } });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── PUBLIC: Seller profile ───────────────────────────────────────────────────
router.get('/seller/:sellerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = parseInt(req.params.sellerId as string);
    const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { id: true, name: true, createdAt: true } });
    if (!seller) { res.status(404).json({ error: 'Seller not found' }); return; }

    const listings = await prisma.marketListing.findMany({
      where: { sellerId, status: { in: ['active', 'reserved'] } },
      include: { photos: { where: { isPrimary: true }, take: 1 }, animal: { select: { name: true, breed: true, category: true, dateOfBirth: true } }, _count: { select: { offers: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const soldCount = await prisma.marketListing.count({ where: { sellerId, status: 'sold' } });

    res.json({ seller: { ...seller, soldCount }, listings });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── FARMER: Create listing from existing animal ──────────────────────────────
router.post('/', requireAuth, requireFarmer, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { animalId, title, description, askingPrice, negotiable, county, town } = req.body;

    if (!animalId || !title || !askingPrice || !county) {
      res.status(400).json({ error: 'animalId, title, askingPrice, county are required' }); return;
    }

    // Verify animal belongs to this user's farm
    const farmId = getFarmId(req.user!);
    const animal = await prisma.animal.findFirst({ where: { id: parseInt(animalId), farmId } });
    if (!animal) { res.status(404).json({ error: 'Animal not found or not yours' }); return; }

    // Check not already listed
    const existing = await prisma.marketListing.findUnique({ where: { animalId: parseInt(animalId) } });
    if (existing && !['cancelled', 'sold', 'expired'].includes(existing.status)) {
      res.status(409).json({ error: 'This animal already has an active listing' }); return;
    }

    const listing = await prisma.marketListing.create({
      data: {
        animalId: parseInt(animalId),
        sellerId: userId,
        title,
        description: description || null,
        askingPrice: parseFloat(askingPrice),
        negotiable: negotiable !== false,
        county,
        town: town || null,
        status: 'active',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
      include: { animal: true, photos: true },
    });

    // Email seller
    try {
      const seller = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (seller) {
        const animal = await prisma.animal.findUnique({ where: { id: parseInt(animalId) }, select: { name: true } });
        await mailMarketListingPublished(seller.email, seller.name, animal?.name || 'Animal', parseFloat(askingPrice), listing.id).catch(() => {});
      }
    } catch {}
    res.status(201).json({ listing });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── FARMER: Upload listing photo ─────────────────────────────────────────────
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = '/var/www/agripulse-staging/uploads/market';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

router.post('/:id/photos', requireAuth, upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id as string);
    const listing = await prisma.marketListing.findFirst({ where: { id: listingId, sellerId: req.user!.id } });
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    if (!req.file) { res.status(400).json({ error: 'No file' }); return; }

    const isPrimary = req.body.isPrimary === 'true';
    if (isPrimary) await prisma.marketPhoto.updateMany({ where: { listingId }, data: { isPrimary: false } });

    const photo = await prisma.marketPhoto.create({
      data: { listingId, url: `/uploads/market/${req.file.filename}`, isPrimary, order: parseInt(req.body.order || '0') },
    });
    res.status(201).json({ photo });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── FARMER: Update listing ────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const listing = await prisma.marketListing.findFirst({ where: { id, sellerId: req.user!.id } });
    if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
    const { title, description, askingPrice, negotiable, county, town, status } = req.body;
    const updated = await prisma.marketListing.update({
      where: { id },
      data: { title, description, askingPrice: askingPrice ? parseFloat(askingPrice) : undefined, negotiable, county, town, status },
    });
    res.json({ listing: updated });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── FARMER: My listings ───────────────────────────────────────────────────────

// ─── FARMER: Received offers summary ─────────────────────────────────────────
router.get('/my/received-offers', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.id;
    const offers = await prisma.marketOffer.findMany({
      where: { listing: { sellerId }, parentId: null }, // only root offers
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        listing: { include: { animal: { select: { name: true, agripulseId: true } }, photos: { where: { isPrimary: true }, take: 1 } } },
        counters: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ offers });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ─── FARMER: Delete listing (cancel) ──────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const listing = await prisma.marketListing.findFirst({ where: { id, sellerId: req.user!.id } });
    if (!listing) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.marketListing.update({ where: { id }, data: { status: 'cancelled' } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});


// GET /api/market/my-listings — seller's own listings with pending offers
router.get('/my-listings', async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.id;
    const listings = await prisma.marketListing.findMany({
      where: { sellerId },
      include: {
        animal: {
          include: {
            photos: { where: { isPrimary: true }, take: 1 },
          },
        },
        offers: {
          where: { status: 'pending', parentId: null },
          include: { buyer: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ listings });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// GET /api/market/seller-offers — all offers across seller's listings
router.get('/seller-offers', async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.id;
    const offers = await prisma.marketOffer.findMany({
      where: { listing: { sellerId }, parentId: null },
      include: {
        listing: {
          include: {
            animal: { select: { name: true, breed: true } },
          },
        },
        buyer: { select: { id: true, name: true } },
        counters: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ offers });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;

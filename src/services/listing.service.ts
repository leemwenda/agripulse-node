import prisma from '../lib/prisma';
import { Listing, ListingStatus } from '@prisma/client';

export const listingService = {
  /**
   * Create a new marketplace listing for an animal
   */
  async createListing(data: {
    animalId: number;
    farmId: number;
    sellerId: number;
    askingPrice: number;
    description?: string;
    location?: string;
  }): Promise<Listing> {
    if (!data.askingPrice || data.askingPrice <= 0) {
      throw new Error('Asking price is required and must be greater than zero.');
    }
    // Verify animal exists and belongs to farm
    const animal = await prisma.animal.findUnique({
      where: { id: data.animalId },
    });

    if (!animal || animal.farmId !== data.farmId) {
      throw new Error('Animal not found or does not belong to this farm');
    }

    // Check if there's already an active listing for this animal
    const existingListing = await prisma.listing.findFirst({
      where: {
        animalId: data.animalId,
        status: { in: ['active'] as ListingStatus[] },
      },
    });

    if (existingListing) {
      throw new Error('Animal already has an active listing');
    }

    return prisma.listing.create({
      data: {
        animalId: data.animalId,
        farmId: data.farmId,
        sellerId: data.sellerId,
        askingPrice: parseFloat(data.askingPrice.toString()),
        description: data.description || null,
        location: data.location || null,
        status: 'active',
      },
      include: {
        animal: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get a single listing with animal and seller details
   */
  async getListing(listingId: number): Promise<any> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        animal: {
          include: {
            photos: {
              orderBy: { isPrimary: 'desc' },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            farm: {
              select: {
                id: true,
              },
            },
          },
        },
        inquiries: {
          select: {
            id: true,
            buyerId: true,
          },
        },
      },
    });

    if (listing) {
      // Increment views
      await prisma.listing.update({
        where: { id: listingId },
        data: { views: { increment: 1 } },
      });
    }

    return listing;
  },

  /**
   * Browse marketplace listings with filters and pagination
   */
  async browseListing(filters: {
    status?: ListingStatus;
    farmId?: number;
    sellerId?: number;
    category?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ listings: any[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 12;
    const skip = (page - 1) * limit;

    const where: any = {
      status: filters.status || 'active',
    };

    if (filters.farmId) where.farmId = filters.farmId;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.location) where.location = { contains: filters.location };

    if (filters.minPrice || filters.maxPrice) {
      where.askingPrice = {};
      if (filters.minPrice) where.askingPrice.gte = filters.minPrice;
      if (filters.maxPrice) where.askingPrice.lte = filters.maxPrice;
    }

    // If search is provided, filter by animal name or breed
    if (filters.search) {
      where.OR = [
        { animal: { name: { contains: filters.search } } },
        { animal: { breed: { contains: filters.search } } },
        { description: { contains: filters.search } },
      ];
    }

    // Filter by category if provided
    if (filters.category) {
      where.animal = {
        ...where.animal,
        category: filters.category,
      };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          animal: {
            include: {
              photos: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return {
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Update listing details (seller only)
   */
  async updateListing(
    listingId: number,
    sellerId: number,
    data: {
      askingPrice?: number;
      description?: string;
      location?: string;
      status?: ListingStatus;
    },
  ): Promise<Listing> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) throw new Error('Listing not found');
    if (listing.sellerId !== sellerId) throw new Error('Unauthorized');

    return prisma.listing.update({
      where: { id: listingId },
      data: {
        askingPrice: data.askingPrice !== undefined ? parseFloat(data.askingPrice.toString()) : undefined,
        description: data.description,
        location: data.location,
        status: data.status,
      },
    });
  },

  /**
   * Delete/cancel a listing (seller only)
   */
  async deleteListing(listingId: number, sellerId: number): Promise<void> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) throw new Error('Listing not found');
    if (listing.sellerId !== sellerId) throw new Error('Unauthorized');

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'cancelled' },
    });
  },

  /**
   * Get seller's active listings
   */
  async getSellerListings(
    sellerId: number,
    filters?: { status?: ListingStatus; page?: number; limit?: number },
  ): Promise<any> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { sellerId };
    if (filters?.status) where.status = filters.status;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          animal: true,
          inquiries: {
            select: { id: true, buyerId: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return {
      listings,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get marketplace statistics for a seller
   */
  async getSellerStats(sellerId: number): Promise<{
    totalListings: number;
    activeListings: number;
    soldListings: number;
    totalViews: number;
    totalInquiries: number;
  }> {
    const listings = await prisma.listing.findMany({
      where: { sellerId },
      include: {
        inquiries: {
          select: { id: true },
        },
      },
    });

    const totalViews = listings.reduce((sum, l) => sum + l.views, 0);
    const totalInquiries = listings.reduce((sum, l) => sum + l.inquiries.length, 0);

    return {
      totalListings: listings.length,
      activeListings: listings.filter(l => l.status === 'active').length,
      soldListings: listings.filter(l => l.status === 'sold').length,
      totalViews,
      totalInquiries,
    };
  },

  /**
   * Mark listing as sold when transfer is completed
   */
  async markAsSold(listingId: number): Promise<Listing> {
    return prisma.listing.update({
      where: { id: listingId },
      data: { status: 'sold' },
    });
  },

  /**
   * Check if animal has an active or reserved listing
   */
  async hasActiveListing(animalId: number): Promise<boolean> {
    const listing = await prisma.listing.findFirst({
      where: {
        animalId,
        status: { in: ['active'] as ListingStatus[] },
      },
    });
    return !!listing;
  },
};

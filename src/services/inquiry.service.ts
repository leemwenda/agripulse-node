import prisma from '../lib/prisma';
import { ListingInquiry, InquiryMessage } from '@prisma/client';

export const inquiryService = {
  /**
   * Start an inquiry on a listing (buyer sends first message)
   */
  async startInquiry(data: { listingId: number; buyerId: number; firstMessage: string }): Promise<any> {
    // Check if inquiry already exists
    let inquiry = await prisma.listingInquiry.findUnique({
      where: {
        listingId_buyerId: {
          listingId: data.listingId,
          buyerId: data.buyerId,
        },
      },
    });

    if (!inquiry) {
      inquiry = await prisma.listingInquiry.create({
        data: {
          listingId: data.listingId,
          buyerId: data.buyerId,
        },
      });
    }

    // Add first message
    await prisma.inquiryMessage.create({
      data: {
        inquiryId: inquiry.id,
        senderId: data.buyerId,
        message: data.firstMessage,
      },
    });

    return this.getInquiry(inquiry.id);
  },

  /**
   * Get inquiry with all messages
   */
  async getInquiry(inquiryId: number): Promise<any> {
    return prisma.listingInquiry.findUnique({
      where: { id: inquiryId },
      include: {
        listing: {
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
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  },

  /**
   * Get inquiries for a listing (seller view)
   */
  async getListingInquiries(listingId: number, sellerId: number): Promise<any[]> {
    // Verify seller owns the listing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.sellerId !== sellerId) {
      throw new Error('Unauthorized');
    }

    return prisma.listingInquiry.findMany({
      where: { listingId },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  },

  /**
   * Get inquiries for a buyer (buyer view)
   */
  async getBuyerInquiries(buyerId: number, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [inquiries, total] = await Promise.all([
      prisma.listingInquiry.findMany({
        where: { buyerId },
        include: {
          listing: {
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
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.listingInquiry.count({ where: { buyerId } }),
    ]);

    return {
      inquiries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Send message in inquiry
   */
  async sendMessage(data: { inquiryId: number; senderId: number; message: string }): Promise<InquiryMessage> {
    // Verify user is part of this inquiry
    const inquiry = await prisma.listingInquiry.findUnique({
      where: { id: data.inquiryId },
      include: {
        listing: true,
      },
    });

    if (!inquiry) throw new Error('Inquiry not found');

    const isParticipant =
      inquiry.buyerId === data.senderId || inquiry.listing.sellerId === data.senderId;

    if (!isParticipant) throw new Error('Unauthorized');

    // Create message and update inquiry timestamp
    const message = await prisma.inquiryMessage.create({
      data: {
        inquiryId: data.inquiryId,
        senderId: data.senderId,
        message: data.message,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update inquiry updatedAt
    await prisma.listingInquiry.update({
      where: { id: data.inquiryId },
      data: { updatedAt: new Date() },
    });

    return message;
  },

  /**
   * Get inquiry messages paginated
   */
  async getMessages(inquiryId: number, page: number = 1, limit: number = 50): Promise<any> {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.inquiryMessage.findMany({
        where: { inquiryId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.inquiryMessage.count({ where: { inquiryId } }),
    ]);

    return {
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get unread inquiry count for seller/buyer
   */
  async getUnreadCount(userId: number, role: 'seller' | 'buyer'): Promise<number> {
    if (role === 'seller') {
      // Count inquiries on user's listings
      const listings = await prisma.listing.findMany({
        where: { sellerId: userId },
        select: { id: true },
      });
      const listingIds = listings.map(l => l.id);

      return prisma.listingInquiry.count({
        where: {
          listingId: { in: listingIds },
        },
      });
    }

    // For buyer
    return prisma.listingInquiry.count({
      where: { buyerId: userId },
    });
  },
};

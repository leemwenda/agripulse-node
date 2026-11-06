import prisma from '../lib/prisma';

type NotificationType = 'info' | 'success' | 'warning' | 'danger';
type NotificationCategory = 'health' | 'vaccination' | 'breeding' | 'calving' | 'milk' | 'finance' | 'animal' | 'worker' | 'ai' | 'system';

interface CreateNotificationParams {
  userId: number;
  farmId?: number | null;
  type?: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  link?: string;
  dedupeKey?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const { userId, farmId, type = 'info', category = 'system', title, message, link, dedupeKey } = params;

  if (dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        title,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) return existing;
  }

  return prisma.notification.create({
    data: { userId, farmId: farmId ?? null, type, category, title, message, link },
  });
}

export async function notifyFarmAdmins(
  farmId: number,
  params: Omit<CreateNotificationParams, 'userId' | 'farmId'>,
) {
  const admins = await prisma.user.findMany({
    where: { farmId, role: 'admin', isActive: true },
    select: { id: true },
  });
  return Promise.all(admins.map((a) => createNotification({ ...params, userId: a.id, farmId })));
}

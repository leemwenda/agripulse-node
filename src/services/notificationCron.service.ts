import cron from 'node-cron';
import prisma from '../lib/prisma';
import { createNotification } from './notification.service';

const DAY_MS = 24 * 60 * 60 * 1000;

async function generateForFarm(farmId: number) {
  const admins = await prisma.user.findMany({
    where: { farmId, role: 'admin', isActive: true },
    select: { id: true },
  });
  if (admins.length === 0) return;
  const adminIds = admins.map((a) => a.id);

  // Preload animals so we can filter Vaccinations by animalId (Vaccination has no farmId)
  const farmAnimals = await prisma.animal.findMany({
    where: { farmId },
    select: { id: true, name: true },
  });
  const animalIds = farmAnimals.map((a) => a.id);
  const animalName = new Map(farmAnimals.map((a) => [a.id, a.name]));

  const today = new Date();
  const in14 = new Date(Date.now() + 14 * DAY_MS);

  // 1. Upcoming births (next 14 days)
  const upcomingBirths = await prisma.breeding.findMany({
    where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { gte: today, lte: in14 } },
    include: { animal: { select: { id: true, name: true } } },
  });
  for (const b of upcomingBirths) {
    if (!b.expectedBirthDate) continue;
    const days = Math.ceil((b.expectedBirthDate.getTime() - Date.now()) / DAY_MS);
    const title = days <= 0
      ? `Calving due today: ${b.animal?.name || 'Animal'}`
      : `Calving in ${days} day${days === 1 ? '' : 's'}: ${b.animal?.name || 'Animal'}`;
    const message = `${b.animal?.name || 'An animal'} is expected to calve on ${b.expectedBirthDate.toISOString().slice(0, 10)}. Prepare a clean calving area.`;
    for (const userId of adminIds) {
      await createNotification({
        userId, farmId,
        type: days <= 3 ? 'danger' : 'warning',
        category: 'calving',
        title, message,
      }).catch(() => undefined);
    }
  }

  // 2. Overdue vaccinations (filtered by animalIds, not farmId)
  if (animalIds.length > 0) {
    const overdueVax = await prisma.vaccination.findMany({
      where: { animalId: { in: animalIds }, nextDueDate: { lt: today } },
    });
    for (const v of overdueVax) {
      const name = animalName.get(v.animalId) || 'An animal';
      const title = `Vaccination overdue: ${v.vaccineName}`;
      const message = `${name} was due for ${v.vaccineName} on ${v.nextDueDate?.toISOString().slice(0, 10) ?? 'an earlier date'}.`;
      for (const userId of adminIds) {
        await createNotification({
          userId, farmId,
          type: 'danger',
          category: 'vaccination',
          title, message,
        }).catch(() => undefined);
      }
    }
  }
}

export async function generateAllNotifications() {
  console.log('[NotificationCron] Generating for all farms...');
  const farms = await prisma.user.findMany({
    where: { role: 'admin', isActive: true, farmId: { not: null } },
    select: { farmId: true },
    distinct: ['farmId'],
  });
  let count = 0;
  for (const f of farms) {
    if (!f.farmId) continue;
    try {
      await generateForFarm(f.farmId);
      count++;
    } catch (err) {
      console.error(`[NotificationCron] Farm ${f.farmId} failed:`, err);
    }
  }
  console.log(`[NotificationCron] Done — processed ${count} farms`);
}

export function scheduleNotificationCron() {
  cron.schedule('0 6 * * *', () => {
    generateAllNotifications().catch((err) => console.error('[NotificationCron] Scheduled run failed:', err));
  });
  console.log('[NotificationCron] Scheduled — runs daily at 06:00');
}

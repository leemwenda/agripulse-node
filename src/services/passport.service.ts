import prisma from '../lib/prisma';

// Generate AgriPulse ID: AP-KE-2026-000001
export async function generateAgripulseId(): Promise<string> {
  const year = new Date().getFullYear();
  const country = 'KE';

  // Count all animals to get next sequence
  const count = await prisma.animal.count();
  const sequence = String(count + 1).padStart(6, '0');

  return `AP-${country}-${year}-${sequence}`;
}

// Get full animal passport (all history)
export async function getAnimalPassport(agripulseId: string) {
  const animal = await prisma.animal.findUnique({
    where: { agripulseId },
    include: {
      farm: { select: { id: true, name: true, email: true } },
      healthRecords: { orderBy: { recordDate: 'desc' } },
      milkProduction: { orderBy: { productionDate: 'desc' } },
      breeding: { orderBy: { serviceDate: 'desc' } },
      weights: { orderBy: { recordedAt: 'desc' } },
      photos: { orderBy: { isPrimary: 'desc' } },
      ownershipTransfers: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'asc' },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
      },
    },
  });

  return animal;
}

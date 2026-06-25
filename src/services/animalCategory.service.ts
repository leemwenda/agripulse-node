import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

function getCategory(gender: string, dateOfBirth: Date): 'calf' | 'heifer' | 'cow' | 'bull_calf' | 'young_bull' | 'bull' {
  const now = new Date();
  const ageMonths = (now.getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (gender === 'female') {
    if (ageMonths < 6)  return 'calf';
    if (ageMonths < 24) return 'heifer';
    return 'cow';
  } else {
    if (ageMonths < 6)  return 'bull_calf';
    if (ageMonths < 24) return 'young_bull';
    return 'bull';
  }
}

export async function updateAllAnimalCategories() {
  const animals = await prisma.animal.findMany({
    select: { id: true, gender: true, dateOfBirth: true }
  });
  let updated = 0;
  for (const animal of animals) {
    const category = getCategory(animal.gender, animal.dateOfBirth);
    await prisma.animal.update({ where: { id: animal.id }, data: { category } });
    updated++;
  }
  console.log(`[AnimalCategory] Updated ${updated} animals at ${new Date().toISOString()}`);
}

export function startAnimalCategoryCron() {
  cron.schedule('0 0 * * *', async () => {
    console.log('[AnimalCategory] Running daily category update...');
    await updateAllAnimalCategories();
  });
  console.log('[AnimalCategory] Cron scheduled — runs daily at midnight');
}

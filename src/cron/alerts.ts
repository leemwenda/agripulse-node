import prisma from '../lib/prisma';
import {
  mailBreedingAlert,
  mailLowMilkAlert,
  mailWeeklyReport,
  mailMonthlyOverview,
  mailVaccinationReminder,
  mailVetAppointmentReminder,
} from '../services/mail.service';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'leemwenda8714@gmail.com';

async function runBreedingAlerts() {
  const today = new Date();
  const in3 = new Date(today); in3.setDate(today.getDate() + 3);
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);

  const overdue = await prisma.breeding.findMany({
    where: { pregnancyStatus: 'pregnant', expectedBirthDate: { lt: today } },
    include: { animal: { select: { name: true, tagNumber: true } } },
  });
  for (const b of overdue) {
    const days = Math.floor((today.getTime() - (b.expectedBirthDate?.getTime() ?? 0)) / 86400000);
    await mailBreedingAlert(b.animal.name, b.animal.tagNumber, `${days} days overdue`, 'overdue');
  }

  const due3 = await prisma.breeding.findMany({
    where: { pregnancyStatus: 'pregnant', expectedBirthDate: { gte: today, lte: in3 } },
    include: { animal: { select: { name: true, tagNumber: true } } },
  });
  for (const b of due3) {
    const days = Math.floor(((b.expectedBirthDate?.getTime() ?? 0) - today.getTime()) / 86400000);
    await mailBreedingAlert(b.animal.name, b.animal.tagNumber, `Due in ${days} days`, 'due3');
  }

  const due7 = await prisma.breeding.findMany({
    where: { pregnancyStatus: 'pregnant', expectedBirthDate: { gt: in3, lte: in7 } },
    include: { animal: { select: { name: true, tagNumber: true } } },
  });
  for (const b of due7) {
    const days = Math.floor(((b.expectedBirthDate?.getTime() ?? 0) - today.getTime()) / 86400000);
    await mailBreedingAlert(b.animal.name, b.animal.tagNumber, `Due in ${days} days`, 'due7');
  }
}

async function runMilkAlerts() {
  const ago7 = new Date(); ago7.setDate(ago7.getDate() - 7);
  const lowMilk = await prisma.milkProduction.groupBy({
    by: ['animalId'],
    where: { productionDate: { gte: ago7 } },
    _avg: { quantityLiters: true },
    having: { quantityLiters: { _avg: { lt: 5 } } },
  });
  for (const m of lowMilk) {
    const animal = await prisma.animal.findFirst({ where: { id: m.animalId, status: 'active' } });
    if (!animal) continue;
    await mailLowMilkAlert(animal.name, Number(m._avg.quantityLiters).toFixed(1));
  }
}

async function runWeeklyReport() {
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const startOfWeek = weekAgo.toISOString().split('T')[0];
  const endOfWeek = today.toISOString().split('T')[0];

  const farms = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });

  for (const farm of farms) {
    const farmId = farm.farmId ?? farm.id;

    const [
      totalAnimals, weekMilk, healthRecords,
      pregnantCount, overdueCount, weekFinance, topCow,
    ] = await Promise.all([
      prisma.animal.count({ where: { farmId, status: 'active' } }),
      prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: weekAgo } }, _sum: { quantityLiters: true } }),
      prisma.healthRecord.count({ where: { farmId, recordDate: { gte: weekAgo } } }),
      prisma.breeding.count({ where: { farmId, pregnancyStatus: 'pregnant' } }),
      prisma.breeding.count({ where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { lt: today } } }),
      prisma.financialTransaction.groupBy({ by: ['type'], where: { farmId, transactionDate: { gte: weekAgo } }, _sum: { amount: true } }),
      prisma.milkProduction.groupBy({ by: ['animalId'], where: { farmId, productionDate: { gte: weekAgo } }, _sum: { quantityLiters: true }, orderBy: { _sum: { quantityLiters: 'desc' } }, take: 1 }),
    ]);

    const weekMilkTotal = Number(weekMilk._sum.quantityLiters ?? 0);
    const weekIncome = Number(weekFinance.find(f => f.type === 'income')?._sum.amount ?? 0);
    const weekExpense = Number(weekFinance.find(f => f.type === 'expense')?._sum.amount ?? 0);

    let topCowName = 'N/A';
    let topCowLiters = 0;
    if (topCow.length > 0) {
      const animal = await prisma.animal.findFirst({ where: { id: topCow[0].animalId }, select: { name: true } });
      topCowName = animal?.name ?? 'N/A';
      topCowLiters = Number(topCow[0]._sum.quantityLiters ?? 0);
    }

    await mailWeeklyReport(farm.email, farm.name, {
      totalAnimals,
      weekMilk: weekMilkTotal,
      avgDaily: weekMilkTotal / 7,
      healthRecords,
      pregnantCount,
      overdueCount,
      weekIncome,
      weekExpense,
      topCow: topCowName,
      topCowLiters,
      weekStart: startOfWeek,
      weekEnd: endOfWeek,
    });
  }
}

async function runMonthlyOverview() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthName = today.toLocaleString('en-KE', { month: 'long', year: 'numeric' });

  const farms = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });

  for (const farm of farms) {
    const farmId = farm.farmId ?? farm.id;

    const [
      totalAnimals, monthMilk, healthRecords,
      vaccinations, birthsThisMonth, pregnantCount,
      monthFinance, topCow, newAnimals,
    ] = await Promise.all([
      prisma.animal.count({ where: { farmId, status: 'active' } }),
      prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: startOfMonth } }, _sum: { quantityLiters: true } }),
      prisma.healthRecord.count({ where: { farmId, recordDate: { gte: startOfMonth } } }),
      prisma.healthRecord.count({ where: { farmId, recordDate: { gte: startOfMonth }, vaccination: { not: null } } }),
      prisma.breeding.count({ where: { farmId, pregnancyStatus: 'gave_birth', actualBirthDate: { gte: startOfMonth } } }),
      prisma.breeding.count({ where: { farmId, pregnancyStatus: 'pregnant' } }),
      prisma.financialTransaction.groupBy({ by: ['type'], where: { farmId, transactionDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.milkProduction.groupBy({ by: ['animalId'], where: { farmId, productionDate: { gte: startOfMonth } }, _sum: { quantityLiters: true }, orderBy: { _sum: { quantityLiters: 'desc' } }, take: 1 }),
      prisma.animal.count({ where: { farmId, createdAt: { gte: startOfMonth } } }),
    ]);

    const monthMilkTotal = Number(monthMilk._sum.quantityLiters ?? 0);
    const daysInMonth = today.getDate();
    const monthIncome = Number(monthFinance.find(f => f.type === 'income')?._sum.amount ?? 0);
    const monthExpense = Number(monthFinance.find(f => f.type === 'expense')?._sum.amount ?? 0);

    let topCowName = 'N/A';
    let topCowLiters = 0;
    if (topCow.length > 0) {
      const animal = await prisma.animal.findFirst({ where: { id: topCow[0].animalId }, select: { name: true } });
      topCowName = animal?.name ?? 'N/A';
      topCowLiters = Number(topCow[0]._sum.quantityLiters ?? 0);
    }

    await mailMonthlyOverview(farm.email, farm.name, {
      month: monthName,
      totalAnimals,
      monthMilk: monthMilkTotal,
      avgDailyMilk: monthMilkTotal / daysInMonth,
      healthRecords,
      vaccinations,
      birthsThisMonth,
      pregnantCount,
      monthIncome,
      monthExpense,
      topCow: topCowName,
      topCowLiters,
      newAnimals,
    });
  }
}

async function runVaccinationReminders() {
  const today = new Date();
  const in3 = new Date(today); in3.setDate(today.getDate() + 3);
  const in7 = new Date(today); in7.setDate(today.getDate() + 7);

  const dueSoon = await prisma.vaccination.findMany({
    where: { nextDueDate: { gte: today, lte: in7 } },
    include: {
      animal: { select: { name: true, tagNumber: true } },
      farmer: { select: { email: true, name: true } },
    },
  });
  for (const v of dueSoon) {
    if (!v.nextDueDate) continue;
    const days = Math.floor((v.nextDueDate.getTime() - today.getTime()) / 86400000);
    const urgency = v.nextDueDate <= in3 ? 'due3' : 'due7';
    await mailVaccinationReminder(
      v.farmer.email, v.farmer.name, v.animal.name, v.animal.tagNumber,
      v.vaccineName, `${days} day${days !== 1 ? 's' : ''}`, urgency
    );
  }

  const overdue = await prisma.vaccination.findMany({
    where: { nextDueDate: { lt: today } },
    include: {
      animal: { select: { name: true, tagNumber: true } },
      farmer: { select: { email: true, name: true } },
    },
  });
  for (const v of overdue) {
    if (!v.nextDueDate) continue;
    const days = Math.floor((today.getTime() - v.nextDueDate.getTime()) / 86400000);
    await mailVaccinationReminder(
      v.farmer.email, v.farmer.name, v.animal.name, v.animal.tagNumber,
      v.vaccineName, `${days} day${days !== 1 ? 's' : ''} overdue`, 'overdue'
    );
  }
}

async function runVetAppointmentReminders() {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const appointments = await prisma.vetAppointment.findMany({
    where: { status: 'confirmed', slot: { date: new Date(tomorrowStr) } },
    include: {
      farmer: { select: { email: true, name: true } },
      vet: { include: { user: { select: { name: true } } } },
      slot: true,
    },
  });
  for (const appt of appointments) {
    await mailVetAppointmentReminder(
      appt.farmer.email, appt.farmer.name, appt.vet.user.name,
      appt.serviceType, tomorrowStr, `${appt.slot.startTime}-${appt.slot.endTime}`
    );
  }
}

async function main() {
  const arg = process.argv[2];
  console.log(`[Cron] Running: ${arg || 'daily'}`);

  if (arg === 'weekly') {
    await runWeeklyReport();
  } else if (arg === 'monthly') {
    await runMonthlyOverview();
  } else if (arg === 'vaccinations') {
    await runVaccinationReminders();
  } else if (arg === 'appointments') {
    await runVetAppointmentReminders();
  } else {
    await runBreedingAlerts();
    await runMilkAlerts();
  }

  console.log('[Cron] Complete.');
  await prisma.$disconnect();
}

main().catch(console.error);

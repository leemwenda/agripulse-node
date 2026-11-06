import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireFarmer, getFarmId } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireFarmer);

function parseRange(req: Request): { from: Date; to: Date } {
  // Default: last 365 days — preserves the old (all-time-ish) website behavior
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const defaultTo = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const from = req.query.from ? new Date(String(req.query.from)) : defaultFrom;
  const to = req.query.to ? new Date(String(req.query.to)) : defaultTo;
  return { from, to };
}

// ─── Animals ─────────────────────────────────────────────────────────
router.get('/animals', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const [total, byStatusRaw, byCategoryRaw, byGenderRaw, byBreedRaw] = await Promise.all([
    prisma.animal.count({ where: { farmId } }),
    prisma.animal.groupBy({ by: ['status'], where: { farmId }, _count: { _all: true } }),
    prisma.animal.groupBy({ by: ['category'], where: { farmId }, _count: { _all: true } }),
    prisma.animal.groupBy({ by: ['gender'], where: { farmId }, _count: { _all: true } }),
    prisma.animal.groupBy({ by: ['breed'], where: { farmId }, _count: { _all: true } }),
  ]);
  res.json({
    total,
    byStatus: byStatusRaw.map((r) => ({ status: r.status, count: r._count._all })),
    byCategory: byCategoryRaw.map((r) => ({ category: r.category || 'unclassified', count: r._count._all })),
    byGender: byGenderRaw.map((r) => ({ gender: r.gender, count: r._count._all })),
    byBreed: byBreedRaw
      .map((r) => ({ breed: r.breed, count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  });
});

// ─── Milk (merged: recent + totalLitres for mobile, topProducers/trend shared) ──
router.get('/milk', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const { from, to } = parseRange(req);
  const [topProducers, recent, monthGroups] = await Promise.all([
    prisma.milkProduction.groupBy({
      by: ['animalId'],
      where: { farmId, productionDate: { gte: from, lte: to } },
      _sum: { quantityLiters: true },
      _count: { id: true },
      orderBy: { _sum: { quantityLiters: 'desc' } },
      take: 10,
    }),
    prisma.milkProduction.findMany({
      where: { farmId, productionDate: { gte: from, lte: to } },
      include: { animal: { select: { name: true } }, recordedByUser: { select: { name: true } } },
      orderBy: { productionDate: 'desc' },
      take: 20,
    }),
    prisma.$queryRaw<Array<{ month: string; total: string }>>`
      SELECT DATE_FORMAT(production_date, '%Y-%m') as month, SUM(quantity_liters) as total
      FROM milk_production WHERE farm_id = ${farmId}
        AND production_date >= ${from} AND production_date <= ${to}
      GROUP BY month ORDER BY month ASC
    `,
  ]);
  const animalIds = topProducers.map((p) => p.animalId);
  const animals = animalIds.length > 0
    ? await prisma.animal.findMany({ where: { id: { in: animalIds } }, select: { id: true, name: true, tagNumber: true } })
    : [];
  const totalLitres = monthGroups.reduce((s, m) => s + Number(m.total || 0), 0);
  res.json({
    // new fields (mobile)
    totalLitres,
    topProducers: topProducers.map((p) => ({
      animalId: p.animalId,
      _sum: { quantityLiters: Number(p._sum.quantityLiters || 0) },
      _count: { id: p._count.id },
      animal: animals.find((a) => a.id === p.animalId) || null,
    })),
    trend: monthGroups.map((m) => ({ month: m.month, total: Number(m.total || 0) })),
    // old fields (website)
    recent: recent.map((r) => ({
      ...r,
      quantityLiters: String(r.quantityLiters),
    })),
  });
});

// ─── Health (merged: topConditions/topVaccinations for mobile, recent/commonConditions for website) ──
router.get('/health', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const { from, to } = parseRange(req);
  const [total, conditionGroups, vaccinationGroups, recent] = await Promise.all([
    prisma.healthRecord.count({ where: { farmId, recordDate: { gte: from, lte: to } } }),
    prisma.healthRecord.groupBy({
      by: ['condition'],
      where: { farmId, recordDate: { gte: from, lte: to } },
      _count: { _all: true },
      orderBy: { _count: { condition: 'desc' } },
      take: 10,
    }),
    prisma.healthRecord.groupBy({
      by: ['vaccination'],
      where: { farmId, recordDate: { gte: from, lte: to }, vaccination: { not: null } },
      _count: { _all: true },
    }),
    prisma.healthRecord.findMany({
      where: { farmId, recordDate: { gte: from, lte: to } },
      include: { animal: { select: { name: true } } },
      orderBy: { recordDate: 'desc' },
      take: 20,
    }),
  ]);
  const commonConditions = conditionGroups.map((r) => ({ condition: r.condition, count: r._count._all }));
  res.json({
    totalRecords: total,
    topConditions: commonConditions,
    topVaccinations: vaccinationGroups
      .filter((r) => r.vaccination)
      .map((r) => ({ vaccination: r.vaccination as string, count: r._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    // old fields (website)
    recent,
    commonConditions,
  });
});

// ─── Breeding (merged: byStatus/upcomingBirths for mobile, records/upcoming for website) ──
router.get('/breeding', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const { from, to } = parseRange(req);
  const [total, statusGroups, records, upcoming] = await Promise.all([
    prisma.breeding.count({ where: { farmId, serviceDate: { gte: from, lte: to } } }),
    prisma.breeding.groupBy({
      by: ['pregnancyStatus'],
      where: { farmId, serviceDate: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.breeding.findMany({
      where: { farmId, serviceDate: { gte: from, lte: to } },
      include: { animal: { select: { name: true } } },
      orderBy: { serviceDate: 'desc' },
      take: 20,
    }),
    prisma.breeding.findMany({
      where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { gte: new Date() } },
      orderBy: { expectedBirthDate: 'asc' },
      take: 10,
      include: { animal: { select: { name: true, tagNumber: true } } },
    }),
  ]);
  const upcomingBirths = upcoming.map((b) => ({
    id: b.id,
    animal: b.animal,
    expectedBirthDate: b.expectedBirthDate,
    daysUntil: b.expectedBirthDate ? Math.ceil((b.expectedBirthDate.getTime() - Date.now()) / 86400000) : null,
  }));
  res.json({
    totalRecords: total,
    byStatus: statusGroups.map((r) => ({ status: r.pregnancyStatus, count: r._count._all })),
    upcomingBirths,
    // old fields (website)
    records,
    upcoming,
  });
});

// ─── Finance ────────────────────────────────────────────────────────
router.get('/finance', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const { from, to } = parseRange(req);
  const [incomeAgg, expenseAgg, categoryGroups, monthGroups] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { farmId, type: 'income', transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { farmId, type: 'expense', transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ['category', 'type'],
      where: { farmId, transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<Array<{ month: string; type: string; total: string }>>`
      SELECT DATE_FORMAT(transaction_date, '%Y-%m') as month, type, SUM(amount) as total
      FROM financial_transactions WHERE farm_id = ${farmId}
        AND transaction_date >= ${from} AND transaction_date <= ${to}
      GROUP BY month, type ORDER BY month ASC
    `,
  ]);
  const income = Number(incomeAgg._sum.amount || 0);
  const expense = Number(expenseAgg._sum.amount || 0);
  res.json({
    totalIncome: income,
    totalExpense: expense,
    profit: income - expense,
    byCategory: categoryGroups.map((r) => ({
      category: r.category,
      type: r.type,
      total: Number(r._sum.amount || 0),
    })),
    trend: monthGroups.map((m) => ({ month: m.month, type: m.type, total: Number(m.total || 0) })),
  });
});

export default router;

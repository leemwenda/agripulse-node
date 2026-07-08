import { Router, Request, Response } from 'express';
import { z } from 'zod';
// ── Groq API helper (same service as PHP version) ────────────
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY   = process.env.GROQ_API_KEY;
if (!GROQ_KEY) { console.error('[AI Advisor] GROQ_API_KEY is not set — AI Advisor will fail until it is configured in .env'); }
const GROQ_MODEL = process.env.GROQ_MODEL   || 'llama-3.3-70b-versatile';

async function callGroq(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}
import prisma from '../lib/prisma';
import { mailIssueSubmitted, mailAdminIssueSubmitted, mailIssueResolved, mailAnnouncement } from '../services/mail.service';
import { requireAuth, requireAdmin, requireSuperAdmin, getFarmId } from '../middleware/auth.middleware';

// ── DASHBOARD ────────────────────────────────────────────────
export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const today = new Date(now.toISOString().split('T')[0]);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const thirtyDaysFromNow = new Date(today); thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [
    totalAnimals, femaleAnimals, maleAnimals,
    todayMilk, monthMilk,
    activePregnant,
    monthIncome, monthExpense,
    upcomingBirths, recentHealth, topProducers,
    weeklyTrend, recentTx,
  ] = await Promise.all([
    prisma.animal.count({ where: { farmId, status: 'active' } }),
    prisma.animal.count({ where: { farmId, status: 'active', gender: 'female' } }),
    prisma.animal.count({ where: { farmId, status: 'active', gender: 'male' } }),
    prisma.milkProduction.aggregate({ where: { farmId, productionDate: today }, _sum: { quantityLiters: true } }),
    prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: startOfMonth, lte: endOfMonth } }, _sum: { quantityLiters: true } }),
    prisma.breeding.count({ where: { farmId, pregnancyStatus: 'pregnant' } }),
    prisma.financialTransaction.aggregate({ where: { farmId, type: 'income', transactionDate: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { farmId, type: 'expense', transactionDate: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
    prisma.breeding.findMany({
      where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { gte: today, lte: thirtyDaysFromNow } },
      include: { animal: { select: { name: true, tagNumber: true } } },
      orderBy: { expectedBirthDate: 'asc' },
      take: 5,
    }),
    prisma.healthRecord.findMany({
      where: { farmId, recordDate: { gte: weekAgo } },
      include: { animal: { select: { name: true } } },
      orderBy: { recordDate: 'desc' },
      take: 5,
    }),
    prisma.milkProduction.groupBy({
      by: ['animalId'],
      where: { farmId, productionDate: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { quantityLiters: true },
      orderBy: { _sum: { quantityLiters: 'desc' } },
      take: 5,
    }),
    prisma.milkProduction.groupBy({
      by: ['productionDate'],
      where: { farmId, productionDate: { gte: weekAgo, lte: today } },
      _sum: { quantityLiters: true },
      orderBy: { productionDate: 'asc' },
    }),
    prisma.financialTransaction.findMany({
      where: { farmId },
      orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
      take: 5,
    }),
  ]);

  // Hydrate top producers with animal names
  const topProducerIds = topProducers.map(p => p.animalId);
  const producerAnimals = await prisma.animal.findMany({
    where: { id: { in: topProducerIds } },
    select: { id: true, name: true, tagNumber: true },
  });
  const enrichedProducers = topProducers.map(p => ({
    ...p,
    animal: producerAnimals.find(a => a.id === p.animalId),
  }));

  const income = Number(monthIncome._sum.amount || 0);
  const expense = Number(monthExpense._sum.amount || 0);

  res.json({
    stats: {
      totalAnimals, femaleAnimals, maleAnimals,
      todayMilk: Number(todayMilk._sum.quantityLiters || 0),
      monthMilk: Number(monthMilk._sum.quantityLiters || 0),
      activePregnant,
      monthIncome: income,
      monthExpense: expense,
      monthProfit: income - expense,
    },
    upcomingBirths,
    recentHealth,
    topProducers: enrichedProducers,
    weeklyTrend,
    recentTransactions: recentTx,
  });
});

// ── WORKERS ──────────────────────────────────────────────────
export const workersRouter = Router();
workersRouter.use(requireAuth);

const workerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  hireDate: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

workersRouter.get('/', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const workers = await prisma.user.findMany({
    where: { farmId, role: 'worker' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ workers });
});

workersRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = workerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
  if (!parsed.data.password) { res.status(400).json({ error: 'Password is required for new workers.' }); return; }

  const farmId = getFarmId(req.user!);
  const bcrypt = await import('bcryptjs');
  const hashed = await bcrypt.default.hash(parsed.data.password, 12);

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) { res.status(409).json({ error: 'Email already in use.' }); return; }

  const worker = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: 'worker',
      farmId,
      isActive: parsed.data.status === 'active',
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  res.status(201).json({ worker });
});

workersRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const existing = await prisma.user.findFirst({ where: { id: parseInt(String(req.params.id)), farmId, role: 'worker' } });
  if (!existing) { res.status(404).json({ error: 'Worker not found' }); return; }
  const parsed = workerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

  const updateData: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email,
    isActive: parsed.data.status === 'active',
  };
  if (parsed.data.password) {
    const bcrypt = await import('bcryptjs');
    updateData.password = await bcrypt.default.hash(parsed.data.password, 12);
  }

  const worker = await prisma.user.update({
    where: { id: existing.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  res.json({ worker });
});

workersRouter.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const existing = await prisma.user.findFirst({ where: { id: parseInt(String(req.params.id)), farmId, role: 'worker' } });
  if (!existing) { res.status(404).json({ error: 'Worker not found' }); return; }
  await prisma.user.delete({ where: { id: existing.id } });
  res.json({ message: 'Worker removed.' });
});

// ── AI ADVISOR ───────────────────────────────────────────────
export const aiRouter = Router();
aiRouter.use(requireAuth);


aiRouter.get('/sessions', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const sessions = await prisma.aiChatSession.findMany({
    where: { farmId, userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    take: 30,
  });
  res.json({ sessions });
});

aiRouter.post('/sessions', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const session = await prisma.aiChatSession.create({
    data: { farmId, userId: req.user!.id, title: 'New Conversation' },
  });
  res.status(201).json({ session });
});

aiRouter.delete('/sessions/:id', async (req: Request, res: Response): Promise<void> => {
  const session = await prisma.aiChatSession.findFirst({
    where: { id: parseInt(String(req.params.id)), userId: req.user!.id },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  await prisma.aiChatSession.delete({ where: { id: session.id } });
  res.json({ message: 'Session deleted.' });
});

aiRouter.get('/sessions/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const session = await prisma.aiChatSession.findFirst({
    where: { id: parseInt(String(req.params.id)), userId: req.user!.id },
    include: { conversations: { orderBy: { id: 'asc' } } },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  res.json({ messages: session.conversations });
});

// ── Helper: build rich farm context string (ported from PHP ai_context.php) ──
async function buildFarmContext(farmId: number, userName: string): Promise<string> {
  const today = new Date();
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    animalStats, breeds, milk7, milk30, topCows,
    healthStats, recentHealth, breedingStats,
    overdueBirths, upcomingBirths, finance30, financeMonth,
  ] = await Promise.all([
    // Herd summary
    prisma.animal.aggregate({
      where: { farmId },
      _count: { id: true },
    }).then(async r => {
      const active  = await prisma.animal.count({ where: { farmId, status: 'active' } });
      const females = await prisma.animal.count({ where: { farmId, status: 'active', gender: 'female' } });
      const males   = await prisma.animal.count({ where: { farmId, status: 'active', gender: 'male' } });
      const sold    = await prisma.animal.count({ where: { farmId, status: 'sold' } });
      const deceased = await prisma.animal.count({ where: { farmId, status: 'deceased' } });
      return { total: r._count.id, active, females, males, sold, deceased };
    }),
    // Breeds
    prisma.animal.groupBy({
      by: ['breed'],
      where: { farmId, status: 'active' },
      _count: { breed: true },
      orderBy: { _count: { breed: 'desc' } },
      take: 5,
    }),
    // Milk 7 days
    prisma.milkProduction.aggregate({
      where: { farmId, productionDate: { gte: sevenDaysAgo } },
      _sum: { quantityLiters: true },
      _avg: { quantityLiters: true },
      _count: { id: true },
    }).then(async r => ({
      ...r,
      cows: await prisma.milkProduction.findMany({ where: { farmId, productionDate: { gte: sevenDaysAgo } }, distinct: ['animalId'], select: { animalId: true } }).then(a => a.length),
    })),
    // Milk 30 days
    prisma.milkProduction.aggregate({
      where: { farmId, productionDate: { gte: thirtyDaysAgo } },
      _sum: { quantityLiters: true },
    }),
    // Top cow producers (30d)
    prisma.milkProduction.groupBy({
      by: ['animalId'],
      where: { farmId, productionDate: { gte: thirtyDaysAgo } },
      _sum: { quantityLiters: true },
      orderBy: { _sum: { quantityLiters: 'desc' } },
      take: 5,
    }).then(async rows => {
      const ids = rows.map(r => r.animalId);
      const animals = await prisma.animal.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
      return rows.map(r => ({ name: animals.find(a => a.id === r.animalId)?.name ?? 'Unknown', liters: Number(r._sum.quantityLiters ?? 0).toFixed(1) }));
    }),
    // Health stats
    prisma.healthRecord.aggregate({ where: { farmId }, _count: { id: true } }).then(async r => ({
      total: r._count.id,
      recent: await prisma.healthRecord.count({ where: { farmId, recordDate: { gte: thirtyDaysAgo } } }),
    })),
    // Recent health records
    prisma.healthRecord.findMany({
      where: { farmId },
      orderBy: { recordDate: 'desc' },
      take: 5,
      include: { animal: { select: { name: true } } },
    }),
    // Breeding status
    prisma.breeding.groupBy({
      by: ['pregnancyStatus'],
      where: { farmId },
      _count: { pregnancyStatus: true },
    }).then(rows => ({
      pregnant:   rows.find(r => r.pregnancyStatus === 'pregnant')?._count.pregnancyStatus ?? 0,
      pending:    rows.find(r => r.pregnancyStatus === 'pending')?._count.pregnancyStatus ?? 0,
      gave_birth: rows.find(r => r.pregnancyStatus === 'gave_birth')?._count.pregnancyStatus ?? 0,
    })),
    // Overdue births
    prisma.breeding.findMany({
      where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { lt: today } },
      include: { animal: { select: { name: true } } },
      orderBy: { expectedBirthDate: 'asc' },
    }),
    // Upcoming births (30 days)
    prisma.breeding.findMany({
      where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { gte: today, lte: new Date(today.getTime() + 30 * 86400000) } },
      include: { animal: { select: { name: true } } },
      orderBy: { expectedBirthDate: 'asc' },
      take: 5,
    }),
    // Finance 30 days
    prisma.financialTransaction.groupBy({
      by: ['type'],
      where: { farmId, transactionDate: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    }).then(rows => ({
      income:  Number(rows.find(r => r.type === 'income')?._sum.amount ?? 0),
      expense: Number(rows.find(r => r.type === 'expense')?._sum.amount ?? 0),
    })),
    // Finance this month
    prisma.financialTransaction.groupBy({
      by: ['type'],
      where: { farmId, transactionDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }).then(rows => ({
      income:  Number(rows.find(r => r.type === 'income')?._sum.amount ?? 0),
      expense: Number(rows.find(r => r.type === 'expense')?._sum.amount ?? 0),
    })),
  ]);

  const breedsStr = breeds.map(b => `${b.breed} (${b._count.breed})`).join(', ') || 'none recorded';
  const profit30  = finance30.income - finance30.expense;
  const profitMon = financeMonth.income - financeMonth.expense;
  const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = today.toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  let ctx = `=== FARM DATA for ${userName} | Today: ${dateStr} ===\n\n`;

  ctx += `HERD:\n`;
  ctx += `- Total: ${animalStats.total} | Active: ${animalStats.active} (Females: ${animalStats.females}, Males: ${animalStats.males}) | Sold: ${animalStats.sold} | Deceased: ${animalStats.deceased}\n`;
  ctx += `- Breeds: ${breedsStr}\n\n`;

  ctx += `MILK PRODUCTION:\n`;
  ctx += `- Last 7 days: ${Number(milk7._sum.quantityLiters ?? 0).toFixed(1)}L total | ${Number(milk7._avg.quantityLiters ?? 0).toFixed(1)}L avg/entry | ${milk7.cows} cows recorded\n`;
  ctx += `- Last 30 days: ${Number(milk30._sum.quantityLiters ?? 0).toFixed(1)}L\n`;
  if (topCows.length) ctx += `- Top producers (30d): ${topCows.map(c => `${c.name} (${c.liters}L)`).join(', ')}\n`;
  ctx += `\n`;

  ctx += `ANIMAL HEALTH:\n`;
  ctx += `- Records: ${healthStats.total} total | ${healthStats.recent} in last 30 days\n`;
  if (recentHealth.length) {
    recentHealth.forEach(h => {
      ctx += `- ${h.animal?.name ?? 'Unknown'}: ${h.condition} on ${h.recordDate.toISOString().split('T')[0]}${h.treatment ? ` — tx: ${h.treatment}` : ''}\n`;
    });
  } else {
    ctx += `- No recent health incidents\n`;
  }
  ctx += `\n`;

  ctx += `BREEDING:\n`;
  ctx += `- Pregnant: ${breedingStats.pregnant} | Pending confirmation: ${breedingStats.pending} | Gave birth: ${breedingStats.gave_birth}\n`;
  overdueBirths.forEach(b => {
    const daysOverdue = Math.floor((today.getTime() - (b.expectedBirthDate?.getTime() ?? 0)) / 86400000);
    ctx += `- !! OVERDUE BIRTH: ${b.animal?.name ?? 'Unknown'} was due ${b.expectedBirthDate?.toISOString().split('T')[0]} (${daysOverdue} days overdue) — needs urgent attention\n`;
  });
  upcomingBirths.forEach(b => {
    const daysLeft = Math.floor(((b.expectedBirthDate?.getTime() ?? 0) - today.getTime()) / 86400000);
    ctx += `- Upcoming: ${b.animal?.name ?? 'Unknown'} due ${b.expectedBirthDate?.toISOString().split('T')[0]} (in ${daysLeft} days)\n`;
  });
  if (!overdueBirths.length && !upcomingBirths.length) ctx += `- No births due soon\n`;
  ctx += `\n`;

  ctx += `FINANCES:\n`;
  ctx += `- Last 30 days: Income KSh ${fmt(finance30.income)} | Expenses KSh ${fmt(finance30.expense)} | Net KSh ${fmt(profit30)}\n`;
  ctx += `- This month: Income KSh ${fmt(financeMonth.income)} | Expenses KSh ${fmt(financeMonth.expense)} | Net KSh ${fmt(profitMon)}\n`;

  return ctx;
}

// ── Helper: build system prompt ──────────────────────────────
async function buildSystemPrompt(farmId: number, userName: string): Promise<string> {
  const firstName = userName.split(' ')[0];
  const ctx = await buildFarmContext(farmId, userName);
  return `You are AgriPulse AI, a personal agricultural assistant for ${firstName}. You have access to this farm's live data below.

${ctx}

YOUR EXPERTISE:
- Dairy and livestock management (cattle, goats, sheep, pigs, poultry)
- Animal health, disease prevention and treatment
- Breeding programmes, pregnancy management and calving
- Milk production optimisation and yield analysis
- Farm financial management and profitability
- Kenyan agricultural context (climate zones, local breeds, markets, regulations, seasons)
- Pasture and feed management
- Record-keeping best practices

RULES:
- Always respond in English only.
- Address the farmer by their first name: ${firstName}
- Only reference the farm data shown above — never invent or estimate figures not shown
- Be concise, practical, and actionable — farmers are busy
- Use **bold** for key terms, bullet lists for steps
- Use KSh for all currency
- Be professional, warm, and encouraging
- Do not use emojis
- If the farm has no data yet in a category, acknowledge it and give practical advice on what to record first
- If asked about topics outside farming and agriculture, politely redirect`;
}

// ── Quick action prompt map (ported from PHP) ─────────────────
const QUICK_PROMPTS: Record<string, string> = {
  yield_predict:    'Based on the last 7 days of milk production data for my farm, predict likely yield for the next 7 days. Identify any cows at risk of low production and give me 2-3 specific actions I can take to improve yield.',
  health_check:     'Do a full health review of my herd. Highlight any overdue vaccinations, animals with recent health issues, any concerning patterns, and give me a priority action list.',
  financial_check:  "Summarise my farm's financial performance this month. What are my biggest expenses? Am I profitable? Give me 2-3 specific ways to improve my margins.",
  breeding_check:   'Review my breeding records. Are there any overdue births? Which animals are pregnant and when should I expect calving? What should I prepare for?',
  farm_summary:     'Give me a complete farm health report — cover animals, milk production, health, breeding, and finances. Highlight the top 3 things I should act on today.',
};

aiRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  const { sessionId, message, quickAction } = z.object({
    sessionId:   z.number(),
    message:     z.string().min(1).optional(),
    quickAction: z.string().optional(),
  }).parse(req.body);

  const session = await prisma.aiChatSession.findFirst({
    where: { id: sessionId, userId: req.user!.id },
    include: { conversations: { orderBy: { id: 'asc' } } },
  });
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  const farmId = getFarmId(req.user!);
  const userName = req.user!.name;

  // Resolve message — quick action overrides message
  const userMessage = quickAction && QUICK_PROMPTS[quickAction]
    ? QUICK_PROMPTS[quickAction]
    : (message ?? '');

  if (!userMessage) { res.status(400).json({ error: 'No message provided' }); return; }

  const systemPrompt = await buildSystemPrompt(farmId, userName);

  const history = session.conversations.slice(-20).map(c => ({
    role: c.role as 'user' | 'assistant',
    content: c.message,
  }));

  // Save user message
  await prisma.aiConversation.create({ data: { sessionId, role: 'user', message: userMessage } });

  const reply = await callGroq(systemPrompt, [...history, { role: 'user', content: userMessage }]);

  // Save assistant response
  await prisma.aiConversation.create({ data: { sessionId, role: 'assistant', message: reply } });

  // Update session title from first message
  if (session.conversations.length === 0) {
    const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? '...' : '');
    await prisma.aiChatSession.update({ where: { id: sessionId }, data: { title } });
  } else {
    await prisma.aiChatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
  }

  res.json({ reply, displayMessage: quickAction ? userMessage : undefined });
});

// ── AI sidebar context (farm stats for the UI) ────────────────
aiRouter.get('/context', async (req: Request, res: Response) => {
  const farmId  = getFarmId(req.user!);
  const today   = new Date();
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);

  const [animals, milk7, health, breeding] = await Promise.all([
    prisma.animal.count({ where: { farmId, status: 'active' } }),
    prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: sevenDaysAgo } }, _sum: { quantityLiters: true } }),
    prisma.healthRecord.count({ where: { farmId } }),
    prisma.breeding.count({ where: { farmId } }),
  ]);

  res.json({
    animals,
    milk7: Number(milk7._sum.quantityLiters ?? 0).toFixed(1),
    health,
    breeding,
  });
});

// ── ADMIN ────────────────────────────────────────────────────
export const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperAdmin);

adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  const [totalFarms, totalUsers, totalAnimals, openIssues] = await Promise.all([
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count(),
    prisma.animal.count({ where: { status: 'active' } }),
    prisma.systemIssue.count({ where: { status: 'open' } }),
  ]);
  const recentFarms = await prisma.user.findMany({
    where: { role: 'admin' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true, email: true, isActive: true, registrationStatus: true, createdAt: true },
  });
  res.json({ stats: { totalFarms, totalUsers, totalAnimals, openIssues }, recentFarms });
});

adminRouter.get('/users', async (req: Request, res: Response) => {
  const { role, status, search, page = '1' } = req.query;
  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (search) where.OR = [{ name: { contains: search as string } }, { email: { contains: search as string } }];
  const skip = (parseInt(page as string) - 1) * 20;
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, skip, take: 20, orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, isActive: true, registrationStatus: true, lastLogin: true, createdAt: true, farmId: true },
    }),
  ]);
  res.json({ users, total });
});

adminRouter.put('/users/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { isActive, registrationStatus } = req.body;
  const user = await prisma.user.update({
    where: { id: parseInt(String(req.params.id)) },
    data: { isActive, registrationStatus },
  });
  res.json({ user });
});

adminRouter.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  const userId = parseInt(String(req.params.id));

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) { res.status(404).json({ message: 'User not found.' }); return; }
  if (target.role === 'superadmin') { res.status(403).json({ message: 'Cannot delete a superadmin account.' }); return; }

  try {
    const summary = await prisma.$transaction(async (tx) => {
      // Workers attached to this farm (if target is a farm/admin owner) get wiped too
      const workers = await tx.user.findMany({ where: { farmId: userId, id: { not: userId } }, select: { id: true } });
      const workerIds = workers.map(w => w.id);
      const allIds = [userId, ...workerIds];

      // Animals owned by this farm, plus everything that hangs off them
      const animals = await tx.animal.findMany({ where: { farmId: userId }, select: { id: true } });
      const animalIds = animals.map(a => a.id);

      let milkDeleted = 0, healthDeleted = 0, breedingDeleted = 0;
      if (animalIds.length) {
        milkDeleted = (await tx.milkProduction.deleteMany({ where: { animalId: { in: animalIds } } })).count;
        healthDeleted = (await tx.healthRecord.deleteMany({ where: { animalId: { in: animalIds } } })).count;
        breedingDeleted = (await tx.breeding.deleteMany({ where: { animalId: { in: animalIds } } })).count;
        await tx.animal.deleteMany({ where: { id: { in: animalIds } } });
      }

      const financeDeleted = (await tx.financialTransaction.deleteMany({ where: { farmId: userId } })).count;

      // Records this user (or its workers) personally logged that weren't covered above
      await tx.milkProduction.deleteMany({ where: { recordedBy: { in: allIds } } });
      await tx.healthRecord.deleteMany({ where: { recordedBy: { in: allIds } } });
      await tx.breeding.deleteMany({ where: { recordedBy: { in: allIds } } });
      await tx.financialTransaction.deleteMany({ where: { recordedBy: { in: allIds } } });

      // Issues, announcements, feature flag edits, activity/login history
      await tx.systemIssue.deleteMany({ where: { reportedBy: { in: allIds } } });
      await tx.systemIssue.updateMany({ where: { resolvedBy: { in: allIds } }, data: { resolvedBy: null } });
      await tx.systemAnnouncement.deleteMany({ where: { createdBy: { in: allIds } } });
      await tx.featureFlag.updateMany({ where: { updatedBy: { in: allIds } }, data: { updatedBy: null } });
      await tx.activityLog.updateMany({ where: { userId: { in: allIds } }, data: { userId: null } });
      await tx.loginAttempt.updateMany({ where: { userId: { in: allIds } }, data: { userId: null } });
      await tx.rememberToken.deleteMany({ where: { userId: { in: allIds } } });
      await tx.emailVerification.deleteMany({ where: { userId: { in: allIds } } });

      // AI advisor chat history
      const sessions = await tx.aiChatSession.findMany({ where: { userId: { in: allIds } }, select: { id: true } });
      const sessionIds = sessions.map(s => s.id);
      if (sessionIds.length) await tx.aiConversation.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.aiChatSession.deleteMany({ where: { userId: { in: allIds } } });

      // Workers go before the farm owner itself
      if (workerIds.length) await tx.user.deleteMany({ where: { id: { in: workerIds } } });
      await tx.user.delete({ where: { id: userId } });

      return {
        workersDeleted: workerIds.length,
        animalsDeleted: animalIds.length,
        milkRecordsDeleted: milkDeleted,
        healthRecordsDeleted: healthDeleted,
        breedingRecordsDeleted: breedingDeleted,
        financialRecordsDeleted: financeDeleted,
      };
    });

    res.json({ message: `${target.name} and all related farm data deleted.`, summary });
  } catch (err) {
    console.error('[Admin] User delete failed:', err);
    res.status(500).json({ message: 'Delete failed. The user may still have records that could not be removed automatically.' });
  }
});

adminRouter.get('/features', async (_req: Request, res: Response) => {
  const flags = await prisma.featureFlag.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
  res.json({ flags });
});

adminRouter.put('/features/:key', async (req: Request, res: Response): Promise<void> => {
  const { value } = req.body;
  const flag = await prisma.featureFlag.update({
    where: { flagKey: String(req.params.key) },
    data: { value: String(value), updatedBy: req.user!.id },
  });
  res.json({ flag });
});

adminRouter.get('/announcements', async (_req: Request, res: Response) => {
  const announcements = await prisma.systemAnnouncement.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdByUser: { select: { name: true } } },
  });
  res.json({ announcements });
});

// In-memory delivery report store, keyed by announcement id.
// Lets the admin panel poll for real send/fail status instead of trusting a fire-and-forget log line.
interface BroadcastReport {
  total: number;
  sent: number;
  failed: number;
  failures: { email: string; name: string; error: string }[];
  done: boolean;
}
const broadcastReports = new Map<number, BroadcastReport>();

adminRouter.post('/announcements', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({ title: z.string().min(1), body: z.string().min(1), type: z.enum(['info','success','warning','update']).optional().default('info') });
  const data = schema.parse(req.body);
  const announcement = await prisma.systemAnnouncement.create({
    data: { ...data, createdBy: req.user!.id },
  });

  const allUsers = await prisma.user.findMany({ where: { isActive: true }, select: { name: true, email: true } });
  const report: BroadcastReport = { total: allUsers.length, sent: 0, failed: 0, failures: [], done: false };
  broadcastReports.set(announcement.id, report);

  res.status(201).json({ announcement, emailsQueued: allUsers.length, reportId: announcement.id });

  setImmediate(async () => {
    for (const user of allUsers) {
      try {
        await mailAnnouncement(user.email, user.name, data.title, data.body, data.type);
        report.sent++;
        await new Promise(r => setTimeout(r, 150));
      } catch (e: unknown) {
        report.failed++;
        report.failures.push({ email: user.email, name: user.name, error: e instanceof Error ? e.message : String(e) });
      }
    }
    report.done = true;
    console.log(`[Broadcast] Announcement #${announcement.id}: ${report.sent} sent, ${report.failed} failed`);
  });
});

// Poll this to find out who was actually missed — fixes silent "trust me it sent" behavior
adminRouter.get('/announcements/:id/report', (req: Request, res: Response): void => {
  const report = broadcastReports.get(parseInt(String(req.params.id)));
  if (!report) { res.status(404).json({ message: 'No delivery report for this announcement (server may have restarted).' }); return; }
  res.json({ report });
});

// Retry only the addresses that failed, instead of re-blasting everyone
adminRouter.post('/announcements/:id/retry', async (req: Request, res: Response): Promise<void> => {
  const annId = parseInt(String(req.params.id));
  const report = broadcastReports.get(annId);
  if (!report || report.failures.length === 0) { res.status(404).json({ message: 'No failed deliveries to retry.' }); return; }

  const announcement = await prisma.systemAnnouncement.findUnique({ where: { id: annId } });
  if (!announcement) { res.status(404).json({ message: 'Announcement not found.' }); return; }

  const toRetry = [...report.failures];
  report.failures = [];
  report.done = false;
  res.json({ retrying: toRetry.length });

  setImmediate(async () => {
    for (const u of toRetry) {
      try {
        await mailAnnouncement(u.email, u.name, announcement.title, announcement.body, announcement.type);
        report.sent++;
        report.failed--;
        await new Promise(r => setTimeout(r, 150));
      } catch (e: unknown) {
        report.failures.push({ email: u.email, name: u.name, error: e instanceof Error ? e.message : String(e) });
      }
    }
    report.done = true;
    console.log(`[Broadcast] Retry for #${annId}: ${toRetry.length - report.failures.length} recovered, ${report.failures.length} still failing`);
  });
});

adminRouter.get('/issues', async (_req: Request, res: Response) => {
  const issues = await prisma.systemIssue.findMany({
    orderBy: { createdAt: 'desc' },
    include: { reporter: { select: { name: true, email: true } } },
  });
  res.json({ issues });
});

adminRouter.put('/issues/:id', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    status: z.enum(['open','in_review','resolved','closed']).optional(),
    adminNote: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const resolvedBy = ['resolved','closed'].includes(data.status || '') ? req.user!.id : undefined;
  const issueRecord = await prisma.systemIssue.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    include: { reporter: { select: { name: true, email: true } } },
  });

  const issue = await prisma.systemIssue.update({
    where: { id: parseInt(String(req.params.id)) },
    data: { ...data, ...(resolvedBy ? { resolvedBy } : {}) },
  });

  // Email user if status changed
  if (data.status && issueRecord?.reporter) {
    await mailIssueResolved(
      issueRecord.reporter.email,
      issueRecord.reporter.name,
      issueRecord.title,
      data.status,
      data.adminNote,
    );
  }

  res.json({ issue });
});
// ══════════════════════════════════════════════════════════════
// ADMIN MARKETPLACE
// ══════════════════════════════════════════════════════════════
adminRouter.get('/marketplace/stats', async (_req: Request, res: Response) => {
  const [totalListings, activeListings, soldListings, totalOffers, pendingReports] = await Promise.all([
    prisma.marketListing.count(),
    prisma.marketListing.count({ where: { status: 'active' } }),
    prisma.marketListing.count({ where: { status: 'sold' } }),
    prisma.marketOffer.count(),
    prisma.marketReport.count({ where: { status: 'pending' } }).catch(() => 0),
  ]);
  res.json({ stats: { totalListings, activeListings, soldListings, totalOffers, pendingReports } });
});

adminRouter.get('/marketplace/listings', async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;
  const listings = await prisma.marketListing.findMany({
    where: status ? { status: status as any } : {},
    include: {
      animal: { select: { name: true, breed: true } },
      seller: { select: { id: true, name: true, email: true } },
      _count: { select: { offers: true, favorites: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ listings });
});

adminRouter.put('/marketplace/listings/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  const listing = await prisma.marketListing.update({
    where: { id: parseInt(String(req.params.id)) },
    data: { status },
  });
  res.json({ listing });
});

// ══════════════════════════════════════════════════════════════
// REPORTS ROUTER
// ══════════════════════════════════════════════════════════════
export const reportsRouter = Router();
reportsRouter.use(requireAuth);

reportsRouter.get('/overview', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());

  const [animals, milk, health, breeding, finance] = await Promise.all([
    prisma.animal.groupBy({ by: ['status'], where: { farmId }, _count: { status: true } }),
    Promise.all([
      prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: today } }, _sum: { quantityLiters: true } }),
      prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: startOfWeek } }, _sum: { quantityLiters: true } }),
      prisma.milkProduction.aggregate({ where: { farmId, productionDate: { gte: startOfMonth } }, _sum: { quantityLiters: true } }),
      prisma.milkProduction.aggregate({ where: { farmId }, _sum: { quantityLiters: true } }),
    ]),
    Promise.all([
      prisma.healthRecord.count({ where: { farmId } }),
      prisma.healthRecord.count({ where: { farmId, recordDate: { gte: startOfMonth } } }),
      prisma.healthRecord.count({ where: { farmId, vaccination: { not: null } } }),
    ]),
    prisma.breeding.groupBy({ by: ['pregnancyStatus'], where: { farmId }, _count: { pregnancyStatus: true } }),
    Promise.all([
      prisma.financialTransaction.aggregate({ where: { farmId, type: 'income' }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { farmId, type: 'expense' }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { farmId, type: 'income', transactionDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { farmId, type: 'expense', transactionDate: { gte: startOfMonth } }, _sum: { amount: true } }),
    ]),
  ]);

  const animalMap = Object.fromEntries(animals.map(a => [a.status, a._count.status]));
  const breedMap = Object.fromEntries(breeding.map(b => [b.pregnancyStatus, b._count.pregnancyStatus]));
  const [finAll] = await Promise.all([Promise.all([
    prisma.financialTransaction.aggregate({ where: { farmId, type: 'income' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { farmId, type: 'expense' }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { farmId, type: 'income', transactionDate: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.financialTransaction.aggregate({ where: { farmId, type: 'expense', transactionDate: { gte: startOfMonth } }, _sum: { amount: true } }),
  ])]);

  res.json({
    animals: { active: animalMap['active'] || 0, sold: animalMap['sold'] || 0, deceased: animalMap['deceased'] || 0 },
    milk: {
      today: Number(milk[0]._sum.quantityLiters ?? 0),
      week: Number(milk[1]._sum.quantityLiters ?? 0),
      month: Number(milk[2]._sum.quantityLiters ?? 0),
      total: Number(milk[3]._sum.quantityLiters ?? 0),
    },
    health: { total: health[0], thisMonth: health[1], vaccinations: health[2], treatments: health[0] - health[2] },
    breeding: { pregnant: breedMap['pregnant'] || 0, pending: breedMap['pending'] || 0, gaveBirth: breedMap['gave_birth'] || 0, failed: breedMap['failed'] || 0 },
    finance: {
      totalIncome: Number(finAll[0]._sum.amount ?? 0),
      totalExpense: Number(finAll[1]._sum.amount ?? 0),
      monthIncome: Number(finAll[2]._sum.amount ?? 0),
      monthExpense: Number(finAll[3]._sum.amount ?? 0),
    },
  });
});

reportsRouter.get('/milk', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const sixMonthsAgo = new Date(today); sixMonthsAgo.setMonth(today.getMonth() - 6);

  const [topProducers, recent, trend] = await Promise.all([
    prisma.milkProduction.groupBy({
      by: ['animalId'],
      where: { farmId, productionDate: { gte: startOfMonth } },
      _sum: { quantityLiters: true }, _count: { id: true },
      orderBy: { _sum: { quantityLiters: 'desc' } }, take: 5,
    }).then(async rows => {
      const ids = rows.map(r => r.animalId);
      const animals = await prisma.animal.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, tagNumber: true } });
      return rows.map(r => ({ ...r, animal: animals.find(a => a.id === r.animalId) }));
    }),
    prisma.milkProduction.findMany({
      where: { farmId }, orderBy: { productionDate: 'desc' }, take: 20,
      include: { animal: { select: { name: true } }, recordedByUser: { select: { name: true } } },
    }),
    prisma.milkProduction.findMany({
      where: { farmId, productionDate: { gte: sixMonthsAgo } },
      select: { productionDate: true, quantityLiters: true },
    }).then(rows => {
      const byMonth: Record<string, number> = {};
      rows.forEach(r => {
        const key = r.productionDate.toISOString().slice(0, 7);
        byMonth[key] = (byMonth[key] || 0) + Number(r.quantityLiters);
      });
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total: +total.toFixed(1) }));
    }),
  ]);

  res.json({ topProducers, recent, trend });
});

reportsRouter.get('/health', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const [recent, commonConditions] = await Promise.all([
    prisma.healthRecord.findMany({
      where: { farmId }, orderBy: { recordDate: 'desc' }, take: 20,
      include: { animal: { select: { name: true, tagNumber: true } } },
    }),
    prisma.healthRecord.groupBy({
      by: ['condition'], where: { farmId },
      _count: { condition: true }, orderBy: { _count: { condition: 'desc' } }, take: 6,
    }),
  ]);
  res.json({ recent, commonConditions: commonConditions.map(c => ({ condition: c.condition, count: c._count.condition })) });
});

reportsRouter.get('/breeding', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const today = new Date();
  const [records, upcoming] = await Promise.all([
    prisma.breeding.findMany({
      where: { farmId }, orderBy: { serviceDate: 'desc' }, take: 20,
      include: { animal: { select: { name: true, tagNumber: true } } },
    }),
    prisma.breeding.findMany({
      where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { gte: today } },
      orderBy: { expectedBirthDate: 'asc' },
      include: { animal: { select: { name: true } } },
    }),
  ]);
  res.json({ records, upcoming });
});

reportsRouter.get('/financial', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [recent, byCategory, trend] = await Promise.all([
    prisma.financialTransaction.findMany({ where: { farmId }, orderBy: { transactionDate: 'desc' }, take: 20 }),
    prisma.financialTransaction.groupBy({
      by: ['type', 'category'], where: { farmId },
      _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.financialTransaction.findMany({
      where: { farmId, transactionDate: { gte: sixMonthsAgo } },
      select: { transactionDate: true, type: true, amount: true },
    }).then(rows => {
      const byMonth: Record<string, { income: number; expense: number }> = {};
      rows.forEach(r => {
        const key = r.transactionDate.toISOString().slice(0, 7);
        if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
        byMonth[key][r.type] += Number(r.amount);
      });
      return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, income: +v.income.toFixed(2), expense: +v.expense.toFixed(2) }));
    }),
  ]);

  res.json({ recent, byCategory: byCategory.map(r => ({ type: r.type, category: r.category, total: Number(r._sum.amount ?? 0) })), trend });
});

// CSV Export endpoints
reportsRouter.get('/export/:type', async (req: Request, res: Response): Promise<void> => {
  const farmId = getFarmId(req.user!);
  const type = String(req.params.type);
  const now = new Date().toISOString().slice(0, 10);

  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];
  let filename = '';

  if (type === 'animals') {
    headers = ['Tag Number', 'Name', 'Breed', 'Gender', 'Date of Birth', 'Color', 'Status', 'Notes', 'Created'];
    const data = await prisma.animal.findMany({ where: { farmId }, orderBy: { name: 'asc' } });
    rows = data.map(a => ({ 'Tag Number': a.tagNumber, Name: a.name, Breed: a.breed, Gender: a.gender, 'Date of Birth': a.dateOfBirth.toISOString().slice(0,10), Color: a.color||'', Status: a.status, Notes: a.notes||'', Created: a.createdAt.toISOString().slice(0,10) }));
    filename = `agripulse-animals-${now}.csv`;
  } else if (type === 'milk') {
    headers = ['Date', 'Animal', 'Tag', 'Liters', 'Notes', 'Recorded By'];
    const data = await prisma.milkProduction.findMany({ where: { farmId }, orderBy: { productionDate: 'desc' }, include: { animal: { select: { name: true, tagNumber: true } }, recordedByUser: { select: { name: true } } } });
    rows = data.map(r => ({ Date: r.productionDate.toISOString().slice(0,10), Animal: r.animal.name, Tag: r.animal.tagNumber, Liters: Number(r.quantityLiters), Notes: r.notes||'', 'Recorded By': r.recordedByUser?.name||'' }));
    filename = `agripulse-milk-${now}.csv`;
  } else if (type === 'health') {
    headers = ['Date', 'Animal', 'Tag', 'Condition', 'Treatment', 'Vaccination', 'Doctor', 'Notes'];
    const data = await prisma.healthRecord.findMany({ where: { farmId }, orderBy: { recordDate: 'desc' }, include: { animal: { select: { name: true, tagNumber: true } } } });
    rows = data.map(r => ({ Date: r.recordDate.toISOString().slice(0,10), Animal: r.animal.name, Tag: r.animal.tagNumber, Condition: r.condition, Treatment: r.treatment||'', Vaccination: r.vaccination||'', Doctor: r.doctorName||'', Notes: r.notes||'' }));
    filename = `agripulse-health-${now}.csv`;
  } else if (type === 'breeding') {
    headers = ['Service Date', 'Animal', 'Tag', 'Bull', 'Expected Birth', 'Actual Birth', 'Status', 'Notes'];
    const data = await prisma.breeding.findMany({ where: { farmId }, orderBy: { serviceDate: 'desc' }, include: { animal: { select: { name: true, tagNumber: true } } } });
    rows = data.map(r => ({ 'Service Date': r.serviceDate.toISOString().slice(0,10), Animal: r.animal.name, Tag: r.animal.tagNumber, Bull: r.bullName||'', 'Expected Birth': r.expectedBirthDate?.toISOString().slice(0,10)||'', 'Actual Birth': r.actualBirthDate?.toISOString().slice(0,10)||'', Status: r.pregnancyStatus, Notes: r.notes||'' }));
    filename = `agripulse-breeding-${now}.csv`;
  } else if (type === 'financial') {
    headers = ['Date', 'Type', 'Category', 'Amount (KSh)', 'Description'];
    const data = await prisma.financialTransaction.findMany({ where: { farmId }, orderBy: { transactionDate: 'desc' } });
    rows = data.map(r => ({ Date: r.transactionDate.toISOString().slice(0,10), Type: r.type, Category: r.category, 'Amount (KSh)': Number(r.amount), Description: r.description||'' }));
    filename = `agripulse-financial-${now}.csv`;
  } else {
    res.status(400).json({ error: 'Invalid export type' }); return;
  }

  const csvRows = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g, '""')}"`).join(','))];
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csvRows.join('\r\n'));
});

// ══════════════════════════════════════════════════════════════
// PROFILE ROUTER
// ══════════════════════════════════════════════════════════════
export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get('/', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, createdAt: true, lastLogin: true, isActive: true } });
  res.json({ user });
});

profileRouter.put('/', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({ name: z.string().min(2) });
  const { name } = schema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { name }, select: { id: true, name: true, email: true, role: true } });
  res.json({ user });
});

profileRouter.put('/password', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) });
  const { currentPassword, newPassword } = schema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const bcrypt = await import('bcryptjs');
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });
  res.json({ message: 'Password updated successfully' });
});

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS ROUTER
// ══════════════════════════════════════════════════════════════
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req: Request, res: Response) => {
  const farmId = getFarmId(req.user!);
  const today = new Date();
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);
  const sevenDaysAhead = new Date(today); sevenDaysAhead.setDate(today.getDate() + 7);

  const notifications: { id: string; type: string; title: string; message: string; createdAt: string }[] = [];

  const [overdueBirths, upcomingBirths, recentHealth, lowMilk] = await Promise.all([
    prisma.breeding.findMany({ where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { lt: today } }, include: { animal: { select: { name: true } } }, orderBy: { expectedBirthDate: 'asc' } }),
    prisma.breeding.findMany({ where: { farmId, pregnancyStatus: 'pregnant', expectedBirthDate: { gte: today, lte: sevenDaysAhead } }, include: { animal: { select: { name: true } } }, orderBy: { expectedBirthDate: 'asc' } }),
    prisma.healthRecord.findMany({ where: { farmId, recordDate: { gte: thirtyDaysAgo } }, orderBy: { recordDate: 'desc' }, take: 5, include: { animal: { select: { name: true } } } }),
    prisma.milkProduction.groupBy({ by: ['animalId'], where: { farmId, productionDate: { gte: thirtyDaysAgo } }, _avg: { quantityLiters: true }, having: { quantityLiters: { _avg: { lt: 5 } } }, orderBy: { _avg: { quantityLiters: "asc" } }, take: 3 }).then(async rows => {
      const ids = rows.map(r => r.animalId);
      return prisma.animal.findMany({ where: { id: { in: ids }, status: 'active' }, select: { name: true } });
    }),
  ]);

  overdueBirths.forEach(b => {
    const daysOverdue = Math.floor((today.getTime() - (b.expectedBirthDate?.getTime() ?? 0)) / 86400000);
    notifications.push({ id: `birth-overdue-${b.id}`, type: 'danger', title: 'Overdue birth', message: `${b.animal?.name} was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`, createdAt: b.expectedBirthDate?.toISOString() ?? today.toISOString() });
  });
  upcomingBirths.forEach(b => {
    const daysLeft = Math.floor(((b.expectedBirthDate?.getTime() ?? 0) - today.getTime()) / 86400000);
    notifications.push({ id: `birth-upcoming-${b.id}`, type: 'info', title: 'Birth expected soon', message: `${b.animal?.name} is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, createdAt: today.toISOString() });
  });
  recentHealth.forEach(h => {
    notifications.push({ id: `health-${h.id}`, type: 'warning', title: 'Health record', message: `${h.animal?.name}: ${h.condition}`, createdAt: h.recordDate.toISOString() });
  });
  lowMilk.forEach(a => {
    notifications.push({ id: `milk-low-${a.name}`, type: 'warning', title: 'Low milk production', message: `${a.name} averaging under 5L/day this month`, createdAt: today.toISOString() });
  });

  const announcements = await prisma.systemAnnouncement.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 3 });
  announcements.forEach(a => {
    notifications.push({ id: `ann-${a.id}`, type: a.type, title: a.title, message: a.body, createdAt: a.createdAt.toISOString() });
  });

  res.json({ notifications, unread: notifications.length });
});

// ══════════════════════════════════════════════════════════════
// ISSUES ROUTER (user-facing)
// ══════════════════════════════════════════════════════════════
export const issuesRouter = Router();
issuesRouter.use(requireAuth);

issuesRouter.get('/', async (req: Request, res: Response) => {
  const issues = await prisma.systemIssue.findMany({ where: { reportedBy: req.user!.id }, orderBy: { createdAt: 'desc' }, include: { resolver: { select: { name: true } } } });
  res.json({ issues });
});

issuesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({ title: z.string().min(3), description: z.string().min(10), category: z.enum(['bug', 'feature_request', 'performance', 'other']), priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium') });
  const data = schema.parse(req.body);
  const issue = await prisma.systemIssue.create({ data: { ...data, reportedBy: req.user!.id } });

  // Email notifications
  const reporter = req.user!;
  await mailIssueSubmitted(reporter.email, reporter.name, data.title, data.priority);
  await mailAdminIssueSubmitted(reporter.name, reporter.email, data.title, data.description, data.category, data.priority);

  res.status(201).json({ issue });
});

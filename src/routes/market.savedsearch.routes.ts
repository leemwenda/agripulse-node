import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const searches = await prisma.marketSavedSearch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json({ searches });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, filters } = req.body;
    const search = await prisma.marketSavedSearch.create({ data: { userId, name, filters } });
    res.status(201).json({ search });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.marketSavedSearch.deleteMany({ where: { id: parseInt(req.params.id as string), userId } });
    res.json({ success: true });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
